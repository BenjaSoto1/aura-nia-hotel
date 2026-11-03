import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { quote } from "@/lib/tools/quote";
import { createReservation } from "@/lib/tools/reservations";
import { createPaymentLink } from "@/lib/tools/payments";
import { bookService, designExtraToService } from "@/lib/tools/services";
import { hotelDateISO } from "@/lib/dates";
import { loadHotelPack } from "@/lib/hotel-pack";
import { now } from "@/lib/clock";
import type { ToolContext } from "@/lib/tools/context";

export const dynamic = "force-dynamic";

/**
 * Reserva desde el panel "Tu estadía, lista para confirmar" del sitio de Aura (diseño Nía Mode).
 * Usa exactamente las mismas herramientas del core que el chat y la voz: cotiza, crea la reserva,
 * suma las experiencias elegidas al folio y, con prepago, devuelve el enlace de pago seguro.
 * Los precios nunca vienen del navegador: se recalculan desde el Hotel Pack.
 */
const Body = z.object({
  sessionId: z.string().min(3).max(80),
  roomTypeCode: z.enum(["STD_CITY", "DLX_SEA", "STE_TER"]),
  ratePlanCode: z.enum(["FLEX", "PREPAGO"]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(4),
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().max(160),
  phone: z.string().trim().min(6).max(40),
  lang: z.enum(["es", "en"]).default("es"),
  extras: z
    .object({
      dinner: z.string().regex(/^\d{2}:\d{2}$/).optional(), // hora de la mesa en Brasa
      sunset: z.union([z.boolean(), z.enum(["sail", "sand", "bar"])]).optional(), // experiencia al atardecer
      spa: z.object({ ritual: z.enum(["piedras", "masaje", "tina", "yoga"]).optional(), name: z.string().max(80).optional(), slot: z.string().max(40) }).optional(),
    })
    .default({}),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Revisa los datos de la reserva (nombre, correo, teléfono y fechas)." }, { status: 400 });
  }
  const b = parsed.data;
  const ctx: ToolContext = { channel: "web", channelUserId: b.sessionId, lang: b.lang };

  const q = await quote({ roomTypeCode: b.roomTypeCode, ratePlanCode: b.ratePlanCode, checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests, pets: 0 }, ctx);
  if (!q.ok) return NextResponse.json({ ok: false, error: q.error }, { status: 409 });
  const quoteId = (q.data!.quotes as { quoteId: string }[])[0].quoteId;

  const extrasBooked: string[] = [];
  const r = await createReservation({ quoteId, fullName: b.fullName, email: b.email, phone: b.phone }, ctx, {
    // Las experiencias van al folio antes de confirmar, así salen en el correo de confirmación.
    beforeConfirm: async (code) => {
      const res = await db.reservation.findUniqueOrThrow({ where: { code } });
      const today = hotelDateISO(await now(), loadHotelPack().hotel.zona_horaria);
      const picks = [
        b.extras.dinner ? { kind: "dinner" as const, hora: b.extras.dinner } : null,
        b.extras.sunset ? { kind: "sunset" as const, sun: typeof b.extras.sunset === "string" ? b.extras.sunset : "sail" } : null,
        b.extras.spa ? { kind: "spa" as const, ritual: b.extras.spa.ritual, slot: b.extras.spa.slot } : null,
      ].filter((x) => x !== null);
      for (const x of picks) {
        // notify=false: los servicios salen en el mismo correo de confirmación de la estadía.
        const s = await bookService({ reservationCode: code, ...designExtraToService(x, res, today) }, ctx, { notify: false });
        if (s.ok) extrasBooked.push(String(s.data!.service));
      }
    },
  });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 409 });

  const code = String(r.data!.reservationCode);
  let payUrl: string | null = null;
  if (r.data!.status === "pending_payment") {
    const link = await createPaymentLink({ reservationCode: code, purpose: "prepayment" }, ctx);
    const part = link.parts?.find((p) => p.type === "payment_link");
    payUrl = part && part.type === "payment_link" ? part.url : null;
  }
  const res = await db.reservation.findUniqueOrThrow({ where: { code }, include: { guest: true, folioLines: true } });
  const totalCents = res.folioLines.reduce((s, l) => s + l.amountCents, 0);

  return NextResponse.json({
    ok: true,
    code,
    status: res.status,
    email: res.guest.email,
    totalCents,
    extras: extrasBooked,
    payUrl,
  });
}
