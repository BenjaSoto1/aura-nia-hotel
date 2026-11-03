import { db } from "../db";
import { getOrCreateConversation, linkIdentity, postToChannel } from "../conversations";
import { normalizePhone } from "../phone";
import { formatRange } from "../dates";
import { rateName, roomName, loadHotelPack } from "../hotel-pack";
import { usd } from "../money";
import { CHANNEL_LABEL, type Part } from "../types";
import { fail, ok, type ToolContext, type ToolResult } from "./context";
import { checkAvailability } from "./availability";
import { quote } from "./quote";
import { cancelReservation, createReservation, getMyReservations } from "./reservations";
import { createPaymentLink, preauthorize } from "./payments";
import { bookService } from "./services";
import { checkout, getFolio } from "./folio";
import { startCheckin } from "./checkin";
import { modifyReservation } from "./manage";
import { showRooms } from "./rooms";

type JSONSchema = Record<string, unknown>;

interface ToolDef {
  name: string;
  description: string;
  input_schema: JSONSchema;
  run: (input: any, ctx: ToolContext) => Promise<ToolResult>;
}

const date = { type: "string", description: "Fecha AAAA-MM-DD" };
const code = { type: "string", description: "Código de reserva, p. ej. AUR-48213" };
const roomCodes = () => loadHotelPack().habitaciones.map((h) => h.codigo);
const rateCodes = () => loadHotelPack().tarifas.map((t) => t.codigo);
const serviceCodes = () => loadHotelPack().servicios.map((s) => s.codigo);

// ---------- Herramientas de canal ----------

async function sendToWhatsapp(input: { phone: string; text: string; reservationCode?: string }, ctx: ToolContext): Promise<ToolResult> {
  const phone = normalizePhone(String(input.phone || ""));
  if (!phone) return fail("Teléfono inválido");
  const parts: Part[] = [{ type: "text", text: String(input.text || "").slice(0, 1500) }];
  if (input.reservationCode) {
    const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() }, include: { payments: true } });
    const link = res?.payments.filter((p) => p.status === "link_sent" && p.url).sort((a, b) => +b.createdAt - +a.createdAt)[0];
    if (link) parts.push({ type: "payment_link", url: link.url!, amountCents: link.amountCents });
  }
  await postToChannel("whatsapp", phone, parts);
  const conv = await getOrCreateConversation(ctx.channel, ctx.channelUserId);
  if (conv.guestId) await linkIdentity(conv.guestId, "whatsapp", phone);
  return ok({ sent: true, phone });
}

async function escalateToHuman(input: { reason: string }, ctx: ToolContext): Promise<ToolResult> {
  await db.conversation.updateMany({
    where: { channel: ctx.channel, channelUserId: ctx.channelUserId },
    data: { mode: "staff", needsHuman: true },
  });
  return ok({ escalated: true, reason: input.reason, say: ctx.lang === "en" ? "A team member will continue shortly." : "Una persona del equipo seguirá contigo en breve." });
}

