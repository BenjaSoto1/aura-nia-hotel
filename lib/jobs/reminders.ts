import { db } from "../db";
import { now } from "../clock";
import { formatLong } from "../dates";
import { loadHotelPack, roomName } from "../hotel-pack";
import { usd } from "../money";
import { checkinUrl, expireHold, folioSummary, logEvent, notifyGuest } from "../lifecycle";
import { ensureCheckinToken } from "../tools/checkin";
import { sendReservationEmail } from "../tools/email";

/**
 * Ejecuta los recordatorios vencidos según el reloj (con viaje en el tiempo).
 * Sin candado en memoria: en Netlify cada función se congela entre peticiones y un candado podía
 * quedar tomado. El reclamo atómico (updateMany where sentAt = null) evita enviar dos veces.
 */
export async function processDueReminders() {
  let processed = 0;
  const at = await now();
  const due = await db.scheduledReminder.findMany({ where: { sentAt: null, runAt: { lte: at } }, orderBy: { runAt: "asc" } });
  for (const r of due) {
    const claimed = await db.scheduledReminder.updateMany({ where: { id: r.id, sentAt: null }, data: { sentAt: at } });
    if (!claimed.count) continue;
    try {
      await runReminder(r.reservationId, r.kind);
      processed++;
    } catch (e) {
      console.error("[reminders]", r.kind, e);
      await logEvent(r.reservationId, "reminder_failed", `${r.kind}: ${String(e)}`);
    }
  }
  return { processed };
}

async function runReminder(reservationId: string, kind: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true } });
  const en = res.guest.language === "en";
  const T = (es: string, e: string) => (en ? e : es);
  const pack = loadHotelPack();
  const first = (res.guest.fullName ?? "").split(" ")[0];

  if (kind === "hold_expiry") {
    await expireHold(reservationId);
    return;
  }

  if (kind === "precheckin") {
    if (res.status !== "confirmed") return;
    const token = await ensureCheckinToken(reservationId);
    await notifyGuest(
      reservationId,
      [
        {
          type: "text",
          text: T(
            `¡Hola ${first}! Mañana ${formatLong(res.checkIn, "es")} te esperamos en ${pack.hotel.nombre} (${roomName(res.roomTypeCode, "es")}, reserva ${res.code}).\nAdelanta tu check-in digital en menos de 2 minutos: foto de tu documento, firma y número de habitación.`,
            `Hi ${first}! We're expecting you tomorrow, ${formatLong(res.checkIn, "en")}, at ${pack.hotel.nombre} (${roomName(res.roomTypeCode, "en")}, booking ${res.code}).\nDo your digital check-in in under 2 minutes: ID photo, signature and room number.`,
          ),
        },
        { type: "buttons", items: [{ id: `checkin_start:${res.code}`, title: T("Empezar check-in", "Start check-in") }] },
        { type: "link", url: checkinUrl(token), title: T("Hacer pre-check-in en la web", "Pre-check-in on the web") },
      ],
      { template: true, whatsappOnly: true },
    );
    try {
      await sendReservationEmail(reservationId, "precheckin");
    } catch (e) {
      await logEvent(reservationId, "email_failed", String(e));
    }
    await logEvent(reservationId, "reminder_sent", "Pre-check-in (24 h antes) por WhatsApp + correo");
    return;
  }

  if (kind === "checkout_notice") {
    if (!["confirmed", "precheckin_done", "in_house"].includes(res.status)) return;
    if (res.status === "precheckin_done") await db.reservation.update({ where: { id: reservationId }, data: { status: "in_house" } });
    const f = await folioSummary(reservationId);
    const lines = f.lines.map((l) => `• ${l.label}: ${usd(l.amountCents, res.guest.language)}`).join("\n");
    await notifyGuest(
      reservationId,
      [
        {
          type: "text",
          text: T(
            `Buenos días ${first} ☀️ Hoy es tu día de salida (check-out hasta las ${pack.politicas.check_out}). Este es el resumen de tu cuenta:\n${lines}\nPagado: ${usd(f.paidCents)}\n*Saldo: ${usd(f.balanceCents)}*`,
            `Good morning ${first} ☀️ Today is your check-out day (until ${pack.politicas.check_out}). Here's your account summary:\n${lines}\nPaid: ${usd(f.paidCents, "en")}\n*Balance: ${usd(f.balanceCents, "en")}*`,
          ),
        },
        {
          type: "buttons",
          items:
            f.balanceCents > 0
              ? [{ id: `pay_balance:${res.code}`, title: T("Pagar saldo y hacer checkout", "Pay balance & check out") }]
              : [{ id: `checkout:${res.code}`, title: T("Hacer checkout", "Check out") }],
        },
      ],
      { template: true, whatsappOnly: true },
    );
    await logEvent(reservationId, "reminder_sent", "Aviso de salida con resumen de cuenta");
    return;
  }

  if (kind === "review") {
    if (res.status !== "checked_out") return;
    await notifyGuest(
      reservationId,
      [
        { type: "text", text: T(`${first}, ¿cómo estuvo tu estadía en ${pack.hotel.nombre}?`, `${first}, how was your stay at ${pack.hotel.nombre}?`) },
        { type: "buttons", items: [1, 2, 3, 4, 5].map((n) => ({ id: `review:${n}:${res.code}`, title: "★".repeat(n) })) },
      ],
      { template: true, whatsappOnly: true },
    );
    await logEvent(reservationId, "reminder_sent", "Encuesta de satisfacción");
  }
}
