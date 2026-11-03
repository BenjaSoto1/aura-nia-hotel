// Fechas de estadía: se guardan como medianoche UTC de la fecha calendario (semántica "solo fecha").
const DAY = 86_400_000;

export function parseISODate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) throw new Error(`Fecha inválida: ${s}`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${s}`);
  return d;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * DAY);
}

/** Desfase en minutos de la zona horaria para un instante (p. ej. -240 para Puerto Rico). */
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Convierte "2026-11-14" + "15:00" en hora local del hotel a un instante UTC. */
export function hotelLocalToUtc(dateISO: string, hhmm: string, tz: string): Date {
  const [h, mi] = hhmm.split(":").map(Number);
  const d = parseISODate(dateISO);
  const guess = new Date(d.getTime() + (h * 60 + mi) * 60_000);
  const off = tzOffsetMinutes(tz, guess);
  return new Date(guess.getTime() - off * 60_000);
}

/** Fecha calendario (ISO) del hotel para un instante. */
export function hotelDateISO(at: Date, tz: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  return p; // en-CA => YYYY-MM-DD
}

export function formatHotelDateTime(at: Date, tz: string, lang = "es") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}

// Meses siempre completos ("14–16 de octubre", "October 14–16"): se ven en chats, correos y panel.
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatRange(a: Date, b: Date, lang = "es") {
  const ma = (lang === "en" ? MONTHS_EN : MONTHS_ES)[a.getUTCMonth()];
  const mb = (lang === "en" ? MONTHS_EN : MONTHS_ES)[b.getUTCMonth()];
  if (lang === "en") {
    return ma === mb ? `${ma} ${a.getUTCDate()}–${b.getUTCDate()}` : `${ma} ${a.getUTCDate()} – ${mb} ${b.getUTCDate()}`;
  }
  return ma === mb ? `${a.getUTCDate()}–${b.getUTCDate()} de ${ma}` : `${a.getUTCDate()} de ${ma} – ${b.getUTCDate()} de ${mb}`;
}

/** "14 de octubre" / "October 14". */
export function formatDayMonth(d: Date, lang = "es") {
  const m = (lang === "en" ? MONTHS_EN : MONTHS_ES)[d.getUTCMonth()];
  return lang === "en" ? `${m} ${d.getUTCDate()}` : `${d.getUTCDate()} de ${m}`;
}

/** Fecha y hora de un servicio guardado como "2026-10-14 20:30" o "2026-10-14 · Tarde · 16:00". */
export function formatServiceWhen(s: string, lang = "es") {
  const m = /^(\d{4}-\d{2}-\d{2})\s*(?:·\s*)?(.*)$/.exec(s.trim());
  if (!m) return s;
  const rest = m[2].trim();
  return `${formatDayMonth(parseISODate(m[1]), lang)}${rest ? ` · ${rest}` : ""}`;
}

export function formatLong(d: Date, lang = "es") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatShort(d: Date, lang = "es") {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}



// ---------- Parser de rangos en lenguaje natural (modo guiado y voz) ----------

const MONTH_WORDS: Record<string, number> = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, setiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
};

const NUM_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, one: 1, a: 1,
  dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5,
  seis: 6, six: 6, siete: 7, seven: 7, ocho: 8, eight: 8, nueve: 9, nine: 9, diez: 10, ten: 10,
  catorce: 14, fourteen: 14, quince: 15, fifteen: 15, dieciseis: 16, "dieciséis": 16, sixteen: 16,
  veinte: 20, twenty: 20,
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1"); // 14th → 14
}

function resolveYear(month: number, day: number, todayISO: string): Date {
  const today = parseISODate(todayISO);
  let y = today.getUTCFullYear();
  let d = new Date(Date.UTC(y, month - 1, day));
  if (d.getTime() < today.getTime()) d = new Date(Date.UTC(++y, month - 1, day));
  return d;
}

export function parseDateRange(input: string, todayISO: string): { checkIn: string; checkOut: string } | null {
  const t = normalize(input);

  // 1) ISO: 2026-11-14 ... 2026-11-16
  const iso = t.match(/(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/);
  if (iso) return order(iso[1], iso[2]);

  const monthRe = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join("|");

  // 2) "14-16 nov", "del 14 al 16 de noviembre", "14 y 16 de nov"
  let m = t.match(new RegExp(`(\\d{1,2})\\s*(?:-|al|a|hasta el|hasta|to|until|through|y|and)\\s*(?:el\\s*|the\\s*)?(\\d{1,2})\\s*(?:de\\s*|of\\s*)?(${monthRe})\\b`));
  if (m) {
    const month = MONTH_WORDS[m[3]];
    const a = resolveYear(month, +m[1], todayISO);
    let b = new Date(Date.UTC(a.getUTCFullYear(), month - 1, +m[2]));
    if (b <= a) b = new Date(Date.UTC(a.getUTCFullYear(), month, +m[2]));
    return { checkIn: toISODate(a), checkOut: toISODate(b) };
  }

  // 3) "nov 14-16", "november 14 to 16"
  m = t.match(new RegExp(`\\b(${monthRe})\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|al|a|to|through|until)\\s*(\\d{1,2})`));
  if (m) {
    const month = MONTH_WORDS[m[1]];
    const a = resolveYear(month, +m[2], todayISO);
    const b = new Date(Date.UTC(a.getUTCFullYear(), month - 1, +m[3]));
    return { checkIn: toISODate(a), checkOut: toISODate(b) };
  }

  // 4) "14 nov - 16 dic" / "30 de noviembre al 2 de diciembre"
  m = t.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s*)?(${monthRe})\\b.*?(\\d{1,2})\\s*(?:de\\s*)?(${monthRe})\\b`));
  if (m) {
    const a = resolveYear(MONTH_WORDS[m[2]], +m[1], todayISO);
    let b = new Date(Date.UTC(a.getUTCFullYear(), MONTH_WORDS[m[4]] - 1, +m[3]));
    if (b <= a) b = new Date(Date.UTC(a.getUTCFullYear() + 1, MONTH_WORDS[m[4]] - 1, +m[3]));
    return { checkIn: toISODate(a), checkOut: toISODate(b) };
  }

  // 4b) "Dec 30 to Jan 2" (mes antes del día, en inglés)
  m = t.match(new RegExp(`\\b(${monthRe})\\s*(\\d{1,2})\\b.*?\\b(${monthRe})\\s*(\\d{1,2})\\b`));
  if (m) {
    const a = resolveYear(MONTH_WORDS[m[1]], +m[2], todayISO);
    let b = new Date(Date.UTC(a.getUTCFullYear(), MONTH_WORDS[m[3]] - 1, +m[4]));
    if (b <= a) b = new Date(Date.UTC(a.getUTCFullYear() + 1, MONTH_WORDS[m[3]] - 1, +m[4]));
    return { checkIn: toISODate(a), checkOut: toISODate(b) };
  }

  // 5) "14/11 al 16/11", "14/11-16/11"
  m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s*(?:-|al|a|to)\s*(\d{1,2})\/(\d{1,2})/);
  if (m) {
    const a = resolveYear(+m[2], +m[1], todayISO);
    let b = new Date(Date.UTC(a.getUTCFullYear(), +m[4] - 1, +m[3]));
    if (b <= a) b = new Date(Date.UTC(a.getUTCFullYear() + 1, +m[4] - 1, +m[3]));
    return { checkIn: toISODate(a), checkOut: toISODate(b) };
  }

  // 6) "14 de noviembre, 2 noches" / "nov 14 for 3 nights"
  const single =
    t.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s*)?(${monthRe})\\b`)) ??
    t.match(new RegExp(`\\b(${monthRe})\\s*(\\d{1,2})`));
  const nightsM = t.match(/(\d+|\w+)\s*(?:noches|noche|nights|night)/);
  if (single && nightsM) {
    const [day, month] = /^\d/.test(single[1]) ? [+single[1], MONTH_WORDS[single[2]]] : [+single[2], MONTH_WORDS[single[1]]];
    const n = /^\d+$/.test(nightsM[1]) ? +nightsM[1] : NUM_WORDS[nightsM[1]];
    if (n) {
      const a = resolveYear(month, day, todayISO);
      return { checkIn: toISODate(a), checkOut: toISODate(addDays(a, n)) };
    }
  }
  return null;
}

/**
 * Día y hora de un servicio en texto libre ("2026-11-21 20:30", "15 nov 19:00", "mañana 7pm", "tonight 8:30 pm").
 * Sin día → `defaultDate`; sin hora → null (quien llama usa el horario del servicio).
 */
export function parseServiceWhen(input: string, todayISO: string, defaultDate: string): { date: string; time: string | null } {
  const t = normalize(input);
  let date: string | null = null;
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const monthRe = Object.keys(MONTH_WORDS).sort((a, b) => b.length - a.length).join("|");
  if (iso) date = iso[1];
  else {
    const dm = t.match(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s*)?(${monthRe})\\b`)) ?? t.match(new RegExp(`\\b(${monthRe})\\s*(\\d{1,2})\\b`));
    const slash = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    if (dm) {
      const [day, month] = /^\d/.test(dm[1]) ? [+dm[1], MONTH_WORDS[dm[2]]] : [+dm[2], MONTH_WORDS[dm[1]]];
      date = toISODate(resolveYear(month, day, todayISO));
    } else if (slash) date = toISODate(resolveYear(+slash[2], +slash[1], todayISO));
    else if (/\b(pasado manana|day after tomorrow)\b/.test(t)) date = toISODate(addDays(parseISODate(todayISO), 2));
    else if (/\b(manana|tomorrow)\b/.test(t) && !/\b(en|por|de) la manana\b/.test(t)) date = toISODate(addDays(parseISODate(todayISO), 1));
    else if (/\b(hoy|today|esta noche|tonight|esta tarde|this evening)\b/.test(t)) date = todayISO;
  }
  // Hora: 20:30, 20.30, 20h, 8pm, 8:30 pm, "a las 8 de la noche"
  let time: string | null = null;
  const hm = t.match(/\b(\d{1,2})[:.h](\d{2})\s*(am|pm|a\.?m\.?|p\.?m\.?)?/) ?? t.match(/\b(\d{1,2})\s*(am|pm|a\.?m\.?|p\.?m\.?|h|hrs)\b/);
  const lasM = !hm ? t.match(/\ba las (\d{1,2})\b/) : null;
  if (hm || lasM) {
    let h = +(hm ? hm[1] : lasM![1]);
    const min = hm && /^\d{2}$/.test(hm[2] ?? "") ? +hm[2] : 0;
    const suffix = (hm && (hm[3] ?? (/^\d{2}$/.test(hm[2] ?? "") ? "" : hm[2]))) || "";
    if (/^p/.test(suffix) && h < 12) h += 12;
    if (/^a/.test(suffix) && h === 12) h = 0;
    if (!suffix && h >= 1 && h <= 11 && /\b(noche|tarde|night|evening|pm)\b/.test(t)) h += 12;
    if (h <= 23 && min <= 59) time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return { date: date ?? defaultDate, time };
}

function order(a: string, b: string) {
  return a <= b ? { checkIn: a, checkOut: b } : { checkIn: b, checkOut: a };
}

/** Extrae un número de personas/mascotas de texto libre: "2", "dos personas", "two". */
export function parseCount(input: string): number | null {
  const t = normalize(input);
  const d = t.match(/\d+/);
  if (d) return Number(d[0]);
  for (const w of t.split(/\W+/)) if (NUM_WORDS[w] != null && w !== "a") return NUM_WORDS[w];
  return null;
}
