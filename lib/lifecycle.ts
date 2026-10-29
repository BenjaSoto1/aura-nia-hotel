// Efectos de negocio que comparten herramientas, webhooks, pago simulado y recordatorios.
import { db } from "./db";
import { now } from "./clock";
import { addDays, formatRange, hotelLocalToUtc, toISODate } from "./dates";
import { loadHotelPack, rateName, roomName } from "./hotel-pack";
import { usd } from "./money";
import { postToChannel } from "./conversations";
import { stripeEnabled, appUrl } from "./config";
import type { Channel, Part } from "./types";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "./tools/calendar";
import { sendReservationEmail } from "./tools/email";

export async function logEvent(reservationId: string, type: string, detail?: string) {
  await db.reservationEvent.create({ data: { reservationId, type, detail } });
}

async function hasEvent(reservationId: string, type: string) {
  return Boolean(await db.reservationEvent.findFirst({ where: { reservationId, type } }));
}

/**
 * Envía partes al huésped. Destinos: canal de origen (salvo teléfono, que ya colgó) y
 * WhatsApp del huésped si tiene teléfono. `whatsappOnly` para recordatorios proactivos.
 */
export async function notifyGuest(
  reservationId: string,
  parts: Part[],
  opts: { template?: boolean; whatsappOnly?: boolean; author?: "agent" | "system" } = {},
) {
  const res = await db.reservation.findUnique({ where: { id: reservationId }, include: { guest: true } });
  if (!res) return;
  const targets = new Map<string, { channel: Channel; user: string }>();
  const phone = res.guest.phone;
  if (!opts.whatsappOnly && res.createdViaUser && res.createdVia !== "phone") {
    targets.set(`${res.createdVia}:${res.createdViaUser}`, { channel: res.createdVia as Channel, user: res.createdViaUser });
  }
  if (phone) targets.set(`whatsapp:${phone}`, { channel: "whatsapp", user: phone });
  if (!targets.size && res.createdViaUser) targets.set("origin", { channel: res.createdVia as Channel, user: res.createdViaUser });
  for (const t of targets.values()) {
    await postToChannel(t.channel, t.user, parts, { template: opts.template && t.channel === "whatsapp", author: opts.author ?? "agent" });
  }
}

export async function folioSummary(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { folioLines: { orderBy: { createdAt: "asc" } }, payments: true } });
  const chargesCents = res.folioLines.reduce((s, l) => s + l.amountCents, 0);
  const paidCents = res.payments.filter((p) => p.status === "paid" && p.kind !== "preauth").reduce((s, p) => s + p.amountCents, 0);
  return {
    lines: res.folioLines,
    payments: res.payments,
    chargesCents,
    paidCents,
    balanceCents: chargesCents - paidCents,
    preauth: res.payments.find((p) => p.kind === "preauth" && ["authorized", "link_sent"].includes(p.status)) ?? null,
  };
}

export async function scheduleReminders(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  const pack = loadHotelPack();
  const tz = pack.hotel.zona_horaria;
  const arrival = hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, tz);
  const precheckinAt = new Date(arrival.getTime() - pack.recordatorios.precheckin_horas_antes * 3_600_000);
  const checkoutNotice = hotelLocalToUtc(toISODate(res.checkOut), pack.recordatorios.aviso_checkout_hora, tz);
  const departure = hotelLocalToUtc(toISODate(res.checkOut), pack.politicas.check_out, tz);
  const review = new Date(departure.getTime() + 24 * 3_600_000);
  for (const [kind, runAt] of [
    ["precheckin", precheckinAt],
    ["checkout_notice", checkoutNotice],
    ["review", review],
  ] as const) {
    await db.scheduledReminder.upsert({
      where: { reservationId_kind: { reservationId, kind } },
      create: { reservationId, kind, runAt },
      update: { runAt, sentAt: null },
    });
  }
  await logEvent(reservationId, "reminders_scheduled", `Pre-check-in ${precheckinAt.toISOString()} · aviso de salida ${checkoutNotice.toISOString()}`);
}

