/** Normaliza un teléfono a E.164. Asume +1 (Puerto Rico / EE. UU.) si vienen 10 dígitos. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return "+" + digits;
}

export function prettyPhone(e164: string) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+1 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

/**
 * Correo escrito o dictado ("benja punto soto arroba gmail punto com") → "benja.soto@gmail.com".
 * Si ya es un correo válido se devuelve tal cual (en minúsculas).
 */
export function normalizeEmail(input: string): string {
  const raw = input.trim().toLowerCase();
  const compact = raw.replace(/\s+/g, "");
  if (isEmail(compact)) return compact;
  const s = ` ${raw} `
    .replace(/\s+(arroba|at)\s+/g, "@")
    .replace(/\s+(punto|dot)\s+/g, ".")
    .replace(/\s+(guion bajo|guión bajo|underscore)\s+/g, "_")
    .replace(/\s+(guion|guión|dash|hyphen)\s+/g, "-")
    .replace(/\s+/g, "");
  return s;
}
