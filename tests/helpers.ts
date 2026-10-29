import { db } from "@/lib/db";
import { seed } from "@/prisma/seed";
import type { ToolContext } from "@/lib/tools/context";

export async function resetDb() {
  const tables = [
    "ScheduledReminder",
    "ReservationEvent",
    "EmailLog",
    "ServiceBooking",
    "FolioLine",
    "Payment",
    "Reservation",
    "Quote",
    "Message",
    "Conversation",
    "GuestIdentity",
    "Guest",
    "RoomType",
    "Setting",
  ];
  for (const t of tables) await db.$executeRawUnsafe(`DELETE FROM "${t}"`);
  await seed(db);
}

export const ctx = (over: Partial<ToolContext> = {}): ToolContext => ({ channel: "whatsapp", channelUserId: "+17875550123", lang: "es", ...over });

/** Fechas futuras fijas relativas a hoy para que los tests no caduquen. */
export function futureRange(startInDays: number, nights: number) {
  const a = new Date();
  a.setUTCHours(0, 0, 0, 0);
  a.setUTCDate(a.getUTCDate() + startInDays);
  const b = new Date(a);
  b.setUTCDate(b.getUTCDate() + nights);
  return { checkIn: a.toISOString().slice(0, 10), checkOut: b.toISOString().slice(0, 10) };
}
