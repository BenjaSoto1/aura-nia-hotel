// Acceso al panel de administración. Si ADMIN_PASSWORD está definida, /panel y /api/panel exigen sesión;
// si no (desarrollo local), el panel queda abierto. La cookie guarda un HMAC de la contraseña, nunca la contraseña.
export const ADMIN_COOKIE = "aura_admin";

export function adminAuthEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Token de sesión = HMAC-SHA256(contraseña, "aura-admin"). Web Crypto: funciona en middleware (edge) y en Node. */
export async function adminToken(password = process.env.ADMIN_PASSWORD ?? "") {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("aura-admin"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante (evita medir cuántos caracteres coinciden). */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
