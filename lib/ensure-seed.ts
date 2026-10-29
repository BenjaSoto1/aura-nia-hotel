import { db } from "./db";
import { loadHotelPack } from "./hotel-pack";

/**
 * La primera consulta de cada proceso sincroniza los tipos de habitación con el Hotel Pack
 * (si cambias hotel-pack.yaml no hace falta volver a correr el seed).
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
