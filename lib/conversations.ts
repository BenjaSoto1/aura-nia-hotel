import { db } from "./db";
import type { Channel, Part } from "./types";
import { deliveryContext, instagramProvider, isRealIgsid, sendInstagramParts } from "./integrations/instagram";
import { pushWhatsAppOutbound, whatsappOutboundEnabled } from "./integrations/whatsapp";

export async function getOrCreateConversation(channel: Channel, channelUserId: string, displayName?: string) {
  const existing = await db.conversation.findUnique({ where: { channel_channelUserId: { channel, channelUserId } } });
  if (existing) {
    if (displayName && !existing.displayName) {
      return db.conversation.update({ where: { id: existing.id }, data: { displayName } });
    }
    return existing;
  }
  // Si ya conocemos al huésped por este canal (o por su teléfono en WhatsApp/teléfono), lo vinculamos.
  let guestId: string | undefined;
  const identity = await db.guestIdentity.findUnique({ where: { channel_channelUserId: { channel, channelUserId } } });
  if (identity) guestId = identity.guestId;
  else if (channel === "whatsapp" || channel === "phone") {
    const g = await db.guest.findFirst({ where: { phone: channelUserId } });
    if (g) guestId = g.id;
  }
  return db.conversation.upsert({
    where: { channel_channelUserId: { channel, channelUserId } },
    create: { channel, channelUserId, displayName, guestId },
    update: {},
  });
}

export async function saveMessage(opts: {
  conversationId: string;
  direction: "in" | "out";
  author: "guest" | "agent" | "staff" | "system";
  parts: Part[];
  toolCalls?: unknown;
  template?: boolean;
  /** false: solo se guarda (notas internas). Por defecto los salientes de canales reales se entregan. */
  deliver?: boolean;
}) {
  const msg = await db.message.create({
    data: {
      conversationId: opts.conversationId,
      direction: opts.direction,
      author: opts.author,
      partsJson: JSON.stringify(opts.parts),
      toolCallsJson: opts.toolCalls ? JSON.stringify(opts.toolCalls) : null,
      template: opts.template ?? false,
    },
  });
  const conv = await db.conversation.update({ where: { id: opts.conversationId }, data: { updatedAt: new Date() } });
  if (opts.direction === "out" && opts.deliver !== false) await deliver(conv, opts.parts, { author: opts.author, template: opts.template ?? false });
  return msg;
}

/** Entrega real de los salientes: Instagram (Meta) cuando la conversación es de una cuenta real. */
async function deliver(conv: { id: string; channel: string; channelUserId: string; language: string }, parts: Part[], meta: { author: string; template: boolean }) {
  const dc = deliveryContext.getStore();
  if (dc?.capture && dc.capture.channel === conv.channel && dc.capture.channelUserId === conv.channelUserId) dc.capture.parts.push(...parts);
  if (dc?.suppress) return;
  // WhatsApp (Flowy): los mensajes que Nía o el equipo envían por su cuenta se empujan al webhook de Flowy.
  // Las respuestas a un mensaje entrante NO pasan por aquí: Flowy las recibe en la respuesta del endpoint de entrada.
  if (conv.channel === "whatsapp" && whatsappOutboundEnabled() && /^\+?\d{8,15}$/.test(conv.channelUserId)) {
    try {
      await pushWhatsAppOutbound({ to: conv.channelUserId, parts, lang: conv.language === "en" ? "en" : "es", template: meta.template, author: meta.author });
    } catch (e) {
      console.error("[whatsapp] no se pudo entregar a Flowy", e);
      await saveMessage({ conversationId: conv.id, direction: "out", author: "system", deliver: false, parts: [{ type: "text", text: `⚠️ No se pudo entregar en WhatsApp: ${(e as Error).message}` }] });
    }
    return;
  }
  if (conv.channel !== "instagram" || instagramProvider() !== "meta" || !isRealIgsid(conv.channelUserId)) return;
  try {
    await sendInstagramParts(conv.channelUserId, parts, conv.language === "en" ? "en" : "es");
  } catch (e) {
    console.error("[instagram] no se pudo entregar", e);
    await saveMessage({
      conversationId: conv.id,
      direction: "out",
      author: "system",
      deliver: false,
      parts: [{ type: "text", text: `⚠️ No se pudo entregar en Instagram: ${(e as Error).message}` }],
    });
  }
}

/** Publica un mensaje saliente en la bandeja de un canal (lo crea si no existe). */
export async function postToChannel(
  channel: Channel,
  channelUserId: string,
  parts: Part[],
  opts: { author?: "agent" | "staff" | "system"; template?: boolean; toolCalls?: unknown } = {},
) {
  const conv = await getOrCreateConversation(channel, channelUserId);
  return saveMessage({
    conversationId: conv.id,
    direction: "out",
    author: opts.author ?? "agent",
    parts,
    template: opts.template,
    toolCalls: opts.toolCalls,
  });
}

/** Vincula una identidad de canal a un huésped (y la conversación correspondiente). */
export async function linkIdentity(guestId: string, channel: Channel, channelUserId: string) {
  await db.guestIdentity.upsert({
    where: { channel_channelUserId: { channel, channelUserId } },
    create: { guestId, channel, channelUserId },
    update: { guestId },
  });
  await db.conversation.updateMany({ where: { channel, channelUserId }, data: { guestId } });
}

export function partsToPlainText(parts: Part[]): string {
  return parts
    .map((p) => {
      switch (p.type) {
        case "text":
          return p.text;
        case "buttons":
          return "[Botones: " + p.items.map((b) => b.title).join(" | ") + "]";
        case "rate_cards":
          return "[Tarifas: " + p.items.map((i) => `${i.label} ${(i.totalCents / 100).toFixed(2)} USD`).join(" | ") + "]";
        case "payment_link":
          return `[Enlace de pago ${(p.amountCents / 100).toFixed(2)} USD]`;
        case "link":
          return `[Enlace: ${p.title}]`;
        case "image":
          return `[Imagen: ${p.alt}]`;
        case "cards":
          return "[Tarjetas: " + p.items.map((i) => i.title).join(" | ") + "]";
        case "reservation_summary":
          return `[Reserva ${p.reservationCode}]`;
      }
    })
    .join("\n");
}
