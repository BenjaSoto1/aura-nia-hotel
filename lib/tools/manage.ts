// Modificar y cancelar reservas: las mismas reglas para WhatsApp, Instagram, Messenger, web, voz y teléfono.
import type { Reservation, Guest } from "@prisma/client";
import { db, isPostgres } from "../db";
import { ensureSeeded } from "../ensure-seed";
import { now } from "../clock";
import { formatRange, hotelLocalToUtc, nightsBetween, toISODate } from "../dates";
import { loadHotelPack, rateName, room, roomName } from "../hotel-pack";
import { usd } from "../money";
import { normalizeEmail } from "../phone";
import { linkIdentity } from "../conversations";
import { cancelSideEffects, folioSummary, logEvent, releaseGuarantee, scheduleReminders } from "../lifecycle";
import { countOverlapping, validateStay } from "./availability";
import { fail, ok, withLock, type ToolContext, type ToolResult } from "./context";
import { priceStay } from "./quote";
import { updateCalendarEvent } from "./calendar";
import { sendReservationEmail } from "./email";
import { createPaymentLink } from "./payments";
import type { Part } from "../types";

/** Cambios con menos de este margen antes de la llegada los hace recepción. */
const MIN_HOURS_TO_CHANGE = 48;
const MODIFIABLE = ["confirmed", "pending_payment"];
const ROOM_CONCEPTS = ["room", "discount", "pet_fee", "tax"];

/** Huésped dueño de esta conversación (por identidad del canal o, en WhatsApp/teléfono, por su número). */
async function guestOfConversation(ctx: ToolContext): Promise<string | null> {
  const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
  if (conv?.guestId) return conv.guestId;
  const ident = await db.guestIdentity.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
  if (ident) return ident.guestId;
  if (ctx.channel === "whatsapp" || ctx.channel === "phone") return (await db.guest.findFirst({ where: { phone: ctx.channelUserId } }))?.id ?? null;
  return null;
}

/**
 * Busca la reserva y verifica que quien escribe sea su dueño: o la conversación ya está vinculada al huésped,
 * o da el correo con que se reservó (y entonces se vincula este canal para las próximas veces).
 */
export async function findManageable(code: string, email: string | undefined, ctx: ToolContext): Promise<{ res: Reservation & { guest: Guest } } | { error: string }> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(code || "").trim().toUpperCase() }, include: { guest: true } });
  if (!res) return { error: en ? "I couldn't find a booking with that code." : "No encontré una reserva con ese código." };
  const owner = await guestOfConversation(ctx);
  const emailOk = Boolean(email && res.guest.email && normalizeEmail(email) === res.guest.email.toLowerCase());
  if (owner !== res.guestId && !emailOk) {
    return {
      error: en
        ? "To protect the booking I need the email it was made with."
        : "Para proteger la reserva necesito el correo con que se hizo.",
    };
  }
  if (emailOk && owner !== res.guestId) await linkIdentity(res.guestId, ctx.channel, ctx.channelUserId);
  return { res };
}

/** Reservas del huésped de esta conversación que todavía se pueden gestionar. */
export async function manageableReservations(ctx: ToolContext) {
  const guestId = await guestOfConversation(ctx);
  if (!guestId) return [];
  return db.reservation.findMany({ where: { guestId, status: { in: [...MODIFIABLE, "precheckin_done"] } }, orderBy: { checkIn: "asc" } });
}

async function hoursToArrival(res: Reservation) {
  const pack = loadHotelPack();
  const arrival = hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, pack.hotel.zona_horaria);
  return (arrival.getTime() - (await now()).getTime()) / 3_600_000;
}

