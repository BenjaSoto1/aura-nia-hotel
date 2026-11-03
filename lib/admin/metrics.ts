// Métricas del panel de administración. Todo se calcula desde la base (la fuente de verdad) con el
// reloj del hotel (incluye el viaje en el tiempo). Volúmenes de demo: se calcula en memoria.
import { db } from "../db";
import { now } from "../clock";
import { addDays, hotelDateISO, hotelLocalToUtc, nightsBetween, parseISODate, toISODate } from "../dates";
import { loadHotelPack } from "../hotel-pack";

/** Reservas que cuentan como vendidas (ingreso reservado). */
export const BOOKED = ["confirmed", "precheckin_done", "in_house", "checked_out"];
/** Reservas que ocupan una habitación hacia adelante. */
export const OCCUPYING = ["confirmed", "precheckin_done", "in_house"];

export type Period = 7 | 30 | 90;
export const parsePeriod = (p?: string): Period => (p === "7" ? 7 : p === "90" ? 90 : 30);

export async function hotelToday() {
  const tz = loadHotelPack().hotel.zona_horaria;
  const at = await now();
  return { at, tz, today: parseISODate(hotelDateISO(at, tz)) };
}

const pct = (a: number, b: number) => (b > 0 ? a / b : 0);
const delta = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : cur > 0 ? null : 0);

