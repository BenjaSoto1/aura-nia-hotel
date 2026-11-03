import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelReservation } from "@/lib/tools/reservations";
import { modifyReservation } from "@/lib/tools/manage";
import { sendReservationEmail } from "@/lib/tools/email";
import { bookService } from "@/lib/tools/services";
import { createPaymentLink } from "@/lib/tools/payments";
import { completeCheckin, finalizeCheckout, folioSummary, logEvent } from "@/lib/lifecycle";
import { postToChannel } from "@/lib/conversations";
import type { ToolContext } from "@/lib/tools/context";

export const dynamic = "force-dynamic";

/**
 * Acciones de recepción sobre una reserva:
 * cancel · resend · modify {checkIn, checkOut, roomTypeCode, guests} · checkin · checkout {collect}
 * · service {serviceCode, datetime} · paylink
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const res = await db.reservation.findUnique({ where: { id }, include: { guest: true } });
  if (!res) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const lang = res.guest.language === "en" ? "en" : "es";
  // Recepción actúa con el correo del huésped (dueño verificado) en nombre del hotel.
  const ctx: ToolContext = { channel: "web", channelUserId: "panel", lang };
  const email = res.guest.email ?? "";

  switch (body.action) {
    case "cancel":
      return NextResponse.json(await cancelReservation({ reservationCode: res.code, email }, ctx));

    case "resend":
      return NextResponse.json({ ok: true, ...(await sendReservationEmail(res.id, "confirmation")) });

    case "modify": {
      const r = await modifyReservation(
        {
          reservationCode: res.code,
          email,
          checkIn: body.checkIn || undefined,
          checkOut: body.checkOut || undefined,
          roomTypeCode: body.roomTypeCode || undefined,
          guests: body.guests ? Number(body.guests) : undefined,
        },
        ctx,
        { staff: true },
      );
      return NextResponse.json(r.ok ? { ok: true, message: (r.data!.changes as string[]).join(" · ") } : { ok: false, error: r.error });
    }

    case "checkin": {
      if (!["confirmed", "precheckin_done"].includes(res.status)) return NextResponse.json({ ok: false, error: "Solo reservas confirmadas o con pre-check-in pueden ingresar." });
      if (res.status === "confirmed") await completeCheckin(res.id);
      await db.reservation.update({ where: { id: res.id }, data: { status: "in_house" } });
      await logEvent(res.id, "checkin_desk", "Check-in registrado por recepción");
      const fresh = await db.reservation.findUniqueOrThrow({ where: { id: res.id } });
      return NextResponse.json({ ok: true, message: `Huésped en casa · habitación ${fresh.roomNumber ?? "—"}` });
    }

    case "checkout": {
      if (!["confirmed", "precheckin_done", "in_house"].includes(res.status)) return NextResponse.json({ ok: false, error: "Esa reserva no puede hacer checkout." });
      const f = await folioSummary(res.id);
      if (f.balanceCents > 0) {
        if (!body.collect) return NextResponse.json({ ok: false, error: `Hay un saldo de $${(f.balanceCents / 100).toFixed(2)}. Cóbralo en recepción o envía el enlace de pago.` });
        // Cobro en el mostrador (efectivo o terminal): se registra como pago y se cierra la estadía.
        await db.payment.create({ data: { reservationId: res.id, kind: "balance", provider: "recepcion", amountCents: f.balanceCents, status: "paid", externalId: "mostrador" } });
        await logEvent(res.id, "paid", `Saldo $${(f.balanceCents / 100).toFixed(2)} cobrado en recepción`);
      }
      await finalizeCheckout(res.id);
      return NextResponse.json({ ok: true, message: "Checkout listo · comprobante enviado" });
    }

    case "service": {
      const r = await bookService({ reservationCode: res.code, serviceCode: String(body.serviceCode), datetime: String(body.datetime ?? "") }, ctx);
      return NextResponse.json(r.ok ? { ok: true, message: `${r.data!.service} · ${r.data!.datetime} · ${r.data!.charged}` } : { ok: false, error: r.error });
    }

    case "paylink": {
      const r = await createPaymentLink({ reservationCode: res.code }, ctx);
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error });
      const link = r.parts?.find((p) => p.type === "payment_link");
      if (res.guest.phone && link) {
        await postToChannel("whatsapp", res.guest.phone, [
          { type: "text", text: lang === "en" ? `Here is your secure payment link for ${res.code}:` : `Aquí tienes tu enlace de pago seguro de ${res.code}:` },
          link,
        ]);
      }
      return NextResponse.json({ ok: true, message: `Enlace por ${r.data!.amount} enviado al WhatsApp del huésped`, url: link && link.type === "payment_link" ? link.url : null });
    }
  }
  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