/** Qué se cobra si se cancela ahora (sin cancelar todavía). */
export async function cancellationTerms(res: Reservation, lang: "es" | "en") {
  const en = lang === "en";
  const hours = await hoursToArrival(res);
  if (res.paymentMode === "prepaid" && res.status !== "pending_payment") {
    return { free: false, text: en ? "Prepaid rate is non-refundable: no refund applies." : "Tarifa prepago no reembolsable: no corresponde reembolso." };
  }
  if (res.paymentMode === "pay_at_hotel" && hours < 48) {
    const firstNight = Math.round(res.totalCents / Math.max(1, nightsBetween(res.checkIn, res.checkOut)));
    return {
      free: false,
      text: en ? `Less than 48 h before arrival: the first night (${usd(firstNight, "en")}) is charged.` : `Faltan menos de 48 h para la llegada: se cobra la primera noche (${usd(firstNight)}).`,
    };
  }
  return { free: true, text: en ? "Free cancellation, no charge." : "Cancelación sin costo." };
}

/** Texto de resumen de una reserva para mostrar antes de modificarla o cancelarla. */
export function describeReservation(res: Reservation, lang: "es" | "en") {
  const en = lang === "en";
  return [
    `*${res.code}* · ${roomName(res.roomTypeCode, lang)}`,
    `${formatRange(res.checkIn, res.checkOut, lang)} · ${nightsBetween(res.checkIn, res.checkOut)} ${en ? "nights" : "noches"} · ${res.adults} ${en ? "guests" : res.adults === 1 ? "persona" : "personas"}`,
    `${rateName(res.ratePlanCode, lang)} · ${usd(res.totalCents, lang)}`,
  ].join("\n");
}

// ------------------------------------------------------------------ cancelar

