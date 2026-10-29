export function usd(cents: number, lang = "es") {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "es-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Para voz: "USD 1.234" sin símbolos raros. */
export function usdSpoken(cents: number, lang = "es") {
  const n = Math.round(cents / 100);
  return lang === "en" ? `${n} dollars` : `${n} dólares`;
}
