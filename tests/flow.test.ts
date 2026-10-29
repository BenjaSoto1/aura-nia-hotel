import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { handleTurn } from "@/lib/agent/core";
import { markPaymentPaid } from "@/lib/lifecycle";
import { setOffsetMs } from "@/lib/clock";
import { processDueReminders } from "@/lib/jobs/reminders";
import type { Part } from "@/lib/types";
import { resetDb } from "./helpers";

beforeEach(resetDb);

const PHONE = "+17875550123";
const wa = (text?: string, buttonId?: string, attachment?: boolean) =>
  handleTurn({ channel: "whatsapp", channelUserId: PHONE, text, buttonId, attachment: attachment ? { kind: "image", dataUrl: "data:image/png;base64,AA" } : undefined });

const texts = (parts: Part[]) => parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");

async function waMessages() {
  const conv = await db.conversation.findUniqueOrThrow({ where: { channel_channelUserId: { channel: "whatsapp", channelUserId: PHONE } }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  return conv.messages.map((m) => ({ ...m, parts: JSON.parse(m.partsJson) as Part[] }));
}

describe("Flujo guiado de punta a punta por WhatsApp", () => {
  it("reserva prepago, paga, confirma, recordatorio, check-in en chat, spa, saldo y checkout", async () => {
    await wa("Hola");
    const r1 = await wa("quiero del 14 al 16 de noviembre para dos personas y un perro pequeño");
    const cards = r1.parts.find((p) => p.type === "rate_cards");
    expect(cards).toBeTruthy();
    const r2 = await wa("la vista al mar prepago");
    expect(texts(r2.parts)).toMatch(/nombre/);
    await wa("Camila Rojas");
    const r3 = await wa("camila@test.com");
    expect(texts(r3.parts)).toMatch(/número/);
    const r4 = await wa(undefined, "phone:yes");
    const link = r4.parts.find((p) => p.type === "payment_link");
    expect(link).toBeTruthy();

    const res = await db.reservation.findFirstOrThrow({ include: { payments: true } });
    expect(res.status).toBe("pending_payment");
    expect(res.pets).toBe(1);
    await markPaymentPaid(res.payments[0].id);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: res.id } })).status).toBe("confirmed");
    expect(texts((await waMessages()).flatMap((m) => m.parts))).toMatch(/Pago recibido/);

    // Viaje en el tiempo: 24 h antes del check-in
    const pre = await db.scheduledReminder.findFirstOrThrow({ where: { reservationId: res.id, kind: "precheckin" } });
    await setOffsetMs(pre.runAt.getTime() - Date.now() + 1000);
    await processDueReminders();
    const reminder = (await waMessages()).filter((m) => m.template);
    expect(reminder.length).toBeGreaterThan(0);

    // Check-in en el chat
    await wa(undefined, `checkin_start:${res.code}`);
    await wa(undefined, `checkin_consent:${res.code}`);
    await wa(undefined, undefined, true);
    await wa(undefined, `checkin_sign:${res.code}`);
    const after = await db.reservation.findUniqueOrThrow({ where: { id: res.id } });
    expect(after.status).toBe("precheckin_done");
    expect(after.roomNumber).toBe("412");

    // Spa al folio
    await wa("quiero reservar el spa");
    await wa("15 nov 10:00");
    const folio = await db.folioLine.findMany({ where: { reservationId: res.id, concept: "service" } });
    expect(folio).toHaveLength(1);

    // Día de salida: saldo = spa
    const co = await db.scheduledReminder.findFirstOrThrow({ where: { reservationId: res.id, kind: "checkout_notice" } });
    await setOffsetMs(co.runAt.getTime() - Date.now() + 1000);
    await processDueReminders();
    const pay = await wa(undefined, `pay_balance:${res.code}`);
    const balanceLink = pay.parts.find((p) => p.type === "payment_link");
    expect(balanceLink && balanceLink.type === "payment_link" && balanceLink.amountCents).toBe(12000);
    const bal = await db.payment.findFirstOrThrow({ where: { reservationId: res.id, kind: "balance" } });
    await markPaymentPaid(bal.id);
    const done = await db.reservation.findUniqueOrThrow({ where: { id: res.id }, include: { emails: true } });
    expect(done.status).toBe("checked_out");
    expect(done.emails.map((e) => e.kind)).toEqual(expect.arrayContaining(["confirmation", "precheckin", "receipt"]));
  });

  it("un mensaje con tarjeta se guarda enmascarado y no se repite", async () => {
    const r = await wa("mi tarjeta es 4242 4242 4242 4242");
    const msgs = await waMessages();
    const stored = msgs.map((m) => m.partsJson).join(" ");
    expect(stored).not.toContain("4242 4242");
    expect(stored).toContain("[TARJETA OCULTA]");
    expect(texts(r.parts)).not.toContain("4242");
  });

  it("Instagram: perro de 12 kg se rechaza según la política", async () => {
    const r = await handleTurn({ channel: "instagram", channelUserId: "@viajera", text: "¿aceptan perros de 12 kg?" });
    expect(texts(r.parts)).toMatch(/10 kg/);
  });

  it("staff toma el control y el agente se calla", async () => {
    await wa("Hola");
    await db.conversation.updateMany({ data: { mode: "staff" } });
    const r = await wa("¿hay alguien?");
    expect(r.parts).toHaveLength(0);
  });
});
