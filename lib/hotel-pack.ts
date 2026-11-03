import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

const RoomSchema = z.object({
  codigo: z.string(),
  nombre_es: z.string(),
  nombre_en: z.string(),
  max_huespedes: z.number().int().positive(),
  inventario: z.number().int().nonnegative(),
  foto: z.string(),
  descripcion_es: z.string().default(""),
  descripcion_en: z.string().default(""),
  amenidades_es: z.string().default(""),
  amenidades_en: z.string().default(""),
});

const RateSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
  nombre_en: z.string().optional(),
  modalidad_pago: z.enum(["prepaid", "pay_at_hotel"]),
  garantia_usd: z.number().optional(),
  descuento_pct: z.number().optional(),
  cancelacion: z.string(),
  cancelacion_en: z.string().optional(),
  precio_noche_usd: z.record(z.string(), z.number()).optional(),
});

const PackSchema = z.object({
  hotel: z.object({
    nombre: z.string(),
    lema: z.string().optional(),
    ciudad: z.string(),
    zona_horaria: z.string(),
    moneda: z.string(),
    telefono: z.string(),
    correo: z.string(),
    direccion: z.string(),
    colores: z.object({
      primario: z.string(),
      oscuro: z.string(),
      arena: z.string(),
      acento: z.string(),
      fondo: z.string(),
      bruma: z.string().default("#5E7468"),
      cal: z.string().default("#FBF8F1"),
    }),
    foto_portada: z.string().optional(),
  }),
  agente: z.object({ nombre: z.string(), tono: z.string(), idiomas: z.array(z.string()) }),
  habitaciones: z.array(RoomSchema).min(1),
  tarifas: z.array(RateSchema).min(1),
  impuestos: z.array(z.object({ nombre: z.string(), nombre_en: z.string().optional(), sobre: z.string(), tasa_pct: z.number() })),
  politicas: z.object({
    check_in: z.string(),
    check_out: z.string(),
    mascotas: z.string(),
    mascotas_en: z.string().optional(),
    cargo_mascota_usd: z.number(),
    peso_max_mascota_kg: z.number(),
  }),
  servicios: z.array(
    z.object({
      codigo: z.string(),
      nombre: z.string(),
      nombre_en: z.string().optional(),
      horario: z.string().optional(),
      precio_usd: z.number().optional(),
      duracion_min: z.number().int().positive().optional(),
      sugerir: z.boolean().default(true),
      descripcion: z.string().optional(),
      foto: z.string().optional(),
    }),
  ),
  recordatorios: z.object({ precheckin_horas_antes: z.number(), aviso_checkout_hora: z.string() }),
});

export type HotelPack = z.infer<typeof PackSchema>;
export type RoomDef = z.infer<typeof RoomSchema>;
export type RateDef = z.infer<typeof RateSchema>;

let cached: HotelPack | null = null;

export function loadHotelPack(): HotelPack {
  if (cached) return cached;
  const file = path.join(process.cwd(), "hotel-pack.yaml");
  const raw = YAML.parse(fs.readFileSync(file, "utf8"));
  const parsed = PackSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("hotel-pack.yaml inválido: " + JSON.stringify(parsed.error.issues, null, 2));
  }
  const pack = parsed.data;
  // Validación cruzada: la tarifa FLEX debe tener precio para cada habitación
  const base = pack.tarifas.find((t) => t.precio_noche_usd);
  if (!base) throw new Error("hotel-pack.yaml: al menos una tarifa debe definir precio_noche_usd");
  for (const room of pack.habitaciones) {
    if (base.precio_noche_usd![room.codigo] == null) {
      throw new Error(`hotel-pack.yaml: falta precio para ${room.codigo} en ${base.codigo}`);
    }
  }
  cached = pack;
  return pack;
}

export function room(code: string): RoomDef {
  const r = loadHotelPack().habitaciones.find((h) => h.codigo === code);
  if (!r) throw new Error(`Habitación desconocida: ${code}`);
  return r;
}

export function rate(code: string): RateDef {
  const r = loadHotelPack().tarifas.find((t) => t.codigo === code);
  if (!r) throw new Error(`Tarifa desconocida: ${code}`);
  return r;
}

export function roomName(code: string, lang: string) {
  const r = room(code);
  return lang === "en" ? r.nombre_en : r.nombre_es;
}

export function rateName(code: string, lang: string) {
  const r = rate(code);
  return lang === "en" ? r.nombre_en ?? r.nombre : r.nombre;
}

export function service(code: string) {
  return loadHotelPack().servicios.find((s) => s.codigo === code);
}
