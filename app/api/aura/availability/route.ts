import { NextResponse } from "next/server";
import { loadHotelPack, roomName } from "@/lib/hotel-pack";
import { availableRooms, validateStay } from "@/lib/tools/availability";
import { priceStay } from "@/lib/tools/quote";

export const dynamic = "force-dynamic";

/**
 * Disponibilidad y precios reales para el buscador del sitio de Aura (Llegada / Salida / Huéspedes)
 * y para el panel de reserva de Nía Mode. Solo lectura: no crea cotizaciones ni bloquea inventario.
 *   GET /api/aura/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2&lang=es
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "en" ? "en" : "es";
  const checkIn = url.searchParams.get("checkIn") ?? "";
  const checkOut = url.searchParams.get("checkOut") ?? "";
  const guests = Math.min(4, Math.max(1, Number(url.searchParams.get("guests")) || 2));

  const v = await validateStay(checkIn, checkOut, lang);
  if ("error" in v) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const pack = loadHotelPack();
  const rooms = await availableRooms(v.checkIn!, v.checkOut!, guests);
  const rateCodes = pack.tarifas.map((t) => t.codigo);

  return NextResponse.json({
    ok: true,
    checkIn,
    checkOut,
    guests,
    nights: v.nights,
    rooms: rooms.map((r) => {
      const prices = Object.fromEntries(
        rateCodes.map((rc) => {
          const p = priceStay(r.roomTypeCode, rc, v.nights!, 0, lang);
          return [rc, { totalCents: p.totalCents, nightlyCents: p.nightlyCents }];
        }),
      );
      return {
        roomTypeCode: r.roomTypeCode,
        name: roomName(r.roomTypeCode, lang),
        roomsLeft: r.available,
        maxGuests: r.maxGuests,
        fitsGuests: r.fitsGuests,
        available: r.fitsGuests && r.available > 0,
        prices,
      };
    }),
    // Experiencias con precio del Hotel Pack (la mesa en Brasa no tiene cargo por reservarla).
    services: Object.fromEntries(pack.servicios.map((s) => [s.codigo, Math.round((s.precio_usd ?? 0) * 100)])),
  });
}