/** Confirmación: correo + calendario + recordatorios + aviso en el canal. Idempotente. */
export async function onReservationConfirmed(reservationId: string) {
  if (await hasEvent(reservationId, "confirmed")) return;
  await logEvent(reservationId, "confirmed");
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true } });
  const lang = res.guest.language;

  let emailStatus = "failed";
  try {
    emailStatus = (await sendReservationEmail(reservationId, "confirmation")).status;
  } catch (e) {
    await logEvent(reservationId, "email_failed", String(e));
  }
  try {
    await createCalendarEvent(reservationId);
  } catch (e) {
    await logEvent(reservationId, "calendar_failed", String(e));
  }
  await scheduleReminders(reservationId);

  const en = lang === "en";
  const paid = res.paymentMode === "prepaid";
  const head = paid
    ? en
      ? `Payment received! Your reservation ${res.code} is confirmed. I sent the confirmation to ${res.guest.email}.`
      : `¡Pago recibido! Tu reserva ${res.code} está confirmada. Te envié la confirmación a ${res.guest.email}.`
    : en
      ? `Your reservation ${res.code} is confirmed — you'll pay at the hotel. I sent the confirmation to ${res.guest.email}.`
      : `Tu reserva ${res.code} está confirmada; pagas en el hotel. Te envié la confirmación a ${res.guest.email}.`;
  // Nunca afirmar que el correo salió si falló: el huésped puede corregir la dirección.
  const mailNote =
    emailStatus === "sent"
      ? en
        ? " It includes a calendar invitation: accept it to add the stay to your Google Calendar."
        : " Incluye una invitación de calendario: acéptala y la estadía queda en tu Google Calendar."
      : emailStatus === "failed"
        ? en
          ? ` (I couldn't deliver the email to ${res.guest.email}. If the address is wrong, send me the right one.)`
          : ` (No pude entregar el correo a ${res.guest.email}. Si la dirección está mal, escríbeme la correcta.)`
        : "";
  await notifyGuest(reservationId, [
    { type: "text", text: head + mailNote },
    {
      type: "reservation_summary",
      reservationCode: res.code,
      lines: [
        roomName(res.roomTypeCode, lang),
        formatRange(res.checkIn, res.checkOut, lang),
        rateName(res.ratePlanCode, lang),
        `${en ? "Total" : "Total"}: ${usd(res.totalCents, lang)}`,
      ],
    },
    {
      type: "text",
      text: en
        ? "24 h before arrival I'll message you on WhatsApp for your digital check-in."
        : "24 h antes de tu llegada te escribiré por WhatsApp para tu check-in digital.",
    },
  ]);
}

export async function cancelSideEffects(reservationId: string) {
  await db.scheduledReminder.deleteMany({ where: { reservationId, sentAt: null } });
  try {
    await deleteCalendarEvent(reservationId);
  } catch (e) {
    await logEvent(reservationId, "calendar_failed", String(e));
  }
  await db.payment.updateMany({ where: { reservationId, status: "link_sent" }, data: { status: "expired" } });
}

export async function expireHold(reservationId: string) {
  const res = await db.reservation.findUnique({ where: { id: reservationId } });
  if (!res || res.status !== "pending_payment") return;
  await db.reservation.update({ where: { id: reservationId }, data: { status: "expired" } });
  await db.payment.updateMany({ where: { reservationId, status: "link_sent" }, data: { status: "expired" } });
  await logEvent(reservationId, "expired", "El hold de 30 minutos venció sin pago");
  const g = await db.guest.findUnique({ where: { id: res.guestId } });
  const en = g?.language === "en";
  await notifyGuest(reservationId, [
    { type: "text", text: en ? `Your hold for ${res.code} expired without payment. Want me to quote again?` : `El bloqueo de tu reserva ${res.code} venció sin pago. ¿Quieres que vuelva a cotizar?` },
  ]);
}

/** Lógica común del webhook de Stripe y del botón de pago simulado. */
export async function markPaymentPaid(paymentId: string, ext: { externalId?: string; paymentIntent?: string } = {}) {
  const pay = await db.payment.findUnique({ where: { id: paymentId } });
  if (!pay) throw new Error("Pago no encontrado");
  if (["paid", "authorized", "captured", "released"].includes(pay.status)) return pay; // idempotente
  const res = await db.reservation.findUniqueOrThrow({ where: { id: pay.reservationId }, include: { guest: true } });
  const en = res.guest.language === "en";

  if (pay.kind === "preauth") {
    const updated = await db.payment.update({ where: { id: pay.id }, data: { status: "authorized", paymentIntent: ext.paymentIntent ?? pay.paymentIntent, externalId: ext.externalId ?? pay.externalId } });
    await logEvent(res.id, "guarantee_authorized", `Garantía ${usd(pay.amountCents)} autorizada (sin cobrar)`);
    await notifyGuest(res.id, [{ type: "text", text: en ? `Guarantee of ${usd(pay.amountCents, "en")} authorized (not charged).` : `Garantía de ${usd(pay.amountCents)} autorizada (no se cobra).` }]);
    // Si el huésped ya firmó (check-in en chat o en la página), el check-in se completa ahora
    if (res.status === "confirmed" && (await hasEvent(res.id, "terms_signed"))) await completeCheckin(res.id);
    return updated;
  }

  const updated = await db.payment.update({ where: { id: pay.id }, data: { status: "paid", paymentIntent: ext.paymentIntent ?? pay.paymentIntent, externalId: ext.externalId ?? pay.externalId } });
  await logEvent(res.id, "paid", `${pay.kind === "balance" ? "Saldo" : "Prepago"} ${usd(pay.amountCents)} vía ${pay.provider}`);

  if (pay.kind === "prepayment") {
    if (["pending_payment", "expired"].includes(res.status)) {
      await db.reservation.update({ where: { id: res.id }, data: { status: "confirmed", holdExpiresAt: null } });
      await db.scheduledReminder.deleteMany({ where: { reservationId: res.id, kind: "hold_expiry" } });
    }
    await onReservationConfirmed(res.id);
    try {
      await updateCalendarEvent(res.id);
    } catch {
      /* el evento puede no existir aún en modo real */
    }
  } else if (pay.kind === "balance") {
    await finalizeCheckout(res.id);
  }
  return updated;
}

