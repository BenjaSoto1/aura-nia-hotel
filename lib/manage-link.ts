// Enlace "Modificar o cancelar mi reserva" de los correos: abre el chat de Nía en el sitio con la reserva lista.
// Va firmado (HMAC del código) para que nadie pueda gestionar una reserva ajena cambiando el código del enlace.
import crypto from "node:crypto";
import { appUrl } from "./config";

function secret() {
  return process.env.MANAGE_LINK_SECRET || process.env.ADMIN_PASSWORD || process.env.INSTAGRAM_APP_SECRET || "aura-local-manage-link";
}

export function manageLinkSignature(code: string) {
  return crypto.createHmac("sha256", secret()).update(code.trim().toUpperCase()).digest("hex").slice(0, 20);
}

export function verifyManageLink(code: string, k: string) {
  const expected = manageLinkSignature(code);
  return typeof k === "string" && k.length === expected.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(expected));
}

/** https://…/?reserva=AUR-12345&k=… → el sitio abre el chat y Nía ofrece modificar o cancelar. */
export function manageLinkFor(code: string) {
  return `${appUrl()}/?reserva=${encodeURIComponent(code)}&k=${manageLinkSignature(code)}`;
}

/** Abre el chat de Nía en el sitio. */
export function chatLink() {
  return `${appUrl()}/?chat=1`;
}
