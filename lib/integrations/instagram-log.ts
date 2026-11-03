// Bitácora de los webhooks de Instagram (últimos 30): para ver en el panel si Meta está llamando y qué pasó.
import { db } from "../db";

const KEY = "ig_webhook_log";

export interface IgLogEntry {
  at: string;
  kind: "verificación" | "evento";
  ok: boolean;
  detail: string;
}

export async function logInstagramWebhook(e: Omit<IgLogEntry, "at">) {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    const list: IgLogEntry[] = row ? JSON.parse(row.value) : [];
    list.unshift({ at: new Date().toISOString(), ...e, detail: e.detail.slice(0, 900) });
    const value = JSON.stringify(list.slice(0, 30));
    await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  } catch (err) {
    console.error("[instagram] no se pudo registrar el webhook", err);
  }
}

export async function instagramWebhookLog(): Promise<IgLogEntry[]> {
  const row = await db.setting.findUnique({ where: { key: KEY } }).catch(() => null);
  return row ? JSON.parse(row.value) : [];
}