export async function cancelReservation(input: { reservationCode: string; email?: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const found = await findManageable(input.reservationCode, input.email, ctx);
  if ("error" in found) return fail(found.error);
  const res = found.res;
  if (["cancelled", "expired", "checked_out", "in_house"].includes(res.status)) {
    return fail(en ? "That booking can no longer be cancelled online." : "Esa reserva ya no se puede cancelar en línea.");
  }
  const terms = await cancellationTerms(res, ctx.lang);
  await db.reservation.update({ where: { id: res.id }, data: { status: "cancelled" } });
  await logEvent(res.id, "cancelled", `${terms.text} · por ${ctx.channel}`);
  await cancelSideEffects(res.id);
  if (terms.free) await releaseGuarantee(res.id);

  let emailSentTo: string | null = null;
  try {
    const r = await sendReservationEmail(res.id, "cancellation", { notice: terms.text });
    if (r.status !== "failed") emailSentTo = res.guest.email;
  } catch (e) {
    await logEvent(res.id, "email_failed", String(e));
  }
  return ok({ reservationCode: res.code, status: "cancelled", policyApplied: terms.text, emailSentTo });
}

// ------------------------------------------------------------------ modificar

export async function modifyReservation(
  input: { reservationCode: string; email?: string; checkIn?: string; checkOut?: string; roomTypeCode?: string; guests?: number; pets?: number },
  ctx: ToolContext,
  /** staff: cambios hechos por recepción desde el panel (sin el límite de 48 h; también con check-in hecho o en casa). */
  opts: { staff?: boolean } = {},
): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const lang = ctx.lang;
  const found = await findManageable(input.reservationCode, input.email, ctx);
  if ("error" in found) return fail(found.error);
  const res = found.res;

  if (opts.staff) {
    if (!["confirmed", "pending_payment", "precheckin_done", "in_house"].includes(res.status)) return fail("Esa reserva ya no está activa.");
  } else if (res.status === "precheckin_done") {
    return fail(en ? "Your check-in is already done; the front desk will help you with any change." : "Tu check-in ya está hecho: cualquier cambio lo coordina recepción.");
  }
  if (!opts.staff && !MODIFIABLE.includes(res.status)) return fail(en ? "That booking is no longer active." : "Esa reserva ya no está activa.");
  if (!opts.staff && (await hoursToArrival(res)) < MIN_HOURS_TO_CHANGE) {
    return fail(
      en
        ? "Less than 48 h before arrival: changes are handled by the front desk. Shall I connect you with a person?"
        : "Faltan menos de 48 h para tu llegada: los cambios los hace recepción. ¿Te comunico con una persona?",
    );
  }

  const next = {
    checkIn: input.checkIn || toISODate(res.checkIn),
    checkOut: input.checkOut || toISODate(res.checkOut),
    roomTypeCode: (input.roomTypeCode || res.roomTypeCode).toUpperCase(),
    guests: Number(input.guests) || res.adults,
    pets: input.pets == null || input.pets === ("" as never) ? res.pets : Number(input.pets) || 0,
  };
  const sameDates = next.checkIn === toISODate(res.checkIn) && next.checkOut === toISODate(res.checkOut);
  if (sameDates && next.roomTypeCode === res.roomTypeCode && next.guests === res.adults && next.pets === res.pets) {
    return fail(en ? "Tell me what you'd like to change: dates, room or number of guests." : "Dime qué quieres cambiar: fechas, habitación o número de huéspedes.");
  }

  const v = await validateStay(next.checkIn, next.checkOut, lang);
  // Recepción puede extender una estadía en curso (llegada en el pasado) sin que la fecha de llegada lo bloquee.
  const inHouseExtension = opts.staff && "error" in v && sameDates === false && next.checkIn === toISODate(res.checkIn);
  if ("error" in v && !inHouseExtension) return fail(v.error!);
  const stay = "error" in v ? { checkIn: res.checkIn, checkOut: new Date(`${next.checkOut}T00:00:00Z`), nights: nightsBetween(res.checkIn, new Date(`${next.checkOut}T00:00:00Z`)) } : v;
  if (stay.nights < 1) return fail("La salida debe ser posterior a la llegada.");
  let roomDef;
  try {
    roomDef = room(next.roomTypeCode);
  } catch {
    return fail(en ? "Unknown room." : "Habitación desconocida.");
  }
  if (next.guests > roomDef.max_huespedes) {
    return fail(en ? `${roomName(next.roomTypeCode, "en")} fits up to ${roomDef.max_huespedes} guests.` : `${roomName(next.roomTypeCode, "es")} admite hasta ${roomDef.max_huespedes} personas.`);
  }
  if (next.pets > 2) return fail(en ? "Maximum 2 pets per room." : "Máximo 2 mascotas por habitación.");

  const price = priceStay(next.roomTypeCode, res.ratePlanCode, stay.nights, next.pets, lang);
  await ensureSeeded();
  const at = await now();
  const result = await withLock(() =>
    db.$transaction(
      async (tx) => {
        if (isPostgres()) await tx.$executeRaw`SELECT 1 FROM "RoomType" WHERE "code" = ${next.roomTypeCode} FOR UPDATE`;
        const rt = await tx.roomType.findUnique({ where: { code: next.roomTypeCode } });
        if (!rt) return { error: en ? "Unknown room." : "Habitación desconocida." };
        const used = await countOverlapping(tx, next.roomTypeCode, stay.checkIn, stay.checkOut, at, res.id);
        if (used >= rt.inventory) {
          return { error: en ? "Sorry, there's no availability for that change." : "Lo siento, no hay disponibilidad para ese cambio." };
        }
        await tx.reservation.update({
          where: { id: res.id },
          data: {
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            roomTypeCode: next.roomTypeCode,
            adults: next.guests,
            pets: next.pets,
            totalCents: price.totalCents,
            roomNumber: next.roomTypeCode === res.roomTypeCode ? res.roomNumber : null,
          },
        });
        await tx.folioLine.deleteMany({ where: { reservationId: res.id, concept: { in: ROOM_CONCEPTS } } });
        await tx.folioLine.createMany({ data: price.lines.map((l) => ({ reservationId: res.id, concept: l.concept, label: l.label, amountCents: l.amountCents })) });
        return { ok: true as const };
      },
      { maxWait: 10_000, timeout: 20_000 },
    ),
  );
  if ("error" in result) return fail(result.error as string);

  // Qué cambió, en palabras del huésped
  const changes: string[] = [];
  if (!sameDates) changes.push(`${en ? "Dates" : "Fechas"}: ${formatRange(res.checkIn, res.checkOut, lang)} → ${formatRange(stay.checkIn, stay.checkOut, lang)}`);
  if (next.roomTypeCode !== res.roomTypeCode) changes.push(`${en ? "Room" : "Habitación"}: ${roomName(res.roomTypeCode, lang)} → ${roomName(next.roomTypeCode, lang)}`);
  if (next.guests !== res.adults) changes.push(`${en ? "Guests" : "Huéspedes"}: ${res.adults} → ${next.guests}`);
  if (next.pets !== res.pets) changes.push(`${en ? "Pets" : "Mascotas"}: ${res.pets} → ${next.pets}`);
  changes.push(`${en ? "Stay total" : "Total de la estadía"}: ${usd(res.totalCents, lang)} → ${usd(price.totalCents, lang)}`);
  await logEvent(res.id, "modified", `${changes.join(" · ")} · ${opts.staff ? "por recepción (panel)" : `por ${ctx.channel}`}`);

  const parts: Part[] = [];
  let paymentNote: string | null = null;
  if (res.status === "pending_payment") {
    // El enlace anterior tenía otro monto: se invalida y se genera uno nuevo.
    await db.payment.updateMany({ where: { reservationId: res.id, status: "link_sent" }, data: { status: "expired" } });
    const link = await createPaymentLink({ reservationCode: res.code, purpose: "prepayment" }, ctx);
    if (link.parts) parts.push(...link.parts);
    paymentNote = en ? `New payment link for ${usd(price.totalCents, "en")}.` : `Nuevo enlace de pago por ${usd(price.totalCents)}.`;
  } else {
    await scheduleReminders(res.id);
    try {
      await updateCalendarEvent(res.id);
      await logEvent(res.id, "calendar_updated", res.calendarEventId?.startsWith("sim_") ? "Evento de calendario actualizado (simulado)" : "Google Calendar actualizado");
    } catch (e) {
      await logEvent(res.id, "calendar_failed", String(e));
    }
    const f = await folioSummary(res.id);
    const paidAny = f.paidCents > 0;
    if (paidAny && f.balanceCents > 0) {
      const link = await createPaymentLink({ reservationCode: res.code, purpose: "balance" }, ctx);
      if (link.parts) parts.push(...link.parts);
      paymentNote = en
        ? `There's a difference of ${usd(f.balanceCents, "en")}: you can pay it now with the secure link or at check-out.`
        : `Queda una diferencia de ${usd(f.balanceCents)}: puedes pagarla ahora con el enlace seguro o al salir.`;
    } else if (paidAny && f.balanceCents < 0) {
      paymentNote = en
        ? `The prepaid rate is non-refundable: the ${usd(-f.balanceCents, "en")} difference stays as credit on your hotel bill.`
        : `La tarifa prepago no es reembolsable: la diferencia de ${usd(-f.balanceCents)} queda como crédito en tu cuenta del hotel.`;
    }
  }

  let emailSentTo: string | null = null;
  if (["confirmed", "precheckin_done", "in_house"].includes(res.status)) {
    try {
      const r = await sendReservationEmail(res.id, "modification", { notice: [...changes, ...(paymentNote ? [paymentNote] : [])].join("\n") });
      if (r.status !== "failed") emailSentTo = res.guest.email;
    } catch (e) {
      await logEvent(res.id, "email_failed", String(e));
    }
  }

  return ok(
    {
      reservationCode: res.code,
      status: res.status,
      changes,
      newTotal: usd(price.totalCents, lang),
      paymentNote,
      emailSentTo,
      summary: describeReservation((await db.reservation.findUniqueOrThrow({ where: { id: res.id } })) as Reservation, lang),
    },
    parts,
  );
}
