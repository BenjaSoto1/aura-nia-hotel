import { randomInt } from "node:crypto";
import { db, isPostgres } from "../db";
import { ensureSeeded } from "../ensure-seed";
import { now } from "../clock";
import { formatRange, hotelLocalToUtc, toISODate } from "../dates";
import { loadHotelPack, rate, rateName, roomName } from "../hotel-pack";
import { usd } from "../money";
import { isEmail, normalizeEmail, normalizePhone } from "../phone";
import { linkIdentity } from "../conversations";
import { countOverlapping } from "./availability";
import { fail, ok, withLock, type ToolContext, type ToolResult } from "./context";
import type { QuoteLine } from "./quote";
import { onReservationConfirmed, cancelSideEffects, logEvent } from "../lifecycle";

const HOLD_MINUTES = 30;
const QUOTE_TTL_MS = 6 * 60 * 60 * 1000;

async function newCode() {
  for (;;) {
    const code = `AUR-${randomInt(10000, 99999)}`;
    if (!(await db.reservation.findUnique({ where: { code } }))) return code;
  }
}

export async function findGuest(email?: string | null, phone?: string | null) {
  if (email) {
    const g = await db.guest.findFirst({ where: { email: email.toLowerCase() } });
    if (g) return g;
  }
  if (phone) {
    const g = await db.guest.findFirst({ where: { phone } });
    if (g) return g;
  }
  return null;
}

