import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateConversation, linkIdentity } from "@/lib/conversations";
import { verifyManageLink } from "@/lib/manage-link";

export const dynamic = "force-dynamic";

/**
 * El huésped abrió "Modificar o cancelar mi reserva" desde el correo: si la firma es válida, esta sesión del
 * sitio queda vinculada al huésped (así Nía puede gestionar la reserva sin volver a pedir el correo).
 */
const Body = z.object({ sessionId: z.string().min(3).max(80), code: z.string().min(3).max(20), k: z.string().min(8).max(64) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { sessionId, k } = parsed.data;
  const code = parsed.data.code.trim().toUpperCase();
  if (!verifyManageLink(code, k)) return NextResponse.json({ ok: false, error: "Enlace inválido" }, { status: 403 });
  const res = await db.reservation.findUnique({ where: { code }, include: { guest: true } });
  if (!res) return NextResponse.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });
  await getOrCreateConversation("web", sessionId, res.guest.fullName ?? undefined);
  await linkIdentity(res.guestId, "web", sessionId);
  if (res.guest.language === "en") await db.conversation.updateMany({ where: { channel: "web", channelUserId: sessionId }, data: { language: "en" } });
  return NextResponse.json({ ok: true, code, name: (res.guest.fullName ?? "").split(" ")[0], lang: res.guest.language === "en" ? "en" : "es" });
}
