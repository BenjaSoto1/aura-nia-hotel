import { NextResponse } from "next/server";
import { runTool } from "@/lib/tools";
import { getOrCreateConversation, saveMessage } from "@/lib/conversations";
import { CHANNELS, type Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ejecuta una herramienta del core. Lo usan las client tools del agente de voz de ElevenLabs
 * (desde el navegador). Las partes visuales se publican en la conversación para que la web las pinte.
 */
export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = await req.json();
  const channel = (CHANNELS.includes(body.channel) ? body.channel : "web") as Channel;
  const channelUserId = String(body.channelUserId || "anon");
  const conv = await getOrCreateConversation(channel, channelUserId);
  const lang = conv.language === "en" ? "en" : "es";
  const input = normalizeVoiceInput(body.input ?? {});
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
