import { db } from "../db";
import { loadHotelPack, rate, rateName, room, roomName } from "../hotel-pack";
import { usd } from "../money";
import type { RateCardItem } from "../types";
import { availableRooms, validateStay } from "./availability";
import { fail, ok, type ToolContext, type ToolResult } from "./context";

export interface QuoteLine {
  concept: "room" | "discount" | "pet_fee" | "tax";
  label: string;
  amountCents: number;
}

/** Cálculo puro de precio desde el Hotel Pack. Ignora cualquier precio externo. */
export function priceStay(roomTypeCode: string, ratePlanCode: string, nights: number, pets: number, lang = "es") {
  const pack = loadHotelPack();
  const plan = rate(ratePlanCode);
  room(roomTypeCode); // valida que exista
  const base = pack.tarifas.find((t) => t.precio_noche_usd)!;
  const nightly = Math.round((plan.precio_noche_usd ?? base.precio_noche_usd!)[roomTypeCode] * 100);
  const en = lang === "en";
  const lines: QuoteLine[] = [];
  const roomTotal = nightly * nights;
  lines.push({
    concept: "room",
    label: en ? `${nights} night${nights > 1 ? "s" : ""} × ${usd(nightly, lang)}` : `${nights} noche${nights > 1 ? "s" : ""} × ${usd(nightly, lang)}`,
    amountCents: roomTotal,
  });
  let roomNet = roomTotal;
  if (plan.descuento_pct) {
    const disc = Math.round((roomTotal * plan.descuento_pct) / 100);
    roomNet -= disc;
    lines.push({ concept: "discount", label: en ? `Prepaid discount −${plan.descuento_pct}%` : `Descuento prepago −${plan.descuento_pct}%`, amountCents: -disc });
  }
  if (pets > 0) {
    const fee = Math.round(pack.politicas.cargo_mascota_usd * 100) * pets * nights;
    lines.push({ concept: "pet_fee", label: en ? `Pet fee (${pets} × ${nights} nights)` : `Cargo mascota (${pets} × ${nights} noches)`, amountCents: fee });
  }
  for (const tax of pack.impuestos) {
    if (tax.sobre !== "habitacion") continue;
    lines.push({ concept: "tax", label: `${en ? tax.nombre_en ?? tax.nombre : tax.nombre} ${tax.tasa_pct}%`, amountCents: Math.round((roomNet * tax.tasa_pct) / 100) });
  }
  const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);
  return { nightlyCents: nightly, lines, totalCents };
}

export async function quote(
  input: { roomTypeCode?: string; ratePlanCode?: string; checkIn: string; checkOut: string; guests: number; pets?: number },
  ctx: ToolContext,
): Promise<ToolResult> {
  const pack = loadHotelPack();
  const v = await validateStay(input.checkIn, input.checkOut, ctx.lang);
  if ("error" in v) return fail(v.error!);
  const guests = Number(input.guests) || 1;
  const pets = Number(input.pets) || 0;
  if (pets > 2) return fail(ctx.lang === "en" ? "Maximum 2 pets per room." : "Máximo 2 mascotas por habitación.");

  const rooms = await availableRooms(v.checkIn, v.checkOut, guests);
  const roomCodes = input.roomTypeCode ? [input.roomTypeCode] : rooms.filter((r) => r.fitsGuests && r.available > 0).map((r) => r.roomTypeCode);
  const rateCodes = input.ratePlanCode ? [input.ratePlanCode] : pack.tarifas.map((t) => t.codigo);

  const quotes = [];
  const items: RateCardItem[] = [];
  for (const rc of roomCodes) {
    const info = rooms.find((r) => r.roomTypeCode === rc);
    if (!info) return fail(`Habitación desconocida: ${rc}`);
    if (!info.fitsGuests) return fail(ctx.lang === "en" ? `${roomName(rc, "en")} fits up to ${info.maxGuests} guests.` : `${roomName(rc, "es")} admite hasta ${info.maxGuests} personas.`);
    if (info.available <= 0) return fail(ctx.lang === "en" ? `${roomName(rc, "en")} is sold out for those dates.` : `No hay disponibilidad en ${roomName(rc, "es")} para esas fechas.`);
    for (const pc of rateCodes) {
      const p = priceStay(rc, pc, v.nights, pets, ctx.lang);
      const q = await db.quote.create({
        data: {
          roomTypeCode: rc,
          ratePlanCode: pc,
          checkIn: v.checkIn,
          checkOut: v.checkOut,
          guests,
          pets,
          totalCents: p.totalCents,
          linesJson: JSON.stringify(p.lines),
        },
      });
      const plan = rate(pc);
      quotes.push({
        quoteId: q.id,
        roomTypeCode: rc,
        room: roomName(rc, ctx.lang),
        ratePlanCode: pc,
        rate: rateName(pc, ctx.lang),
        paymentMode: plan.modalidad_pago,
        cancellation: ctx.lang === "en" ? plan.cancelacion_en ?? plan.cancelacion : plan.cancelacion,
        nights: v.nights,
        lines: p.lines.map((l) => ({ label: l.label, amount: usd(l.amountCents, ctx.lang) })),
        total: usd(p.totalCents, ctx.lang),
        totalCents: p.totalCents,
      });
      items.push({
        roomTypeCode: rc,
        ratePlanCode: pc,
        label: `${roomName(rc, ctx.lang)} · ${rateName(pc, ctx.lang)}`,
        totalCents: p.totalCents,
        nights: v.nights,
        quoteId: q.id,
        image: room(rc).foto,
        detail: ctx.lang === "en" ? plan.cancelacion_en ?? plan.cancelacion : plan.cancelacion,
      });
    }
  }
  if (!quotes.length) return fail(ctx.lang === "en" ? "No rooms available for those dates." : "No hay habitaciones disponibles para esas fechas.");
  return ok({ quotes, note: "Precios exactos calculados por el sistema; impuestos de prueba incluidos." }, [{ type: "rate_cards", items }]);
}
