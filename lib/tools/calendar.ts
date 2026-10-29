import { db } from "../db";
import { appUrl, googleConnected } from "../config";
import { hotelLocalToUtc, toISODate } from "../dates";
import { loadHotelPack, rateName, roomName } from "../hotel-pack";
import { usd } from "../money";
import { CHANNEL_LABEL, type Channel } from "../types";
import { calendarApi } from "../integrations/google";

async function buildEvent(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true, payments: true } });
  const pack = loadHotelPack();
  const tz = pack.hotel.zona_horaria;
  const start = hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, tz);
  const end = hotelLocalToUtc(toISODate(res.checkOut), pack.politicas.check_out, tz);
  const paid = res.payments.some((p) => p.kind === "prepayment" && p.status === "paid");
  const payState = res.paymentMode === "prepaid" ? (paid ? "Pagada (prepago)" : "Pendiente de pago") : "Paga en el hotel";
  const summary = `🛎 ${res.code} · ${res.guest.fullName ?? "Huésped"} · ${roomName(res.roomTypeCode, "es")}`;
  const description = [
    `Huéspedes: ${res.adults} · Mascotas: ${res.pets}`,
    `Tarifa: ${rateName(res.ratePlanCode, "es")}`,
    `Modalidad: ${res.paymentMode === "prepaid" ? "Prepago" : "Pago en el hotel"} · Estado del pago: ${payState}`,
    `Total: ${usd(res.totalCents)}`,
    `Canal de origen: ${CHANNEL_LABEL[res.createdVia as Channel] ?? res.createdVia}`,
    `Teléfono: ${res.guest.phone ?? "-"} · Correo: ${res.guest.email ?? "-"}`,
    `Panel: ${appUrl()}/panel/reservas/${res.id}`,
  ].join("\n");
  return {
    res,
    summary,
    description,
    start,
    end,
    tz,
    colorId: res.paymentMode === "prepaid" ? (paid ? "10" : "6") : "5", // verde pagada, amarillo pago en hotel
    reminders: [
      { method: "popup", minutes: 1440 },
      { method: "email", minutes: 1440 },
      { method: "popup", minutes: 60 },
    ],
  };
}

export async function createCalendarEvent(reservationId: string) {
  const ev = await buildEvent(reservationId);
  if (ev.res.calendarEventId) return;
  if (!(await googleConnected())) {
    const id = `sim_${ev.res.code}`;
    await db.reservation.update({ where: { id: reservationId }, data: { calendarEventId: id } });
    await db.reservationEvent.create({
      data: {
        reservationId,
        type: "calendar_created",
        detail: JSON.stringify({ simulated: true, summary: ev.summary, start: ev.start, end: ev.end, colorId: ev.colorId, reminders: ev.reminders, description: ev.description }),
      },
    });
    return;
  }
  const invite = process.env.CALENDAR_INVITE_GUEST === "true" && ev.res.guest.email;
  const r = await (await calendarApi()).events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    sendUpdates: "none",
    requestBody: {
      summary: ev.summary,
      description: ev.description,
      location: loadHotelPack().hotel.direccion,
      start: { dateTime: ev.start.toISOString(), timeZone: ev.tz },
      end: { dateTime: ev.end.toISOString(), timeZone: ev.tz },
      colorId: ev.colorId,
      reminders: { useDefault: false, overrides: ev.reminders },
      attendees: invite ? [{ email: ev.res.guest.email! }] : undefined,
    },
  });
  await db.reservation.update({ where: { id: reservationId }, data: { calendarEventId: r.data.id ?? null, calendarLink: r.data.htmlLink ?? null } });
  await db.reservationEvent.create({ data: { reservationId, type: "calendar_created", detail: JSON.stringify({ simulated: false, id: r.data.id, link: r.data.htmlLink }) } });
}

export async function updateCalendarEvent(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (!res.calendarEventId || res.calendarEventId.startsWith("sim_") || !(await googleConnected())) return;
  const ev = await buildEvent(reservationId);
  await (await calendarApi()).events.patch({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    eventId: res.calendarEventId,
    sendUpdates: "none",
    requestBody: { summary: ev.summary, description: ev.description, colorId: ev.colorId },
  });
}

export async function deleteCalendarEvent(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (!res.calendarEventId) return;
  if (!res.calendarEventId.startsWith("sim_") && (await googleConnected())) {
    await (await calendarApi()).events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID || "primary", eventId: res.calendarEventId, sendUpdates: "none" });
  }
  await db.reservation.update({ where: { id: reservationId }, data: { calendarEventId: null, calendarLink: null } });
  await db.reservationEvent.create({ data: { reservationId, type: "calendar_deleted", detail: res.calendarEventId.startsWith("sim_") ? "simulado" : res.calendarEventId } });
}

/** Enlace "Agregar a Google Calendar" para el huésped. */
export function googleCalendarTemplateLink(opts: { title: string; start: Date; end: Date; details: string; location: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({ action: "TEMPLATE", text: opts.title, dates: `${fmt(opts.start)}/${fmt(opts.end)}`, details: opts.details, location: opts.location });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
