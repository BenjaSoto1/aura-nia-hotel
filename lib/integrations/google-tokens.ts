import fs from "node:fs";
import path from "node:path";
import { db } from "../db";

/**
 * Tokens OAuth de Google. Orden de búsqueda:
 * 1. GOOGLE_REFRESH_TOKEN (variable de entorno; útil en Netlify si no quieres pasar por /api/google/auth)
 * 2. Base de datos (tabla Setting, clave "google_tokens") — lo que guarda /api/google/callback
 * 3. .data/google-token.json (instalaciones locales anteriores)
 * En Netlify el disco es efímero, por eso el callback guarda en la base.
 */
const KEY = "google_tokens";
const LEGACY_FILE = path.join(process.cwd(), ".data", "google-token.json");

export type GoogleTokens = { refresh_token?: string | null; access_token?: string | null; expiry_date?: number | null; scope?: string; token_type?: string | null; id_token?: string | null };

export async function loadGoogleTokens(): Promise<GoogleTokens | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) return { refresh_token: process.env.GOOGLE_REFRESH_TOKEN };
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    if (row) return JSON.parse(row.value) as GoogleTokens;
  } catch {
    /* base no disponible: seguimos con el archivo */
  }
  try {
    if (fs.existsSync(LEGACY_FILE)) return JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8")) as GoogleTokens;
  } catch {
    /* noop */
  }
  return null;
}

export async function saveGoogleTokens(tokens: GoogleTokens) {
  const prev = (await loadGoogleTokens()) ?? {};
  // Google solo envía refresh_token en la primera autorización: no lo perdemos al refrescar.
  const merged = { ...prev, ...tokens, refresh_token: tokens.refresh_token ?? prev.refresh_token ?? null };
  const value = JSON.stringify(merged);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return merged;
}

export async function hasGoogleTokens() {
  const t = await loadGoogleTokens();
  return Boolean(t?.refresh_token || t?.access_token);
}
