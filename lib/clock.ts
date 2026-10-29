import { db } from "./db";

// Reloj del sistema con desplazamiento ("viaje en el tiempo"). El desplazamiento
// vive en la base para que todas las rutas y el cron vean el mismo reloj.
// Caduca solo a las 6 horas: una demo olvidada no deja el "hoy" del hotel adelantado para siempre.
const KEY = "clock_offset_ms";
const SET_AT = "clock_offset_set_at";
const OFFSET_TTL_MS = 6 * 3_600_000;

export async function getOffsetMs(): Promise<number> {
  const rows = await db.setting.findMany({ where: { key: { in: [KEY, SET_AT] } } });
  const offset = Number(rows.find((r) => r.key === KEY)?.value ?? 0);
  if (!offset) return 0;
  const setAt = Number(rows.find((r) => r.key === SET_AT)?.value ?? 0);
  if (!setAt || Date.now() - setAt > OFFSET_TTL_MS) return 0;
  return offset;
}

/** Reloj del hotel (incluye el viaje en el tiempo): recordatorios, vencimientos, check-in. */
export async function now(): Promise<Date> {
  return new Date(Date.now() + (await getOffsetMs()));
}

/** Reloj real: para decidir qué fechas se pueden reservar ("hoy" de verdad, avanza cada día). */
export function realNow(): Date {
  return new Date();
}

export async function setOffsetMs(ms: number) {
  const at = String(Date.now());
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: String(ms) }, update: { value: String(ms) } });
  await db.setting.upsert({ where: { key: SET_AT }, create: { key: SET_AT, value: at }, update: { value: at } });
}

/** Mueve el reloj para que "ahora" sea `target` (nunca hacia atrás del reloj actual simulado). */
export async function travelTo(target: Date) {
  const current = await now();
  if (target.getTime() <= current.getTime()) return current;
  await setOffsetMs(target.getTime() - Date.now());
  return target;
}
