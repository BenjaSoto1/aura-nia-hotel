import { NextResponse } from "next/server";
import { handleTurn } from "@/lib/agent/core";
import { CHANNELS, type Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  if (!CHANNELS.includes(channel as Channel)) return NextResponse.json({ error: "Canal desconocido" }, { status: 404 });
  const body = await req.json();
  if (!body.channelUserId) return NextResponse.json({ error: "Falta channelUserId" }, { status: 400 });
  const result = await handleTurn({
    channel: channel as Channel,
    channelUserId: String(body.channelUserId),
    text: body.text ? String(body.text).slice(0, 2000) : undefined,
    buttonId: body.buttonId,
    buttonTitle: body.buttonTitle,
    attachment: body.attachment?.kind === "image" ? { kind: "image", dataUrl: "" } : undefined, // la imagen no se conserva
    displayName: body.displayName,
  });
  return NextResponse.json(result);
}
