import { NextResponse } from "next/server";
import { getOrCreateConversation, saveMessage } from "@/lib/conversations";
import { maskCards } from "@/lib/agent/masking";
import { detectLanguage } from "@/lib/agent/core";
import { db } from "@/lib/db";
import { CHANNELS, type Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Guarda la transcripción de la voz de ElevenLabs en la conversación (para el panel y el historial). */
export async function POST(req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  if (!CHANNELS.includes(channel as Channel)) return NextResponse.json({ error: "Canal desconocido" }, { status: 404 });
  const body = await req.json();
  const text = maskCards(String(body.text ?? "")).text.trim();
  if (!body.channelUserId || !text) return NextResponse.json({ ok: false });
  const conv = await getOrCreateConversation(channel as Channel, String(body.channelUserId));
  if (body.role === "user") {
    const lang = detectLanguage(text, conv.language);
    if (lang !== conv.language) {
      await db.conversation.update({ where: { id: conv.id }, data: { language: lang } });
      if (conv.guestId) await db.guest.update({ where: { id: conv.guestId }, data: { language: lang } });
    }
  }
  await saveMessage({
    conversationId: conv.id,
    direction: body.role === "user" ? "in" : "out",
    author: body.role === "user" ? "guest" : "agent",
    parts: [{ type: "text", text }],
  });
  return NextResponse.json({ ok: true });
}
