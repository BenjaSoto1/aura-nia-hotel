// Build de Netlify. En local la app usa SQLite; en Netlify usa Postgres (Netlify Database).
// - Genera el cliente Prisma con provider "postgresql" (copia del esquema en prisma/.netlify).
// - Las tablas las crea Netlify con netlify/database/migrations/ (justo antes de publicar).
// - Los tipos de habitación se cargan solos en la primera consulta (lib/ensure-seed.ts).
// Si en vez de Netlify Database usas tu propia base (DATABASE_URL de Postgres), aquí se sincroniza con db push.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isPg = (u) => typeof u === "string" && /^postgres(ql)?:\/\//.test(u);

const schemaSrc = fs.readFileSync("prisma/schema.prisma", "utf8");
const dir = path.join("prisma", ".netlify");
fs.mkdirSync(dir, { recursive: true });
const schemaPath = path.join(dir, "schema.prisma");
fs.writeFileSync(schemaPath, schemaSrc.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));

// El CLI de Prisma exige una URL con el formato del provider aunque no se conecte.
const placeholder = "postgresql://build:build@localhost:5432/build";
const run = (cmd, env = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
};

run(`npx prisma generate --schema ${schemaPath}`, { DATABASE_URL: placeholder });

const external = isPg(process.env.DATABASE_URL) ? process.env.DATABASE_URL : null;
if (external) {
  run(`npx prisma db push --skip-generate --schema ${schemaPath}`, { DATABASE_URL: process.env.DIRECT_DATABASE_URL || external });
}

// Más memoria para el compilador (el límite por defecto de Node no alcanza en el contenedor de Netlify).
const nodeOptions = `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=6144`.trim();
run("npx next build", { NODE_OPTIONS: nodeOptions, ...(isPg(process.env.DATABASE_URL) ? {} : { DATABASE_URL: placeholder }) });
