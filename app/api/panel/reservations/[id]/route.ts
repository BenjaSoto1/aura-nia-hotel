import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelReservation } from "@/lib/tools/reservations";
import { sendReservationEmail } from "@/lib/tools/email";

export const dynamic = "force-dynamic";

/** body: { action: "cancel" | "resend" } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  const res = await db.reservation.findUnique({ where: { id }, include: { guest: true } });
  if (!res) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (action === "cancel") {
    const r = await cancelReservation({ reservationCode: res.code, email: res.guest.email ?? "" }, { channel: "web", channelUserId: "panel", lang: "es" });
    return NextResponse.json(r);
  }
  if (action === "resend") {
    const r = await sendReservationEmail(res.id, "confirmation");
    return NextResponse.json({ ok: true, ...r });
  }
  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
