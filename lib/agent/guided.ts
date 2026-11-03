// Modo guiado (sin IA): máquina de estados con botones que usa las mismas herramientas.
import { now, realNow } from "../clock";
import { roomCards } from "../tools/rooms";
import { formatRange, hotelDateISO, parseCount, parseDateRange, parseISODate } from "../dates";
import { loadHotelPack, roomName, rateName } from "../hotel-pack";
import { usd } from "../money";
import { isEmail, normalizePhone, prettyPhone } from "../phone";
import { priceStay, quote } from "../tools/quote";
import { createReservation } from "../tools/reservations";
import { createPaymentLink, preauthorize } from "../tools/payments";
import { runTool } from "../tools";
import type { ToolContext } from "../tools/context";
import type { InboundMessage, Part } from "../types";
import { activeReservationFor, getState, setState, specialTurn } from "./special";
import { manageTurn, wantsToManage } from "./manage-flow";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// El orden importa: "Suite Vista al Mar" debe ganar antes que "vista al mar".
const ROOM_WORDS: [RegExp, string][] = [
  [/(suite|piscina privada|private pool)/, "STE_TER"],
  [/(vista al mar|sea view|ocean|oceano|balcon|balcony|\bmar\b|\bsea\b)/, "DLX_SEA"],
  [/(deluxe|delux|de lujo|estandar|standard|sencilla|basica)/, "STD_CITY"],
];
const RATE_WORDS: [RegExp, string][] = [
  [/(prepago|prepagada|prepaid|pagar ahora|pago ahora|descuento|discount)/, "PREPAGO"],
  [/(flex|flexible|en el hotel|at the hotel|pago al llegar|pay later)/, "FLEX"],
];

function parseGuests(t: string): number | null {
  const m = t.match(/(\d+|un|una|uno|dos|tres|cuatro|one|two|three|four)\s*(personas?|adult[oa]s?|huespedes|people|persons?|guests?|adults?|pax)/);
  if (m) return parseCount(m[1]);
  const m2 = t.match(/(?:somos|para|for|we are)\s+(\d+|dos|tres|cuatro|two|three|four)\b/);
  if (m2 && !/noche|night/.test(t.slice((m2.index ?? 0) + m2[0].length, (m2.index ?? 0) + m2[0].length + 8))) return parseCount(m2[1]);
  if (/(pareja|couple|mi esposa|mi esposo|my wife|my husband)/.test(t)) return 2;
  return null;
}

function parsePets(t: string): { pets?: number; weightKg?: number } {
  const weight = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?)/);
  const weightKg = weight ? Number(weight[1].replace(",", ".")) : undefined;
  if (/(sin (mascota|perro)|no (traigo|tengo|llevo) (mascota|perro)|no pets?|without (a )?(dog|pet)|sin mascotas)/.test(t)) return { pets: 0, weightKg };
  if (/(perr|mascota|dog|puppy|pet\b|pets\b|cachorro)/.test(t)) {
    const n = t.match(/(\d+|un|una|dos|two|one|a)\s*(perr|mascota|dog|pet)/);
    return { pets: n ? Math.min(2, parseCount(n[1]) ?? 1) || 1 : 1, weightKg };
  }
  return { weightKg };
}

const yes = (t: string) => /^(si|sí|s|yes|y|claro|ok|dale|correcto|afirmativo|sure|yep|vale|por supuesto)\b/.test(t);
const no = (t: string) => /^(no|n|nop|nope|ninguna|ninguno|none)\b/.test(t);