export async function createReservation(
  input: { quoteId: string; fullName: string; email: string; phone: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const fullName = String(input.fullName || "").trim();
  const email = normalizeEmail(String(input.email || ""));
  const phone = normalizePhone(String(input.phone || ""));
  if (fullName.length < 3) return fail(en ? "Full name is required." : "Falta el nombre completo.");
  if (!isEmail(email)) return fail(en ? `The email "${email}" looks invalid; ask the guest to spell or type it again.` : `El correo "${email}" no parece válido; pide al huésped que lo deletree o lo escriba de nuevo.`);
  if (!phone) return fail(en ? "The phone number looks invalid." : "El teléfono no parece válido.");

  await ensureSeeded();
  const result = await withLock(async () => {
    const q = await db.quote.findUnique({ where: { id: input.quoteId } });
    if (!q) return { error: en ? "Quote not found; please quote again." : "No encontré esa cotización; vuelve a cotizar." };
    const at = await now();
    if (Date.now() - q.createdAt.getTime() > QUOTE_TTL_MS) return { error: en ? "Quote expired; please quote again." : "La cotización venció; vuelve a cotizar." };
    const plan = rate(q.ratePlanCode);
    const prepaid = plan.modalidad_pago === "prepaid";

    return db.$transaction(async (tx) => {
      // En Postgres (Netlify) varias funciones corren en paralelo y el mutex en memoria no alcanza:
      // bloqueamos la fila del tipo de habitación hasta terminar. SQLite ya serializa las escrituras.
      if (isPostgres()) await tx.$executeRaw`SELECT 1 FROM "RoomType" WHERE "code" = ${q.roomTypeCode} FOR UPDATE`;
      const rt = await tx.roomType.findUnique({ where: { code: q.roomTypeCode } });
      if (!rt) return { error: "Habitación desconocida" };
      const used = await countOverlapping(tx, q.roomTypeCode, q.checkIn, q.checkOut, at);
      if (used >= rt.inventory) {
        return { error: en ? "Sorry, that room just sold out for those dates." : "Lo siento, esa habitación se acaba de agotar para esas fechas.", soldOut: true };
      }
      let guest = await tx.guest.findFirst({ where: { email } });
      if (!guest) guest = await tx.guest.findFirst({ where: { phone } });
      guest = guest
        ? await tx.guest.update({ where: { id: guest.id }, data: { fullName, email, phone, language: ctx.lang } })
        : await tx.guest.create({ data: { fullName, email, phone, language: ctx.lang } });

      const code = await newCode();
      const res = await tx.reservation.create({
        data: {
          code,
          guestId: guest.id,
          roomTypeCode: q.roomTypeCode,
          ratePlanCode: q.ratePlanCode,
          paymentMode: plan.modalidad_pago,
          checkIn: q.checkIn,
          checkOut: q.checkOut,
          adults: q.guests,
          pets: q.pets,
          status: prepaid ? "pending_payment" : "confirmed",
          totalCents: q.totalCents,
          createdVia: ctx.channel,
          createdViaUser: ctx.channelUserId,
          holdExpiresAt: prepaid ? new Date(at.getTime() + HOLD_MINUTES * 60_000) : null,
        },
      });
      const lines = JSON.parse(q.linesJson) as QuoteLine[];
      await tx.folioLine.createMany({
        data: lines.map((l) => ({ reservationId: res.id, concept: l.concept, label: l.label, amountCents: l.amountCents })),
      });
      await tx.reservationEvent.create({
        data: { reservationId: res.id, type: "created", detail: `Creada por ${ctx.channel} (${ctx.channelUserId}) · ${prepaid ? "pendiente de pago, hold 30 min" : "pago en el hotel"}` },
      });
      if (prepaid) {
        await tx.scheduledReminder.create({ data: { reservationId: res.id, kind: "hold_expiry", runAt: res.holdExpiresAt! } });
      }
      return { reservation: res, guestId: guest.id };
    }, { maxWait: 10_000, timeout: 20_000 }); // margen para bases remotas (Neon) con arranque en frío
  });

  if ("error" in result) return fail(result.error as string);
  const res = result.reservation;
  await linkIdentity(result.guestId, ctx.channel, ctx.channelUserId);
  await linkIdentity(result.guestId, "whatsapp", phone);

  if (res.status === "confirmed") await onReservationConfirmed(res.id);

  const lang = ctx.lang;
  return ok({
    reservationCode: res.code,
    status: res.status,
    paymentMode: res.paymentMode,
    total: usd(res.totalCents, lang),
    holdExpiresAt: res.holdExpiresAt?.toISOString() ?? null,
    nextStep:
      res.status === "pending_payment"
        ? "Llama a create_payment_link con purpose=prepayment y comparte el enlace. La reserva se confirma solo cuando el pago llegue."
        : "Reserva confirmada con pago en el hotel. Ya se envió el correo de confirmación.",
  });
}

export async function getMyReservations(_input: Record<string, never>, ctx: ToolContext): Promise<ToolResult> {
  const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
  let guestId = conv?.guestId ?? null;
  if (!guestId) {
    const ident = await db.guestIdentity.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
    guestId = ident?.guestId ?? null;
  }
  if (!guestId) return ok({ reservations: [], note: "Huésped no identificado: pide el código de reserva o el correo." });
  const list = await db.reservation.findMany({ where: { guestId }, orderBy: { checkIn: "asc" } });
  return ok({
    reservations: list.map((r) => ({
      code: r.code,
      status: r.status,
      room: roomName(r.roomTypeCode, ctx.lang),
      rate: rateName(r.ratePlanCode, ctx.lang),
      checkIn: toISODate(r.checkIn),
      checkOut: toISODate(r.checkOut),
      dates: formatRange(r.checkIn, r.checkOut, ctx.lang),
      total: usd(r.totalCents, ctx.lang),
      roomNumber: r.roomNumber,
    })),
  });
}

export async function cancelReservation(input: { reservationCode: string; email: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() }, include: { guest: true } });
  if (!res || res.guest.email?.toLowerCase() !== String(input.email || "").trim().toLowerCase()) {
    return fail(en ? "Reservation not found for that email." : "No encontré una reserva con ese código y correo.");
  }
  if (["cancelled", "expired", "checked_out"].includes(res.status)) return fail(en ? "That reservation is no longer active." : "Esa reserva ya no está activa.");
  const pack = loadHotelPack();
  const at = await now();
  const arrival = hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, pack.hotel.zona_horaria);
  const hoursBefore = (arrival.getTime() - at.getTime()) / 3_600_000;
  let penalty = "";
  if (res.paymentMode === "prepaid" && res.status !== "pending_payment") {
    penalty = en ? "Prepaid rate is non-refundable: no refund applies." : "Tarifa prepago no reembolsable: no corresponde reembolso.";
  } else if (res.paymentMode === "pay_at_hotel" && hoursBefore < 48) {
    const firstNight = Math.round(res.totalCents / Math.max(1, (res.checkOut.getTime() - res.checkIn.getTime()) / 86_400_000));
    penalty = en ? `Less than 48 h before arrival: first night (${usd(firstNight, "en")}) is charged.` : `Menos de 48 h antes de la llegada: se cobra la primera noche (${usd(firstNight)}).`;
  } else {
    penalty = en ? "Free cancellation." : "Cancelación sin costo.";
  }
  await db.reservation.update({ where: { id: res.id }, data: { status: "cancelled" } });
  await logEvent(res.id, "cancelled", penalty);
  await cancelSideEffects(res.id);
  return ok({ reservationCode: res.code, status: "cancelled", policyApplied: penalty });
}
