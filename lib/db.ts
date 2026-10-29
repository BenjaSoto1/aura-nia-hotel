import { PrismaClient } from "@prisma/client";

/**
 * URL de la base. Por defecto, la SQLite incluida en el repo (prisma/aura.db: hotel cargado, sin reservas).
 * Con DATABASE_URL se puede apuntar a otra SQLite o, cambiando el provider del esquema, a Postgres.
 */
export function databaseUrl() {
  return process.env.DATABASE_URL || "file:./aura.db";
}

export const isPostgres = () => /^postgres(ql)?:\/\//.test(databaseUrl());

const g = globalThis as unknown as { __auraPrisma?: PrismaClient };

export const db = g.__auraPrisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

g.__auraPrisma = db;
