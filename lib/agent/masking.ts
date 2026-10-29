// Enmascara secuencias de 13 a 19 dígitos (con espacios o guiones) que pasan Luhn.
export const CARD_MASK = "[TARJETA OCULTA]";

export function luhn(digits: string) {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function maskCards(text: string): { text: string; masked: boolean } {
  let masked = false;
  const out = text.replace(/(?:\d[ -]?){12,18}\d/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
      masked = true;
      return CARD_MASK;
    }
    return match;
  });
  return { text: out, masked };
}
