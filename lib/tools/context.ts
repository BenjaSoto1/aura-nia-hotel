import type { Channel, Part } from "../types";

export interface ToolContext {
  channel: Channel;
  channelUserId: string;
  conversationId?: string;
  lang: "es" | "en";
}

export interface ToolResult {
  ok: boolean;
  /** Datos para el modelo (JSON). */
  data?: Record<string, unknown>;
  /** Mensaje de error legible (el modelo debe explicarlo al huésped). */
  error?: string;
  /** Partes visuales sugeridas que el core agrega a la respuesta. */
  parts?: Part[];
}

export class ToolError extends Error {}

export const ok = (data: Record<string, unknown>, parts?: Part[]): ToolResult => ({ ok: true, data, parts });
export const fail = (error: string): ToolResult => ({ ok: false, error });

// Mutex simple en proceso: serializa operaciones que tocan inventario.
const g = globalThis as unknown as { __auraLock?: Promise<unknown> };
export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__auraLock ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  g.__auraLock = prev.then(() => next);
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
  }
}
