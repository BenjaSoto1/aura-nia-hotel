import { db } from "./db";
import { loadHotelPack } from "./hotel-pack";

/**
 * En Netlify las tablas las crea la migración (netlify/database/migrations) y no hay paso de seed:
 * la primera consulta de cada instancia sincroniza los tipos de habitación con el Hotel Pack.
 * A diferencia de prisma/seed.ts, no toca el reloj (el viaje en el tiempo sobrevive a los arranques).
 */
let done: Promise<void> | null = null;

export function ensureSeeded() {
  done ??= (async () => {
    for (const h of loadHotelPack().habitaciones) {
      const data = { nameEs: h.nombre_es, nameEn: h.nombre_en, maxGuests: h.max_huespedes, inventory: h.inventario };
      await db.roomType.upsert({ where: { code: h.codigo }, create: { code: h.codigo, ...data }, update: data });
    }
  })().catch((e) => {
    done = null; // reintenta en la próxima consulta
    throw e;
  });
  return done;
}
