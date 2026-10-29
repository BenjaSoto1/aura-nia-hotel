import { PrismaClient } from "@prisma/client";
import { loadHotelPack } from "../lib/hotel-pack";

export async function seed(db = new PrismaClient()) {
  const pack = loadHotelPack();
  for (const h of pack.habitaciones) {
    await db.roomType.upsert({
      where: { code: h.codigo },
      create: { code: h.codigo, nameEs: h.nombre_es, nameEn: h.nombre_en, maxGuests: h.max_huespedes, inventory: h.inventario },
      update: { nameEs: h.nombre_es, nameEn: h.nombre_en, maxGuests: h.max_huespedes, inventory: h.inventario },
    });
  }
  await db.setting.upsert({ where: { key: "clock_offset_ms" }, create: { key: "clock_offset_ms", value: "0" }, update: { value: "0" } });
  return pack;
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts");
if (isMain) {
  const db = new PrismaClient();
  seed(db)
    .then((pack) => console.log(`Seed listo: ${pack.hotel.nombre} · ${pack.habitaciones.length} tipos de habitación`))
    .finally(() => db.$disconnect());
}