export async function guidedTurn(msg: InboundMessage, ctx: ToolContext): Promise<Part[]> {
  const en = ctx.lang === "en";
  const T = (es: string, e: string) => (en ? e : es);
  const pack = loadHotelPack();
  let st = await getState(ctx);
  const raw = (msg.text ?? "").trim();
  const t = norm(raw);
  const b = msg.buttonId ?? "";
  const today = hotelDateISO(realNow(), pack.hotel.zona_horaria); // fechas relativas ("mañana", "14 nov") desde el día real
  const maxKg = pack.politicas.peso_max_mascota_kg;
  const save = async (s: Record<string, any>) => {
    st = s;
    await setState(ctx, s);
  };

  const menu = (): Part => ({
    type: "buttons",
    items: [
      { id: "menu:rooms", title: T("Ver habitaciones", "See rooms") },
      { id: "menu:book", title: T("Reservar habitación", "Book a room") },
      { id: "menu:policies", title: T("Políticas y mascotas", "Policies & pets") },
      { id: "menu:services", title: T("Servicios", "Services") },
      { id: "menu:mine", title: T("Mi reserva", "My booking") },
      { id: "menu:human", title: T("Hablar con una persona", "Talk to a person") },
    ],
  });

  // ---------- Botones de menú ----------
  if (b === "menu:open") {
    return [{ type: "text", text: T(`Soy ${pack.agente.nombre}, la concierge de ${pack.hotel.nombre}. ¿En qué te ayudo?`, `I'm ${pack.agente.nombre}, ${pack.hotel.nombre}'s concierge. How can I help?`) }, menu()];
  }
  if (b === "menu:book" || b === "restart") {
    await save({ step: "ask_dates" });
    return [{ type: "text", text: T('¡Perfecto! ¿Qué fechas te interesan? Ej.: "14-16 nov" o "del 18 al 21 de diciembre".', 'Great! Which dates? E.g. "Nov 14-16" or "Dec 18 to 21".') }];
  }
  if (b === "menu:rooms") {
    return [
      { type: "text", text: T("Estas son nuestras habitaciones 🌊 Desliza para ver cada una:", "These are our rooms 🌊 Swipe to see each one:") },
      roomCards(ctx.lang),
      { type: "buttons", items: [{ id: "menu:book", title: T("Ver disponibilidad", "Check availability") }, { id: "menu:services", title: T("Experiencias", "Experiences") }] },
    ];
  }
  // "Ver fechas" desde la tarjeta de una habitación (sin cotización en curso)
  if (b.startsWith("room:") && !st.pendingRate) {
    const code = b.slice(5);
    await save({ ...st, prefRoom: code, step: "ask_dates" });
    return [{ type: "text", text: T(`¡Buena elección! ${roomName(code, "es")}. ¿Qué fechas te interesan? Ej.: "14-16 nov".`, `Great choice! ${roomName(code, "en")}. Which dates? E.g. "Nov 14-16".`) }];
  }
  if (b === "menu:mine") {
    return (await manageTurn({ ...msg, text: undefined, buttonId: "manage:start" }, ctx)) ?? [];
  }
  if (b === "menu:policies") return [policiesText(ctx), menu()];
  if (b === "menu:services") return servicesParts(ctx);
  if (b === "menu:human") {
    const r = await runTool("escalate_to_human", { reason: "Solicitado por el huésped (modo guiado)" }, ctx);
    return [{ type: "text", text: String(r.data?.say ?? "") }];
  }

  const collecting = ["ask_name", "ask_email", "ask_phone", "confirm_phone"].includes(st.step);

  // ---------- Intenciones por texto ----------
  if (raw && !collecting) {
    const pet = parsePets(t);
    if (pet.weightKg && pet.weightKg > maxKg && /(perr|dog|mascota|pet|kg|kilo)/.test(t)) {
      return [
        {
          type: "text",
          text: T(
            `Gracias por preguntar 🐾 Nuestra política acepta perros de hasta ${maxKg} kg (USD ${pack.politicas.cargo_mascota_usd} por noche), así que con ${pet.weightKg} kg lamentablemente no podríamos recibirlo. Alternativas: hay hospedajes para mascotas a pocos minutos de la casa, o puedo cotizarte la estadía sin mascota.`,
            `Thanks for asking 🐾 Our policy accepts dogs up to ${maxKg} kg (USD ${pack.politicas.cargo_mascota_usd} per night), so at ${pet.weightKg} kg we unfortunately can't host your dog. Alternatives: there are pet hotels a few minutes from the house, or I can quote your stay without a pet.`,
          ),
        },
        { type: "buttons", items: [{ id: "menu:book", title: T("Cotizar sin mascota", "Quote without pet") }, { id: "menu:policies", title: T("Ver políticas", "See policies") }] },
      ];
    }
    if (/(persona real|humano|un agente|recepcion|human|real person|representative|hablar con alguien)/.test(t)) {
      const r = await runTool("escalate_to_human", { reason: raw }, ctx);
      return [{ type: "text", text: String(r.data?.say ?? "") }];
    }
    if ((ctx.channel === "instagram" || ctx.channel === "messenger") && /whatsapp/.test(t)) {
      return (await specialTurn({ ...msg, buttonId: "handoff_wa" }, ctx)) ?? [];
    }
    const svc = /(yoga)/.test(t)
      ? "YOGA"
      : /(piedras|hot stone)/.test(t)
        ? "PIEDRAS"
        : /(masaje|massage)/.test(t)
          ? "MASAJE"
          : /(tina|bano de flores|flower bath|bath)/.test(t)
            ? "TINA"
            : /(spa|ritual|bienestar|wellness)/.test(t)
              ? "SPA"
              : /(navega|velero|barco|sail|boat)/.test(t)
                ? "SAIL"
                : /(arena|playa|sand|beach)/.test(t) && /(cena|dinner)/.test(t)
                  ? "SAND"
                  : /(coctel|cocktail|trago|drinks?)\b/.test(t)
                    ? "BAR"
                    : /(mesa|restaurante|cena|brasa|dinner|table|restaurant)/.test(t)
                      ? "REST"
                      : /(traslado|aeropuerto|transfer|airport)/.test(t)
                        ? "TRAS"
                        : null;
    if (svc && !/(precio|cuanto|how much|horario|hours)/.test(t)) {
      const res = await activeReservationFor(ctx);
      if (res) return (await specialTurn({ ...msg, text: undefined, buttonId: `svc:${svc}:${res.code}` }, ctx)) ?? [];
      return [...servicesParts(ctx).slice(0, 1), { type: "text", text: T("Para reservar servicios necesito una reserva activa. ¿Te ayudo a reservar habitación?", "To book services I need an active reservation. Shall we book a room?") }, menu()];
    }
    if (/(check.?out|salida|mi cuenta|saldo|folio|my bill|balance)/.test(t)) {
      const res = await activeReservationFor(ctx);
      if (res) return (await specialTurn({ ...msg, text: undefined, buttonId: `folio:${res.code}` }, ctx)) ?? [];
    }
    if (/(check.?in|registro)/.test(t) && !/(hora|time|a que hora|what time)/.test(t)) {
      const res = await activeReservationFor(ctx);
      if (res && res.status === "confirmed") {
        const r = await runTool("start_checkin", { reservationCode: res.code }, ctx);
        return [{ type: "text", text: T(`Tu pre-check-in de ${res.code} está listo:`, `Your pre-check-in for ${res.code} is ready:`) }, ...(r.parts ?? [])];
      }
    }
    const manage = wantsToManage(raw);
    if (manage && (!st.step || st.step === "booked" || /(reserva|booking|reservation|aur-|kr-)/.test(t))) {
      return (await manageTurn({ ...msg, text: undefined, buttonId: manage === "cancel" ? "manage:start:cancel" : "manage:start" }, ctx)) ?? [];
    }
    if (/(fotos?|imagen|photos?|pictures?|ver (las )?habitaciones|como son las habitaciones|see (the )?rooms|show (me )?(the )?rooms|your rooms)/.test(t) && !parseDateRange(raw, today)) {
      return guidedTurn({ ...msg, text: undefined, buttonId: "menu:rooms" }, ctx);
    }
    if (/(politica|cancelacion|cancel|policy|policies|hora de (llegada|salida)|what time|horario de check)/.test(t) || (/(perr|mascota|dog|pet)/.test(t) && /\?|aceptan|admiten|allow|accept|puedo/.test(t) && !parseDateRange(raw, today))) {
      return [policiesText(ctx), { type: "buttons", items: [{ id: "menu:book", title: T("Reservar", "Book") }] }];
    }
    if (/^(hola|buenas|buenos|hi|hello|hey|menu|inicio|start)\b/.test(t) && !parseDateRange(raw, today) && !st.step) {
      return [
        {
          type: "text",
          text: T(
            `Hola, soy ${pack.agente.nombre}, la concierge digital de ${pack.hotel.nombre}. ¿Cómo puedo ayudarte a planificar tu estadía?`,
            `Hi, I'm ${pack.agente.nombre}, ${pack.hotel.nombre}'s digital concierge. How can I help you plan your stay?`,
          ),
        },
        menu(),
      ];
    }
  }

  // ---------- Elección de opción ----------
  if (b.startsWith("pick:")) {
    const opt = (st.options ?? []).find((o: any) => o.quoteId === b.slice(5)) ?? { quoteId: b.slice(5) };
    await save({ ...st, quoteId: opt.quoteId, chosen: opt, step: "ask_name" });
    return askData(ctx, st);
  }
  if (b.startsWith("room:") && st.pendingRate) {
    const opt = (st.options ?? []).find((o: any) => o.room === b.slice(5) && o.rate === st.pendingRate);
    if (opt) {
      await save({ ...st, quoteId: opt.quoteId, chosen: opt, pendingRate: undefined, step: "ask_name" });
      return askData(ctx, st);
    }
  }
  if (b === "phone:yes" && st.step === "confirm_phone") {
    await save({ ...st, phone: ctx.channelUserId });
    return finalize(ctx, st);
  }
  if (b === "phone:other" && st.step === "confirm_phone") {
    await save({ ...st, step: "ask_phone" });
    return [{ type: "text", text: T("¿Cuál es tu teléfono? (con código de país)", "What's your phone number? (with country code)") }];
  }
  if (b.startsWith("guests:")) await save({ ...st, guests: Number(b.slice(7)) });
  if (b.startsWith("pets:")) await save({ ...st, pets: Number(b.slice(5)) });

  // ---------- Recolección de datos personales ----------
  if (st.step === "ask_name" && raw) {
    if (raw.length < 3) return [{ type: "text", text: T("¿Me dices tu nombre completo?", "Could you tell me your full name?") }];
    await save({ ...st, fullName: raw.replace(/^(me llamo|soy|mi nombre es|my name is|i am|i'm)\s+/i, ""), step: "ask_email" });
    return [{ type: "text", text: T(`Gracias, ${st.fullName.split(" ")[0]}. ¿A qué correo te envío la confirmación?`, `Thanks, ${st.fullName.split(" ")[0]}. Which email should I send the confirmation to?`) }];
  }
  if (st.step === "ask_email" && raw) {
    const email = raw.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0]?.replace(/[.,;]$/, "") ?? spokenEmail(raw);
    if (!email || !isEmail(email)) return [{ type: "text", text: T("Ese correo no parece válido, ¿lo revisas?", "That email doesn't look valid, can you check it?") }];
    await save({ ...st, email: email.toLowerCase(), step: "ask_phone" });
    if (ctx.channel === "whatsapp" || ctx.channel === "phone") {
      await save({ ...st, step: "confirm_phone" });
      return [
        { type: "text", text: T(`¿Uso este número para tu reserva: ${prettyPhone(ctx.channelUserId)}?`, `Shall I use this number for your booking: ${prettyPhone(ctx.channelUserId)}?`) },
        { type: "buttons", items: [{ id: "phone:yes", title: T("Sí, este número", "Yes, this one") }, { id: "phone:other", title: T("Otro número", "Another number") }] },
      ];
    }
    return [{ type: "text", text: T("¿Y tu teléfono con código de país? Ahí te enviaremos el check-in por WhatsApp.", "And your phone number with country code? We'll send your WhatsApp check-in there.") }];
  }
  if (st.step === "confirm_phone" && raw) {
    if (yes(t)) {
      await save({ ...st, phone: ctx.channelUserId });
      return finalize(ctx, st);
    }
    const p = normalizePhone(raw);
    if (p) {
      await save({ ...st, phone: p });
      return finalize(ctx, st);
    }
    await save({ ...st, step: "ask_phone" });
    return [{ type: "text", text: T("¿Cuál es tu teléfono? (con código de país)", "What's your phone number? (with country code)") }];
  }
  if (st.step === "ask_phone" && raw) {
    const p = normalizePhone(raw);
    if (!p) return [{ type: "text", text: T("Ese teléfono no parece válido. Ej.: +1 787 555 0123", "That number doesn't look valid. E.g. +1 787 555 0123") }];
    await save({ ...st, phone: p });
    return finalize(ctx, st);
  }

  // ---------- Elección por texto (voz: "la prepago") ----------
  if (st.step === "choose" && raw) {
    const rateCode = RATE_WORDS.find(([re]) => re.test(t))?.[1];
    const roomCode = ROOM_WORDS.find(([re]) => re.test(t))?.[1];
    const opts: any[] = st.options ?? [];
    const matches = opts.filter((o) => (!rateCode || o.rate === rateCode) && (!roomCode || o.room === roomCode));
    if ((rateCode || roomCode) && matches.length === 1) {
      await save({ ...st, quoteId: matches[0].quoteId, chosen: matches[0], step: "ask_name" });
      return askData(ctx, st);
    }
    if (rateCode && !roomCode && matches.length > 1) {
      await save({ ...st, pendingRate: rateCode });
      return [
        { type: "text", text: T(`Muy bien, tarifa ${rateName(rateCode, "es")}. ¿En qué habitación?`, `Great, ${rateName(rateCode, "en")} rate. Which room?`) },
        { type: "buttons", items: [...new Set(matches.map((m) => m.room))].map((r) => ({ id: `room:${r}`, title: roomName(r, ctx.lang) })) },
      ];
    }
    if (roomCode && !rateCode && matches.length > 1) {
      return [
        { type: "text", text: T(`${roomName(roomCode, "es")}: ¿prepago con 12% de descuento (no reembolsable) o flexible pagando en el hotel?`, `${roomName(roomCode, "en")}: prepaid with 12% off (non-refundable) or flexible, paying at the hotel?`) },
        { type: "rate_cards", items: (st.cards ?? []).filter((c: any) => c.roomTypeCode === roomCode) },
      ];
    }
  }

  // ---------- Relleno de fechas, personas y mascotas ----------
  if (raw && !collecting) {
    const range = parseDateRange(raw, today);
    const g = parseGuests(t);
    const pet = parsePets(t);
    const next = { ...st };
    let touched = false;
    if (range) Object.assign(next, range), (touched = true);
    if (g) (next.guests = g), (touched = true);
    if (pet.pets != null) (next.pets = pet.pets), (touched = true);
    // respuestas cortas a la pregunta actual
    if (!touched && st.step === "ask_guests") {
      const n = parseCount(t);
      if (n) (next.guests = n), (touched = true);
    }
    if (!touched && st.step === "ask_pets") {
      if (yes(t)) (next.pets = 1), (touched = true);
      else if (no(t)) (next.pets = 0), (touched = true);
      else {
        const n = parseCount(t);
        if (n != null) (next.pets = Math.min(2, n)), (touched = true);
      }
    }
    if (touched) {
      if (!next.step || next.step === "booked") next.step = "ask_dates";
      await save(next);
    } else if (!st.step || st.step === "booked") {
      return [
        { type: "text", text: T("No estoy seguro de haber entendido 🙂 Puedo ayudarte con esto:", "I'm not sure I understood 🙂 I can help with:") },
        menu(),
      ];
    }
  }

  // Siguiente dato faltante
  if (st.step && !["choose", "ask_name", "ask_email", "ask_phone", "confirm_phone", "booked"].includes(st.step)) {
    if (!st.checkIn) {
      await save({ ...st, step: "ask_dates" });
      return [{ type: "text", text: T('¿Qué fechas? Ej.: "14-16 nov".', 'Which dates? E.g. "Nov 14-16".') }];
    }
    if (!st.guests) {
      await save({ ...st, step: "ask_guests" });
      return [
        { type: "text", text: T(`${formatRange(parseISODate(st.checkIn), parseISODate(st.checkOut), "es")}, anotado. ¿Cuántas personas?`, `${formatRange(parseISODate(st.checkIn), parseISODate(st.checkOut), "en")}, noted. How many guests?`) },
        { type: "buttons", items: [1, 2, 3, 4].map((n) => ({ id: `guests:${n}`, title: String(n) })) },
      ];
    }
    if (st.pets == null) {
      await save({ ...st, step: "ask_pets" });
      return [
        { type: "text", text: T(`¿Viajan con mascota? Aceptamos perros de hasta ${maxKg} kg.`, `Traveling with a pet? We accept dogs up to ${maxKg} kg.`) },
        { type: "buttons", items: [{ id: "pets:0", title: T("Sin mascota", "No pet") }, { id: "pets:1", title: T("Sí, un perro", "Yes, one dog") }] },
      ];
    }
    // Todo listo: cotizar
    const q = await quote({ checkIn: st.checkIn, checkOut: st.checkOut, guests: st.guests, pets: st.pets }, ctx);
    if (!q.ok) {
      await save({ step: "ask_dates" });
      return [{ type: "text", text: `${q.error} ${T("¿Probamos otras fechas?", "Shall we try other dates?")}` }];
    }
    const cards = q.parts?.[0]?.type === "rate_cards" ? q.parts[0].items : [];
    await save({ ...st, step: "choose", options: cards.map((c) => ({ quoteId: c.quoteId, room: c.roomTypeCode, rate: c.ratePlanCode, total: c.totalCents })), cards });
    const nights = cards[0]?.nights ?? 0;
    const cheapest = Math.min(...cards.map((c) => c.totalCents));
    const extras: Part[] = [];
    if ((ctx.channel === "instagram" || ctx.channel === "messenger") && cards.length) {
      extras.push({ type: "buttons", items: [{ id: `handoff_wa:${cards.find((c) => c.roomTypeCode === "DLX_SEA")?.quoteId ?? cards[0].quoteId}`, title: T("Pasar a WhatsApp", "Continue on WhatsApp") }] });
    }
    return [
      {
        type: "text",
        text: T(
          `Para ${formatRange(parseISODate(st.checkIn), parseISODate(st.checkOut), "es")} (${nights} ${nights === 1 ? "noche" : "noches"}, ${st.guests} ${st.guests === 1 ? "persona" : "personas"}${st.pets ? `, ${st.pets} perro` : ""}) hay opciones desde ${usd(cheapest)}. ¿Cuál prefieres?`,
          `For ${formatRange(parseISODate(st.checkIn), parseISODate(st.checkOut), "en")} (${nights} ${nights === 1 ? "night" : "nights"}, ${st.guests} guests${st.pets ? `, ${st.pets} dog` : ""}) I have options from ${usd(cheapest, "en")}. Which one do you prefer?`,
        ),
      },
      ...(q.parts ?? []),
      ...extras,
    ];
  }

  if (st.step === "choose") return [{ type: "text", text: T("Toca una de las opciones o dime, por ejemplo, \"Deluxe prepago\".", 'Tap an option or tell me, e.g., "Deluxe prepaid".') }];
  if (st.step === "booked") return [{ type: "text", text: T("¿Algo más en lo que te ayude?", "Anything else I can help with?") }, menu()];
  return [{ type: "text", text: T(`¡Hola! Soy ${pack.agente.nombre} de ${pack.hotel.nombre}. ¿En qué te ayudo?`, `Hi! I'm ${pack.agente.nombre} from ${pack.hotel.nombre}. How can I help?`) }, menu()];
}

function askData(ctx: ToolContext, st: Record<string, any>): Part[] {
  const en = ctx.lang === "en";
  const c = st.chosen ?? {};
  const label = c.room ? `${roomName(c.room, ctx.lang)} · ${rateName(c.rate, ctx.lang)}` : "";
  return [{ type: "text", text: en ? `Excellent choice${label ? `: ${label}` : ""}. What's your full name?` : `¡Excelente elección${label ? `: ${label}` : ""}! ¿Me dices tu nombre completo?` }];
}

async function finalize(ctx: ToolContext, st: Record<string, any>): Promise<Part[]> {
  const en = ctx.lang === "en";
  const r = await createReservation({ quoteId: st.quoteId, fullName: st.fullName, email: st.email, phone: st.phone }, ctx);
  if (!r.ok) {
    await setState(ctx, { step: "ask_dates" });
    return [{ type: "text", text: `${r.error} ${en ? "Shall we try other dates or rooms?" : "¿Probamos otras fechas u otra habitación?"}` }];
  }
  await setState(ctx, { step: "booked", code: r.data!.reservationCode });
  if (r.data!.status === "pending_payment") {
    const link = await createPaymentLink({ reservationCode: String(r.data!.reservationCode), purpose: "prepayment" }, ctx);
    const where = ctx.channel === "phone" ? (en ? "I sent the payment link to your WhatsApp." : "Te envié el enlace de pago a tu WhatsApp.") : en ? "Pay securely here:" : "Paga de forma segura aquí:";
    return [
      { type: "text", text: en ? `I'm holding your room for 30 minutes (${r.data!.reservationCode}, total ${r.data!.total}). ${where}` : `Te guardo la habitación por 30 minutos (${r.data!.reservationCode}, total ${r.data!.total}). ${where}` },
      ...(link.parts ?? []),
    ];
  }
  if (ctx.channel === "phone") {
    // Por teléfono: confirmación + enlace de garantía al WhatsApp del huésped
    await preauthorize({ reservationCode: String(r.data!.reservationCode) }, ctx);
    return [
      {
        type: "text",
        text: en
          ? `Done! Booking ${r.data!.reservationCode} is confirmed, you pay at the hotel. I sent the confirmation and the link to leave your guarantee to your WhatsApp.`
          : `¡Listo! Tu reserva ${r.data!.reservationCode} está confirmada y pagas en el hotel. Te envié por WhatsApp la confirmación y el enlace para dejar la garantía.`,
      },
    ];
  }
  return []; // la confirmación la publica el ciclo de vida (correo + calendario + mensaje)
}

function policiesText(ctx: ToolContext): Part {
  const p = loadHotelPack();
  const en = ctx.lang === "en";
  const rates = p.tarifas.map((t) => `• ${en ? t.nombre_en ?? t.nombre : t.nombre}: ${en ? t.cancelacion_en ?? t.cancelacion : t.cancelacion}`).join("\n");
  return {
    type: "text",
    text: en
      ? `Check-in from ${p.politicas.check_in} · check-out until ${p.politicas.check_out}.\n🐾 ${p.politicas.mascotas_en ?? p.politicas.mascotas}\n${rates}`
      : `Check-in desde las ${p.politicas.check_in} · check-out hasta las ${p.politicas.check_out}.\n🐾 ${p.politicas.mascotas}\n${rates}`,
  };
}

function servicesParts(ctx: ToolContext): Part[] {
  const p = loadHotelPack();
  const en = ctx.lang === "en";
  return [
    {
      type: "text",
      text: p.servicios
        .map((s) => `• ${en ? s.nombre_en ?? s.nombre : s.nombre}${s.horario ? ` (${s.horario})` : ""}${s.precio_usd ? ` · ${usd(s.precio_usd * 100, ctx.lang)}` : ""}`)
        .join("\n"),
    },
  ];
}

/** "camila punto rojas arroba gmail punto com" → camila.rojas@gmail.com (voz). */
function spokenEmail(s: string): string | null {
  const t = norm(s)
    .replace(/\s+(arroba|at)\s+/g, "@")
    .replace(/\s+(punto|dot)\s+/g, ".")
    .replace(/\s+(guion bajo|underscore)\s+/g, "_")
    .replace(/\s+(guion|dash)\s+/g, "-")
    .replace(/\s/g, "");
  return /@/.test(t) ? t : null;
}