export async function dashboardMetrics(period: Period) {
  const pack = loadHotelPack();
  const { at, tz, today } = await hotelToday();
  const startDay = addDays(today, -(period - 1));
  const start = hotelLocalToUtc(toISODate(startDay), "00:00", tz);
  const prevStart = hotelLocalToUtc(toISODate(addDays(startDay, -period)), "00:00", tz);

  const [reservations, payments, cancelEvents, convFirst, needsHuman, recentEvents, failedEmails, services, roomTypes] = await Promise.all([
    db.reservation.findMany({ include: { guest: true, folioLines: true } }),
    db.payment.findMany({ where: { status: "paid", kind: { not: "preauth" }, createdAt: { gte: prevStart } } }),
    db.reservationEvent.findMany({ where: { type: "cancelled", createdAt: { gte: prevStart } } }),
    db.message.groupBy({ by: ["conversationId"], _min: { createdAt: true } }),
    db.conversation.findMany({ where: { needsHuman: true }, orderBy: { updatedAt: "desc" }, take: 8 }),
    db.reservationEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { reservation: { select: { id: true, code: true, guest: { select: { fullName: true } } } } } }),
    db.emailLog.findMany({ where: { status: "failed" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.serviceBooking.findMany({ include: { reservation: { include: { guest: true } } } }),
    db.roomType.findMany(),
  ]);

  const inRange = (d: Date, from: Date, to?: Date) => d >= from && (!to || d < to);

  // ---------- KPI del período (vs período anterior) ----------
  const created = (from: Date, to?: Date) => reservations.filter((r) => inRange(r.createdAt, from, to));
  const bookedIn = (from: Date, to?: Date) => created(from, to).filter((r) => BOOKED.includes(r.status));
  const cur = bookedIn(start);
  const prev = bookedIn(prevStart, start);
  const revenue = cur.reduce((s, r) => s + r.totalCents, 0);
  const prevRevenue = prev.reduce((s, r) => s + r.totalCents, 0);
  const roomNet = (r: (typeof reservations)[number]) => r.folioLines.filter((l) => l.concept === "room" || l.concept === "discount").reduce((s, l) => s + l.amountCents, 0);
  const nights = (list: typeof reservations) => list.reduce((s, r) => s + nightsBetween(r.checkIn, r.checkOut), 0);
  const adr = pct(cur.reduce((s, r) => s + roomNet(r), 0), nights(cur));
  const prevAdr = pct(prev.reduce((s, r) => s + roomNet(r), 0), nights(prev));
  const collected = payments.filter((p) => p.createdAt >= start).reduce((s, p) => s + p.amountCents, 0);
  const prevCollected = payments.filter((p) => p.createdAt < start).reduce((s, p) => s + p.amountCents, 0);
  const cancellations = cancelEvents.filter((e) => e.createdAt >= start).length;
  const prevCancellations = cancelEvents.filter((e) => e.createdAt < start).length;
  const convsStarted = convFirst.filter((c) => c._min.createdAt && c._min.createdAt >= start).length;
  const prevConvsStarted = convFirst.filter((c) => c._min.createdAt && c._min.createdAt >= prevStart && c._min.createdAt < start).length;
  const conversion = pct(cur.length, convsStarted);
  const prevConversion = pct(prev.length, prevConvsStarted);

  // ---------- Ocupación de los próximos 30 días (por tipo y día) ----------
  const horizon = 30;
  const inventory = roomTypes.reduce((s, t) => s + t.inventory, 0);
  const occupying = reservations.filter((r) => OCCUPYING.includes(r.status) || (r.status === "pending_payment" && r.holdExpiresAt && r.holdExpiresAt > at));
  const days = Array.from({ length: horizon }, (_, i) => addDays(today, i));
  const occupancyByType = pack.habitaciones.map((h) => {
    const inv = roomTypes.find((t) => t.code === h.codigo)?.inventory ?? h.inventario;
    const cells = days.map((d) => {
      const sold = occupying.filter((r) => r.roomTypeCode === h.codigo && r.checkIn <= d && r.checkOut > d).length;
      return { date: toISODate(d), sold, inventory: inv, rate: pct(sold, inv) };
    });
    return { code: h.codigo, name: h.nombre_es, inventory: inv, cells };
  });
  const soldNext = occupancyByType.reduce((s, t) => s + t.cells.reduce((a, c) => a + c.sold, 0), 0);
  const occupancyNext = pct(soldNext, inventory * horizon);

  // ---------- Serie diaria (reservas vendidas e ingreso por día de creación) ----------
  const daily = Array.from({ length: period }, (_, i) => {
    const d = addDays(startDay, i);
    const from = hotelLocalToUtc(toISODate(d), "00:00", tz);
    const to = hotelLocalToUtc(toISODate(addDays(d, 1)), "00:00", tz);
    const list = bookedIn(from, to);
    return { date: toISODate(d), count: list.length, revenue: list.reduce((s, r) => s + r.totalCents, 0) };
  });

  // ---------- Desgloses ----------
  const byChannel = ["whatsapp", "web", "phone", "instagram", "messenger"].map((ch) => {
    const list = cur.filter((r) => r.createdVia === ch);
    return { channel: ch, count: list.length, revenue: list.reduce((s, r) => s + r.totalCents, 0) };
  });
  const byRate = pack.tarifas.map((t) => {
    const list = cur.filter((r) => r.ratePlanCode === t.codigo);
    return { code: t.codigo, name: t.nombre, count: list.length, revenue: list.reduce((s, r) => s + r.totalCents, 0) };
  });
  const byRoom = pack.habitaciones.map((h) => {
    const list = cur.filter((r) => r.roomTypeCode === h.codigo);
    return { code: h.codigo, name: h.nombre_es, count: list.length, revenue: list.reduce((s, r) => s + r.totalCents, 0) };
  });

  // ---------- Operación de hoy ----------
  const sameDay = (a: Date, b: Date) => toISODate(a) === toISODate(b);
  const alive = (r: (typeof reservations)[number]) => !["cancelled", "expired"].includes(r.status);
  const arrivals = reservations.filter((r) => alive(r) && r.status !== "checked_out" && sameDay(r.checkIn, today)).sort((a, b) => a.code.localeCompare(b.code));
  const departures = reservations.filter((r) => alive(r) && sameDay(r.checkOut, today));
  const inHouse = reservations.filter((r) => ["precheckin_done", "in_house", "confirmed"].includes(r.status) && r.checkIn <= today && r.checkOut > today);
  const pendingPayments = reservations
    .filter((r) => r.status === "pending_payment")
    .sort((a, b) => (a.holdExpiresAt?.getTime() ?? 0) - (b.holdExpiresAt?.getTime() ?? 0));
  const in7 = toISODate(addDays(today, 7));
  const upcomingServices = services
    .filter((s) => !["cancelled", "expired"].includes(s.reservation.status))
    .filter((s) => {
      const d = s.datetime.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= toISODate(today) && d <= in7;
    })
    .sort((a, b) => a.datetime.localeCompare(b.datetime));

  return {
    period,
    at,
    today,
    kpis: {
      revenue: { value: revenue, delta: delta(revenue, prevRevenue) },
      bookings: { value: cur.length, delta: delta(cur.length, prev.length) },
      adr: { value: Math.round(adr), delta: delta(adr, prevAdr) },
      collected: { value: collected, delta: delta(collected, prevCollected) },
      cancellations: { value: cancellations, delta: delta(cancellations, prevCancellations) },
      conversion: { value: conversion, delta: delta(conversion, prevConversion), conversations: convsStarted },
      occupancyNext: { value: occupancyNext, soldNights: soldNext, capacity: inventory * horizon },
    },
    daily,
    byChannel,
    byRate,
    byRoom,
    occupancyByType,
    ops: { arrivals, departures, inHouse, pendingPayments, needsHuman, upcomingServices, failedEmails, recentEvents },
  };
}

export type DashboardMetrics = Awaited<ReturnType<typeof dashboardMetrics>>;
