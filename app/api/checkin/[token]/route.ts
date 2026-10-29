import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { completeCheckin, logEvent } from "@/lib/lifecycle";
import { preauthorize } from "@/lib/tools/payments";

export const dynamic = "force-dynamic";

/** body: { action: "consent" | "verify" | "sign" | "guarantee" | "complete" } */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await db.reservation.findUnique({ where: { checkinToken: token }, include: { guest: true, payments: true } });
  if (!res) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  const { action } = await req.json();
  const lang = res.guest.language === "en" ? "en" : "es";
  const ctx = { channel: "whatsapp" as const, channelUserId: res.guest.phone ?? "web", lang: lang as "es" | "en" };

  switch (action) {
    case "consent":
      await logEvent(res.id, "checkin_consent", "Consentimiento para verificación biométrica (web)");
      break;
    case "verify":
      // La imagen nunca llega al servidor: solo registramos el resultado simulado.
      await new Promise((r) => setTimeout(r, 2000));
      await logEvent(res.id, "identity_verified", "Jumio (simulado): documento y prueba de vida aprobados. Imagen descartada.");
      break;
    case "sign":
      await logEvent(res.id, "terms_signed", "Condiciones firmadas (web)");
      break;
    case "guarantee": {
      const r = await preauthorize({ reservationCode: res.code }, ctx);
      return NextResponse.json({ ok: r.ok, url: r.data?.url ?? null, status: r.data?.status ?? null, error: r.error });
    }
    case "complete": {
      const needsGuarantee = res.paymentMode === "pay_at_hotel" && !res.payments.some((p) => p.kind === "preauth" && p.status === "authorized");
      if (needsGuarantee) return NextResponse.json({ ok: false, error: lang === "en" ? "Authorize the guarantee first." : "Primero autoriza la garantía." }, { status: 409 });
      const done = await completeCheckin(res.id);
      return NextResponse.json({ ok: true, roomNumber: done.roomNumber });
    }
  }
  const fresh = await db.reservation.findUnique({ where: { id: res.id }, include: { payments: true } });
  return NextResponse.json({ ok: true, status: fresh?.status, guaranteeAuthorized: fresh?.payments.some((p) => p.kind === "preauth" && p.status === "authorized") });
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await db.reservation.findUnique({ where: { checkinToken: token }, include: { payments: true } });
  if (!res) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 });
  return NextResponse.json({
    status: res.status,
    roomNumber: res.roomNumber,
    guaranteeAuthorized: res.payments.some((p) => p.kind === "preauth" && p.status === "authorized"),
  });
}
