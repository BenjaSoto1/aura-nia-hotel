import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";
import { ensureSeeded } from "../ensure-seed";
import { now, realNow } from "../clock";
import { hotelDateISO, nightsBetween, parseISODate } from "../dates";
import { loadHotelPack, roomName } from "../hotel-pack";
import { fail, ok, type ToolContext, type ToolResult } from "./context";

type Tx = PrismaClient | Prisma.TransactionClient;

export const ACTIVE_STATUSES = ["confirmed", "precheckin_done", "in_house"];

/** Reservas activas que se solapan con [checkIn, checkOut) para un tipo de habitación. */
export async function countOverlapping(tx: Tx, roomTypeCode: string, checkIn: Date, checkOut: Date, at: Date, excludeReservationId?: string) {
  return tx.reservation.count({
    where: {
      roomTypeCode,
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [{ status: { in: ACTIVE_STATUSES } }, { status: "pending_payment", holdExpiresAt: { gt: at } }],
    },
  });
}

export async function validateStay(checkInS: string, checkOutS: string, lang: string) {
  let checkIn: Date, checkOut: Date;
  try {
    checkIn = parseISODate(checkInS);
    checkOut = parseISODate(checkOutS);
  } catch {
    return { error: lang === "en" ? "Invalid dates. Use YYYY-MM-DD." : "Fechas inválidas. Usa el formato AAAA-MM-DD." };
  }
  const tz = loadHotelPack().hotel.zona_horaria;
  // Siempre el día real (no el reloj simulado): solo se reserva de hoy en adelante.
  const todayISO = hotelDateISO(realNow(), tz);
  const today = parseISODate(todayISO);
  const nights = nightsBetween(checkIn, checkOut);
  if (checkIn < today) {
    return {
      error:
        lang === "en"
          ? `Check-in date ${checkInS} is in the past. Today is ${todayISO}; only today or later dates can be booked.`
          : `La fecha de llegada ${checkInS} ya pasó. Hoy es ${todayISO}; solo se puede reservar desde hoy en adelante.`,
    };
  }
  if (nights < 1) return { error: lang === "en" ? "Check-out must be after check-in." : "La salida debe ser posterior a la llegada." };
  if (nights > 30) return { error: lang === "en" ? "Maximum stay is 30 nights." : "La estadía máxima es de 30 noches." };
  return { checkIn, checkOut, nights };
}

export async function availableRooms(checkIn: Date, checkOut: Date, guests: number) {
  await ensureSeeded();
  const at = await now();
  const pack = loadHotelPack();
  const types = await db.roomType.findMany();
  const out = [];
  for (const rt of types) {
    const def = pack.habitaciones.find((h) => h.codigo === rt.code);
    if (!def) continue;
    const used = await countOverlapping(db, rt.code, checkIn, checkOut, at);
    out.push({
      roomTypeCode: rt.code,
      maxGuests: rt.maxGuests,
      fitsGuests: guests <= rt.maxGuests,
      available: Math.max(0, rt.inventory - used),
    });
  }
  return out;
}

export async function checkAvailability(
  input: { checkIn: string; checkOut: string; guests: number; pets?: number },
  ctx: ToolContext,
): Promise<ToolResult> {
  const v = await validateStay(input.checkIn, input.checkOut, ctx.lang);
  if ("error" in v) return fail(v.error!);
  const guests = Number(input.guests) || 1;
  const pets = Number(input.pets) || 0;
  const rooms = await availableRooms(v.checkIn, v.checkOut, guests);
  const usable = rooms.filter((r) => r.fitsGuests && r.available > 0);
  return ok({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: v.nights,
    guests,
    pets,
    petPolicy: ctx.lang === "en" ? loadHotelPack().politicas.mascotas_en : loadHotelPack().politicas.mascotas,
    available: usable.map((r) => ({ roomTypeCode: r.roomTypeCode, name: roomName(r.roomTypeCode, ctx.lang), roomsLeft: r.available, maxGuests: r.maxGuests })),
    notAvailable: rooms
      .filter((r) => !r.fitsGuests || r.available === 0)
      .map((r) => ({ roomTypeCode: r.roomTypeCode, reason: !r.fitsGuests ? `max ${r.maxGuests} guests` : "sold out" })),
  });
}
