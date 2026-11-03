import { loadHotelPack, roomName } from "../hotel-pack";
import { usd } from "../money";
import type { Part } from "../types";
import { priceStay } from "./quote";
import { ok, type ToolContext, type ToolResult } from "./context";

/** Tarjetas con foto de cada habitación (sin fechas): el carrusel de "Ver habitaciones". */
export function roomCards(lang: "es" | "en"): Part {
  const pack = loadHotelPack();
  const en = lang === "en";
  return {
    type: "cards",
    items: pack.habitaciones.map((h) => {
      const from = usd(priceStay(h.codigo, "FLEX", 1, 0, lang).nightlyCents, lang);
      return {
        title: roomName(h.codigo, lang),
        subtitle: `${en ? `From ${from}/night · up to ${h.max_huespedes} guests` : `Desde ${from}/noche · hasta ${h.max_huespedes} huéspedes`}\n${(en ? h.descripcion_en : h.descripcion_es) || ""}`,
        image: h.foto,
        buttons: [{ id: `room:${h.codigo}`, title: en ? "Check dates" : "Ver fechas" }],
      };
    }),
  };
}

/** Herramienta show_rooms: el huésped quiere ver las habitaciones o sus fotos. */
export async function showRooms(_input: Record<string, never>, ctx: ToolContext): Promise<ToolResult> {
  const pack = loadHotelPack();
  return ok(
    {
      shown: "Carrusel con foto, precio desde y capacidad de cada habitación (ya lo ve el huésped: no repitas la lista).",
      rooms: pack.habitaciones.map((h) => ({ code: h.codigo, name: roomName(h.codigo, ctx.lang), maxGuests: h.max_huespedes })),
    },
    [roomCards(ctx.lang)],
  );
}
