import { NextResponse } from "next/server";
import { instagramProvider, verifyInstagramSignature } from "@/lib/integrations/instagram";
import { processInstagramWebhook, type InstagramWebhook } from "@/lib/integrations/instagram-webhook";
import { logInstagramWebhook } from "@/lib/integrations/instagram-log";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/**
 * Webhook de Instagram (Meta). Configúralo en developers.facebook.com → tu app → Instagram → Webhooks:
 *   URL de devolución:  https://<tu-dominio>/api/webhooks/instagram
 *   Token de verificación: el valor de INSTAGRAM_VERIFY_TOKEN
 *   Campos: messages, messaging_postbacks, comments
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const expected = process.env.INSTAGRAM_VERIFY_TOKEN;
  if (u.searchParams.get("hub.mode") === "subscribe" && expected && u.searchParams.get("hub.verify_token") === expected) {
    await logInstagramWebhook({ kind: "verificación", ok: true, detail: "Meta verificó el webhook" });
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  if (u.searchParams.get("hub.mode")) await logInstagramWebhook({ kind: "verificación", ok: false, detail: "Token de verificación incorrecto" });
  return new Response("Token de verificación inválido", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyInstagramSignature(raw, req.headers.get("x-hub-signature-256"))) {
    await logInstagramWebhook({ kind: "evento", ok: false, detail: `Firma inválida (revisa INSTAGRAM_APP_SECRET): ${raw.slice(0, 160)}` });
    return new Response("Firma inválida", { status: 401 });
  }
  if (instagramProvider() !== "meta") return NextResponse.json({ ok: true, ignored: "Instagram en modo simulado" });
  let body: InstagramWebhook;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }
  try {
    const results = await processInstagramWebhook(body);
    const fields = (body.entry ?? []).flatMap((e) => [...(e.messaging ?? []).map(() => "mensaje"), ...(e.changes ?? []).map((c) => c.field)]);
    const skipped = results.some((r) => r.startsWith("ignorado")) || !results.length;
    await logInstagramWebhook({ kind: "evento", ok: !skipped, detail: `${fields.join(", ") || "sin eventos"} → ${results.join(", ") || "—"}${skipped ? ` · ${raw.slice(0, 600)}` : ""}` });
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    // 200 igual: si devolvemos error, Meta reintenta y podría duplicar respuestas ya enviadas.
    console.error("[instagram] error procesando webhook", e);
    await logInstagramWebhook({ kind: "evento", ok: false, detail: `Error: ${(e as Error).message}` });
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
