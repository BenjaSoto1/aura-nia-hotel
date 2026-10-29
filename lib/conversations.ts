import { db } from "./db";
import type { Channel, Part } from "./types";

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
  await db.conversation.update({ where: { id: opts.conversationId }, data: { updatedAt: new Date() } });
  return msg;
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
        case "reservation_summary":
          return `[Reserva ${p.reservationCode}]`;
      }
    })
    .join("\n");
}
