import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Polling de la conversación (entrantes y salientes) de un usuario en un canal. */
export async function GET(req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const url = new URL(req.url);
  const u = url.searchParams.get("u");
  const after = url.searchParams.get("after");
  if (!u) return NextResponse.json({ messages: [] });
  const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: channel as Channel, channelUserId: u } } });
  if (!conv) return NextResponse.json({ messages: [], mode: "agent" });
  const messages = await db.message.findMany({
    where: { conversationId: conv.id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({
    mode: conv.mode,
    language: conv.language,
    messages: messages.map((m) => ({ id: m.id, direction: m.direction, author: m.author, template: m.template, createdAt: m.createdAt, parts: JSON.parse(m.partsJson) })),
  });
}
