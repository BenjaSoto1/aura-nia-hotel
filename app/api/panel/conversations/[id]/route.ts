import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveMessage } from "@/lib/conversations";

export const dynamic = "force-dynamic";

/** body: { action: "take" | "return" | "send", text? } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, text } = await req.json();
  const conv = await db.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (action === "take") {
    await db.conversation.update({ where: { id }, data: { mode: "staff", needsHuman: false } });
    await saveMessage({ conversationId: id, direction: "out", author: "system", parts: [{ type: "text", text: conv.language === "en" ? "A team member joined the chat." : "Una persona del equipo se unió a la conversación." }] });
  } else if (action === "return") {
    await db.conversation.update({ where: { id }, data: { mode: "agent", needsHuman: false } });
  } else if (action === "send" && text?.trim()) {
    if (conv.mode !== "staff") await db.conversation.update({ where: { id }, data: { mode: "staff" } });
    await saveMessage({ conversationId: id, direction: "out", author: "staff", parts: [{ type: "text", text: String(text).trim() }] });
  }
  return NextResponse.json({ ok: true });
}
