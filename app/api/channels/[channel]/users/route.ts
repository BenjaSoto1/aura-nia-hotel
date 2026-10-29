import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Usuarios con conversación en un canal (selector "Hablas como" del simulador). */
export async function GET(_req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const convs = await db.conversation.findMany({ where: { channel: channel as Channel }, orderBy: { updatedAt: "desc" }, take: 20 });
  return NextResponse.json({ users: convs.map((c) => ({ id: c.channelUserId, updatedAt: c.updatedAt })) });
}
