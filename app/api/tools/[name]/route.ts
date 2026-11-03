import { NextResponse } from "next/server";
import { runTool } from "@/lib/tools";
import { getOrCreateConversation, saveMessage } from "@/lib/conversations";
import { CHANNELS, type Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ejecuta una herramienta del core.
 *  - Web: client tools del agente de voz de ElevenLabs (desde el navegador): { channel, channelUserId, input }.
 *  - Teléfono: server tools ("webhook") del agente telefónico (scripts/elevenlabs-agent.ts --phone), que llaman
 *    directo a ?channel=phone con los parámetros planos y el número de quien llama en channelUserId.
 *    Van firmadas con la cabecera x-aura-tool-secret (ELEVENLABS_TOOL_SECRET) para que nadie suplante a un huésped.
 * Las partes visuales se publican en la conversación para que la web o WhatsApp las pinten.
 */
export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const phone = url.searchParams.get("channel") === "phone";
  if (phone) {
    const secret = process.env.ELEVENLABS_TOOL_SECRET;
    if (!secret || req.headers.get("x-aura-tool-secret") !== secret) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const channel = (phone ? "phone" : CHANNELS.includes(body.channel) ? body.channel : "web") as Channel;
  // En llamadas el usuario es el número de quien llama (mismo formato que WhatsApp: +569…).
  const channelUserId = phone ? String(body.channelUserId || "").replace(/[^\d+]/g, "") || "anon" : String(body.channelUserId || "anon");
  const conv = await getOrCreateConversation(channel, channelUserId);
  const lang = conv.language === "en" ? "en" : "es";
  // Teléfono: los parámetros llegan planos (todo menos channelUserId es el input de la herramienta).
  const { channelUserId: _cu, channel: _ch, input: nested, ...flat } = body as Record<string, unknown>;
  const input = normalizeVoiceInput((phone ? flat : nested ?? {}) as Record<string, unknown>);
  const r = await runTool(name, input, { channel, channelUserId, conversationId: conv.id, lang });
  if (r.parts?.length) {
    await saveMessage({ conversationId: conv.id, direction: "out", author: "agent", parts: r.parts, toolCalls: [{ name, input, result: r }] });
  }
  const result = r.ok ? { ok: true, ...r.data } : { ok: false, error: r.error };
  return NextResponse.json({ result: JSON.stringify(result), parts: r.parts ?? [] });
}

/** ElevenLabs puede mandar números como texto: normalizamos los campos conocidos. */
function normalizeVoiceInput(input: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...input };
  for (const k of ["guests", "pets"]) if (typeof out[k] === "string") out[k] = Number(out[k]) || 0;
  for (const k of ["roomTypeCode", "ratePlanCode", "serviceCode", "reservationCode"]) if (typeof out[k] === "string") out[k] = (out[k] as string).trim().toUpperCase();
  for (const k of ["roomTypeCode", "ratePlanCode"]) if (out[k] === "") delete out[k];
  return out;
}
