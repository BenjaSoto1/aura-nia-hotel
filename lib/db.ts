import { PrismaClient } from "@prisma/client";

const isPg = (u?: string) => Boolean(u && /^postgres(ql)?:\/\//.test(u));

/**
 * URL de la base. Local: DATABASE_URL (SQLite). En Netlify: NETLIFY_DB_URL (Netlify Database, la
 * inyecta la plataforma y puede rotar) o, si prefieres una base propia, DATABASE_URL de Postgres.
 * Si hay una URL Postgres disponible gana: el .env local con SQLite nunca debe colarse en Netlify.
 */
export function databaseUrl() {
  const candidates = [process.env.NETLIFY_DB_URL, process.env.DATABASE_URL, process.env.NETLIFY_DATABASE_URL].filter(Boolean) as string[];
  const url = candidates.find(isPg) ?? candidates[0] ?? "file:./dev.db";
  // Pooler de Neon (modo transacción): Prisma necesita pgbouncer=true para no reutilizar sentencias preparadas.
  if (/-pooler\./.test(url) && !/[?&]pgbouncer=/.test(url)) return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  return url;
}

export const isPostgres = () => isPg(databaseUrl());

const g = globalThis as unknown as { __auraPrisma?: { url: string; client: PrismaClient } };

/** Cliente para la URL vigente; si la credencial cambió (rotación en Netlify), se crea uno nuevo. */
function client(): PrismaClient {
  const url = databaseUrl();
  if (g.__auraPrisma?.url !== url) {
    const old = g.__auraPrisma?.client;
    g.__auraPrisma = { url, client: new PrismaClient({ datasourceUrl: url }) };
    old?.$disconnect().catch(() => undefined);
  }
  return g.__auraPrisma.client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const c = client();
    const v = Reflect.get(c, prop, c);
    return typeof v === "function" ? v.bind(c) : v;
  },
});