/** Instagram/Messenger → WhatsApp con la cotización cargada (vincula identidades). */
export async function handoffToWhatsapp(input: { phone: string; quoteId?: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const phone = normalizePhone(String(input.phone || ""));
  if (!phone) return fail(en ? "Invalid phone number." : "Teléfono inválido.");
  let guest = await db.guest.findFirst({ where: { phone } });
  if (!guest) guest = await db.guest.create({ data: { phone, language: ctx.lang } });
  await linkIdentity(guest.id, ctx.channel, ctx.channelUserId);
  await linkIdentity(guest.id, "whatsapp", phone);
  const wa = await getOrCreateConversation("whatsapp", phone);
  await db.conversation.update({ where: { id: wa.id }, data: { guestId: guest.id, language: ctx.lang } });

  const parts: Part[] = [
    {
      type: "text",
      text: en
        ? `Hi! This is ${loadHotelPack().agente.nombre} from ${loadHotelPack().hotel.nombre}. We continue here what you started on ${CHANNEL_LABEL[ctx.channel]} 👋`
        : `¡Hola! Soy ${loadHotelPack().agente.nombre} de ${loadHotelPack().hotel.nombre}. Seguimos aquí lo que empezaste en ${CHANNEL_LABEL[ctx.channel]} 👋`,
    },
  ];
  let state: Record<string, unknown> = {};
  if (input.quoteId) {
    const q = await db.quote.findUnique({ where: { id: input.quoteId } });
    if (q) {
      parts.push({
        type: "rate_cards",
        items: [{ roomTypeCode: q.roomTypeCode, ratePlanCode: q.ratePlanCode, label: `${roomName(q.roomTypeCode, ctx.lang)} · ${rateName(q.ratePlanCode, ctx.lang)}`, totalCents: q.totalCents, nights: Math.round((+q.checkOut - +q.checkIn) / 86_400_000), quoteId: q.id }],
      });
      parts.push({
        type: "text",
        text: en
          ? `Your quote: ${formatRange(q.checkIn, q.checkOut, "en")}, ${q.guests} guests, total ${usd(q.totalCents, "en")} (ref ${q.id.slice(-6)}). To book it, tell me your full name.`
          : `Tu cotización: ${formatRange(q.checkIn, q.checkOut, "es")}, ${q.guests} personas, total ${usd(q.totalCents)} (ref ${q.id.slice(-6)}). Para reservarla, dime tu nombre completo.`,
      });
      state = { step: "ask_name", quoteId: q.id, checkIn: q.checkIn.toISOString().slice(0, 10), checkOut: q.checkOut.toISOString().slice(0, 10), guests: q.guests, pets: q.pets, phone };
    }
  }
  await db.conversation.update({ where: { id: wa.id }, data: { stateJson: JSON.stringify(state) } });
  await postToChannel("whatsapp", phone, parts);
  return ok({ handedOff: true, phone, say: en ? "Done! I wrote to you on WhatsApp with your quote." : "¡Listo! Te escribí por WhatsApp con tu cotización." }, [
    { type: "link", url: `/canal/whatsapp?u=${encodeURIComponent(phone)}`, title: en ? "Open WhatsApp" : "Abrir WhatsApp" },
  ]);
}

// ---------- Registro ----------

export function toolDefs(): ToolDef[] {
  return [
    {
      name: "show_rooms",
      description: "Muestra al huésped las habitaciones con FOTOS, precio desde y capacidad (carrusel). Úsala cuando pida ver las habitaciones, fotos o cómo son, aunque no tenga fechas. No repitas la lista en tu texto.",
      input_schema: { type: "object", properties: {} },
      run: showRooms,
    },
    {
      name: "check_availability",
      description: "Consulta habitaciones disponibles para unas fechas y número de huéspedes. Úsala antes de cotizar.",
      input_schema: {
        type: "object",
        properties: { checkIn: date, checkOut: date, guests: { type: "integer", minimum: 1, maximum: 4 }, pets: { type: "integer", minimum: 0, maximum: 2 } },
        required: ["checkIn", "checkOut", "guests"],
      },
      run: checkAvailability,
    },
    {
      name: "quote",
      description:
        "Calcula el precio exacto. Úsala siempre antes de decir un precio. Si omites roomTypeCode y/o ratePlanCode, cotiza todas las combinaciones disponibles y las muestra como tarjetas. Devuelve quoteId por opción.",
      input_schema: {
        type: "object",
        properties: {
          roomTypeCode: { type: "string", enum: roomCodes() },
          ratePlanCode: { type: "string", enum: rateCodes() },
          checkIn: date,
          checkOut: date,
          guests: { type: "integer", minimum: 1, maximum: 4 },
          pets: { type: "integer", minimum: 0, maximum: 2 },
        },
        required: ["checkIn", "checkOut", "guests"],
      },
      run: quote,
    },
    {
      name: "create_reservation",
      description: "Crea la reserva a partir de un quoteId. Requiere nombre completo, correo y teléfono del huésped. Prepago: queda pendiente de pago 30 min. Flexible: queda confirmada.",
      input_schema: {
        type: "object",
        properties: { quoteId: { type: "string" }, fullName: { type: "string" }, email: { type: "string" }, phone: { type: "string", description: "Teléfono con código de país" } },
        required: ["quoteId", "fullName", "email", "phone"],
      },
      run: createReservation,
    },
    {
      name: "create_payment_link",
      description: "Genera el enlace de pago seguro de la pasarela de pago (nunca la nombres por marca). purpose=prepayment para tarifa prepago; balance para el saldo al salir. Nunca pidas datos de tarjeta.",
      input_schema: { type: "object", properties: { reservationCode: code, purpose: { type: "string", enum: ["prepayment", "balance"] } }, required: ["reservationCode"] },
      run: createPaymentLink,
    },
    {
      name: "preauthorize",
      description: "Genera el enlace de garantía (retención sin cobro) para reservas con pago en el hotel.",
      input_schema: { type: "object", properties: { reservationCode: code }, required: ["reservationCode"] },
      run: preauthorize,
    },
    {
      name: "get_my_reservations",
      description: "Lista las reservas del huésped de esta conversación (si ya está identificado).",
      input_schema: { type: "object", properties: {} },
      run: getMyReservations,
    },
    {
      name: "book_service",
      description: "Reserva un servicio del hotel para una reserva: mesa en Brasa (REST), navegación al atardecer (SAIL), cena en la arena (SAND), cóctel en la terraza (BAR), rituales de spa (PIEDRAS, MASAJE, TINA, YOGA, SPA) o traslado (TRAS). El día debe estar dentro de la estadía; si no dan hora se usa el horario del servicio. Si tiene precio se suma al folio y, con la reserva confirmada, le llega al huésped un correo de confirmación con invitación de calendario.",
      input_schema: {
        type: "object",
        properties: { reservationCode: code, serviceCode: { type: "string", enum: serviceCodes() }, datetime: { type: "string", description: "Fecha y hora, p. ej. 2026-11-15 18:00" }, notes: { type: "string", description: "Detalles: cantidad de personas, ocasión, preferencias" } },
        required: ["reservationCode", "serviceCode", "datetime"],
      },
      run: bookService,
    },
    {
      name: "get_folio",
      description: "Muestra consumos, pagos y saldo de una reserva.",
      input_schema: { type: "object", properties: { reservationCode: code }, required: ["reservationCode"] },
      run: getFolio,
    },
    {
      name: "start_checkin",
      description: "Inicia el pre-check-in digital: devuelve el enlace y la opción de hacerlo en el chat.",
      input_schema: { type: "object", properties: { reservationCode: code }, required: ["reservationCode"] },
      run: startCheckin,
    },
    {
      name: "checkout",
      description: "Hace el checkout: si hay saldo, genera el enlace de pago; si no, cierra, libera la garantía y envía el comprobante.",
      input_schema: { type: "object", properties: { reservationCode: code }, required: ["reservationCode"] },
      run: checkout,
    },
    {
      name: "modify_reservation",
      description:
        "Modifica una reserva: fechas, habitación, número de huéspedes o mascotas. Recalcula precio y disponibilidad, actualiza calendario y recordatorios y envía el correo de reserva modificada. Envía solo los campos que cambian. Si el huésped no está identificado en esta conversación, pide el correo con que reservó. Antes de llamar, confirma el cambio con el huésped.",
      input_schema: {
        type: "object",
        properties: {
          reservationCode: code,
          email: { type: "string", description: "Correo de la reserva (necesario si la conversación no está vinculada al huésped)" },
          checkIn: date,
          checkOut: date,
          roomTypeCode: { type: "string", enum: roomCodes() },
          guests: { type: "integer", minimum: 1, maximum: 4 },
          pets: { type: "integer", minimum: 0, maximum: 2 },
        },
        required: ["reservationCode"],
      },
      run: modifyReservation,
    },
    {
      name: "cancel_reservation",
      description:
        "Cancela una reserva aplicando la política de cancelación y envía el correo de cancelación. Antes de llamar, explica la política y pide confirmación explícita. Si el huésped no está identificado en esta conversación, pide el correo con que reservó.",
      input_schema: {
        type: "object",
        properties: { reservationCode: code, email: { type: "string", description: "Correo de la reserva (necesario si la conversación no está vinculada al huésped)" } },
        required: ["reservationCode"],
      },
      run: cancelReservation,
    },
    {
      name: "send_to_whatsapp",
      description: "Envía un mensaje (y opcionalmente el último enlace de pago de una reserva) al WhatsApp del huésped. Útil en llamadas de voz.",
      input_schema: { type: "object", properties: { phone: { type: "string" }, text: { type: "string" }, reservationCode: code }, required: ["phone", "text"] },
      run: sendToWhatsapp,
    },
    {
      name: "handoff_to_whatsapp",
      description: "Pasa la conversación de Instagram/Messenger a WhatsApp con la cotización cargada. Requiere el teléfono del huésped.",
      input_schema: { type: "object", properties: { phone: { type: "string" }, quoteId: { type: "string" } }, required: ["phone"] },
      run: handoffToWhatsapp,
    },
    {
      name: "escalate_to_human",
      description: "Pasa la conversación a una persona del equipo (si el huésped lo pide o está molesto).",
      input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
      run: escalateToHuman,
    },
  ];
}

export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const def = toolDefs().find((t) => t.name === name);
  if (!def) return fail(`Herramienta desconocida: ${name}`);
  try {
    return await def.run((input ?? {}) as never, ctx);
  } catch (e) {
    console.error(`[tool ${name}]`, e);
    return fail(`Error interno en ${name}: ${(e as Error).message}`);
  }
}

export function anthropicTools() {
  return toolDefs().map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}