export async function releaseGuarantee(reservationId: string) {
  const pre = await db.payment.findFirst({ where: { reservationId, kind: "preauth", status: "authorized" } });
  if (!pre) return;
  if (pre.provider === "stripe" && pre.paymentIntent && stripeEnabled()) {
    const { stripe } = await import("./integrations/stripe");
    try {
      await stripe().paymentIntents.cancel(pre.paymentIntent);
    } catch (e) {
      await logEvent(reservationId, "guarantee_release_failed", String(e));
    }
  }
  await db.payment.update({ where: { id: pre.id }, data: { status: "released" } });
  await logEvent(reservationId, "guarantee_released", `Garantía ${usd(pre.amountCents)} liberada`);
}

export async function finalizeCheckout(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true } });
  if (res.status === "checked_out") return;
  await db.reservation.update({ where: { id: reservationId }, data: { status: "checked_out" } });
  await logEvent(reservationId, "checked_out");
  await releaseGuarantee(reservationId);
  try {
    await sendReservationEmail(reservationId, "receipt");
  } catch (e) {
    await logEvent(reservationId, "email_failed", String(e));
  }
  await db.scheduledReminder.deleteMany({ where: { reservationId, kind: "checkout_notice", sentAt: null } });
  const en = res.guest.language === "en";
  await notifyGuest(reservationId, [
    {
      type: "text",
      text: en
        ? `Check-out complete. Your receipt is on its way to ${res.guest.email}. Thank you for staying at ${loadHotelPack().hotel.nombre}!`
        : `Checkout listo. Tu comprobante va camino a ${res.guest.email}. ¡Gracias por quedarte en ${loadHotelPack().hotel.nombre}!`,
    },
  ]);
}

const ROOM_NUMBERS: Record<string, string[]> = {
  DLX_SEA: ["412", "414", "416", "418", "420", "422", "424", "426"],
  STD_CITY: ["205", "207", "209", "211", "213", "215", "217", "219", "221", "223"],
  STE_TER: ["PH1", "PH2"],
};

export async function completeCheckin(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true } });
  if (res.status === "precheckin_done" && res.roomNumber) return res;
  const taken = new Set(
    (await db.reservation.findMany({ where: { roomTypeCode: res.roomTypeCode, roomNumber: { not: null }, status: { in: ["precheckin_done", "in_house"] }, checkIn: { lt: res.checkOut }, checkOut: { gt: res.checkIn } } })).map((r) => r.roomNumber),
  );
  const roomNumber = (ROOM_NUMBERS[res.roomTypeCode] ?? ["101"]).find((n) => !taken.has(n)) ?? "101";
  const updated = await db.reservation.update({ where: { id: reservationId }, data: { status: "precheckin_done", roomNumber } });
  await logEvent(reservationId, "checkin_done", `Pre-check-in completo · habitación ${roomNumber}`);
  const en = res.guest.language === "en";
  const ci = loadHotelPack().politicas.check_in;
  await notifyGuest(
    reservationId,
    [
      { type: "text", text: en ? `✅ Check-in complete! Room ${roomNumber}, ready from ${ci}. Your digital key will be active on arrival.` : `✅ ¡Check-in listo! Habitación ${roomNumber}, lista desde las ${ci}. Tu llave digital se activa al llegar.` },
      {
        type: "buttons",
        items: [
          { id: `svc:REST:${res.code}`, title: en ? "Book a table" : "Reservar mesa" },
          { id: `svc:SPA:${res.code}`, title: en ? "Book spa" : "Reservar spa" },
          { id: `svc:TRAS:${res.code}`, title: en ? "Airport transfer" : "Traslado" },
        ],
      },
    ],
    { whatsappOnly: true },
  );
  return updated;
}

export function checkinUrl(token: string) {
  return `${appUrl()}/checkin/${token}`;
}

export async function reservationTimes(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  const pack = loadHotelPack();
  const tz = pack.hotel.zona_horaria;
  return {
    arrival: hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, tz),
    departure: hotelLocalToUtc(toISODate(res.checkOut), pack.politicas.check_out, tz),
    checkoutNotice: hotelLocalToUtc(toISODate(res.checkOut), pack.recordatorios.aviso_checkout_hora, tz),
    dayAfter: addDays(res.checkOut, 1),
    now: await now(),
  };
}
