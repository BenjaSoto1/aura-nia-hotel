import { db } from "../db";
import { now } from "../clock";
import { addDays, formatServiceWhen, hotelDateISO, parseISODate, parseServiceWhen, toISODate } from "../dates";
import { loadHotelPack, service } from "../hotel-pack";
import { usd } from "../money";
import { logEvent } from "../lifecycle";
import { fail, ok, type ToolContext, type ToolResult } from "./context";

/** Reservas en las que ya se puede confirmar un servicio (con pago pendiente queda anotado y sale en la confirmación). */
const NOTIFY_STATUSES = ["confirmed", "precheckin_done", "in_house"];

/** Primera hora del horario del servicio ("18:30-22:30" → 18:30). */
export function serviceDefaultTime(code: string) {
  return /(\d{1,2}:\d{2})/.exec(service(code)?.horario ?? "")?.[1]?.padStart(5, "0") ?? null;
}

export function serviceName(code: string, lang: string) {
  const s = service(code);
  return s ? (lang === "en" ? s.nombre_en ?? s.nombre : s.nombre) : code;
}

export async function bookService(
  input: { reservationCode: string; serviceCode: string; datetime: string; notes?: string },
  ctx: ToolContext,
  /** notify=false: no envía correo propio (p. ej. al reservar la estadía, el servicio va en la confirmación). */
  opts: { notify?: boolean } = {},
): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).trim().toUpperCase() }, include: { guest: true } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  if (["cancelled", "expired", "checked_out"].includes(res.status)) return fail(en ? "That reservation is not active." : "Esa reserva no está activa.");
  const svc = service(String(input.serviceCode).trim().toUpperCase());
  if (!svc) return fail((en ? "Unknown service. Options: " : "Servicio desconocido. Opciones: ") + loadHotelPack().servicios.map((s) => `${s.codigo} (${en ? s.nombre_en ?? s.nombre : s.nombre})`).join(", "));
  const raw = String(input.datetime || "").trim();
  if (!raw) return fail(en ? "Please give a date and time." : "Indica fecha y hora.");

  // Día y hora normalizados ("AAAA-MM-DD HH:MM"), dentro de la estadía y no en el pasado.
  const tz = loadHotelPack().hotel.zona_horaria;
  const todayISO = hotelDateISO(await now(), tz);
  const checkIn = toISODate(res.checkIn), checkOut = toISODate(res.checkOut);
  const fallbackDay = todayISO > checkIn && todayISO <= checkOut ? todayISO : checkIn;
  const parsed = parseServiceWhen(raw, todayISO, fallbackDay);
  const time = parsed.time ?? serviceDefaultTime(svc.codigo);
  if (!time) return fail(en ? "What time would you like it?" : "¿A qué hora lo quieres?");
  if (parsed.date < checkIn || parsed.date > checkOut) {
    return fail(
      en
        ? `That date is outside the stay (${checkIn} to ${checkOut}). Services are booked for days of the stay.`
        : `Ese día queda fuera de la estadía (${checkIn} al ${checkOut}). Los servicios se reservan para días de la estadía.`,
    );
  }
  if (parsed.date < todayISO) return fail(en ? "That date has already passed." : "Ese día ya pasó.");
  const when = `${parsed.date} ${time}`;
  const notes = input.notes?.trim() || undefined;

  const booking = await db.serviceBooking.create({ data: { reservationId: res.id, serviceCode: svc.codigo, datetime: when, notes } });
  const name = en ? svc.nombre_en ?? svc.nombre : svc.nombre;
  if (svc.precio_usd) {
    await db.folioLine.create({ data: { reservationId: res.id, concept: "service", label: `${name} · ${formatServiceWhen(when, ctx.lang)}`, amountCents: Math.round(svc.precio_usd * 100) } });
  }
  await logEvent(res.id, "service_booked", `${name} · ${when}${svc.precio_usd ? ` · ${usd(svc.precio_usd * 100)} al folio` : ""}`);

  // Correo propio del servicio (con invitación de calendario) cuando la reserva ya está confirmada.
  let emailTo: string | null = null;
  if (opts.notify !== false && NOTIFY_STATUSES.includes(res.status) && res.guest.email) {
    const { sendReservationEmail } = await import("./email");
    const r = await sendReservationEmail(res.id, "service", { serviceBookingId: booking.id });
    if (r.status !== "failed") emailTo = res.guest.email;
  }
  return ok({
    reservationCode: res.code,
    serviceBookingId: booking.id,
    service: name,
    datetime: when,
    when: formatServiceWhen(when, ctx.lang),
    charged: svc.precio_usd ? usd(svc.precio_usd * 100, ctx.lang) + (en ? " added to your room bill" : " sumado a tu cuenta") : en ? "no charge to book" : "sin costo de reserva",
    hours: svc.horario ?? null,
    emailSentTo: emailTo,
    note: emailTo
      ? en ? `Confirmation email sent to ${emailTo}.` : `Se envió el correo de confirmación a ${emailTo}.`
      : res.status === "pending_payment"
        ? en ? "It will be included in the booking confirmation once payment arrives." : "Irá en la confirmación de la reserva cuando llegue el pago."
        : null,
  });
}

// ---------------- Experiencias del sitio de Aura (Nía Mode) ----------------
const SUNSET: Record<string, string> = { sail: "SAIL", sand: "SAND", bar: "BAR" };
const RITUAL: Record<string, string> = { piedras: "PIEDRAS", masaje: "MASAJE", tina: "TINA", yoga: "YOGA" };

export interface DesignExtra {
  kind: "dinner" | "sunset" | "spa";
  hora?: string; // mesa en Brasa
  sun?: string; // sail | sand | bar
  ritual?: string; // piedras | masaje | tina | yoga
  slot?: string; // "Tarde · 16:00"
}

/**
 * Traduce lo que el huésped eligió en el diseño (mesa, atardecer, ritual) a un servicio del Hotel Pack con día y hora.
 * Día: la llegada (o hoy si ya está en el hotel); si la hora es antes del check-in, el día siguiente.
 */
export function designExtraToService(x: DesignExtra, res: { checkIn: Date; checkOut: Date }, todayISO: string) {
  const pack = loadHotelPack();
  const code = x.kind === "dinner" ? "REST" : x.kind === "sunset" ? SUNSET[x.sun ?? "sail"] ?? "SAIL" : RITUAL[x.ritual ?? "piedras"] ?? "SPA";
  const slotTime = /(\d{1,2}:\d{2})/.exec(x.slot ?? "")?.[1]?.padStart(5, "0");
  const time = (x.kind === "dinner" && /^\d{2}:\d{2}$/.test(x.hora ?? "") ? x.hora! : x.kind === "spa" && code !== "YOGA" ? slotTime : null) ?? serviceDefaultTime(code) ?? "18:00";
  const checkIn = toISODate(res.checkIn), checkOut = toISODate(res.checkOut);
  let day = todayISO > checkIn && todayISO < checkOut ? todayISO : checkIn;
  if (day === checkIn && time < pack.politicas.check_in) day = toISODate(addDays(parseISODate(checkIn), 1));
  if (day > checkOut) day = checkOut;
  const notes = x.kind === "dinner" ? "Mesa junto al agua" : x.kind === "spa" && x.slot ? x.slot : undefined;
  return { serviceCode: code, datetime: `${day} ${time}`, notes };
}
