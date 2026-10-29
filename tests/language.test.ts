import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { detectLanguage } from "@/lib/agent/language";
import { handleTurn } from "@/lib/agent/core";
import { markPaymentPaid } from "@/lib/lifecycle";
import { parseDateRange } from "@/lib/dates";
import type { Part } from "@/lib/types";
import { resetDb } from "./helpers";

beforeEach(resetDb);

const texts = (parts: Part[]) => parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");

describe("Detección de idioma por chat", () => {
  it("detecta inglés y español con mensajes cortos", () => {
    expect(detectLanguage("Hello", "es")).toBe("en");
    expect(detectLanguage("Hi, do you have rooms for two people?", "es")).toBe("en");
    expect(detectLanguage("Hola", "en")).toBe("es");
    expect(detectLanguage("¿Aceptan perros?", "en")).toBe("es");
    expect(detectLanguage("Quiero reservar una habitación", "en")).toBe("es");
  });

  it("mantiene el idioma actual cuando el mensaje no tiene señales (nombre, correo, fecha)", () => {
    expect(detectLanguage("John Smith", "en")).toBe("en");
    expect(detectLanguage("john@test.com", "en")).toBe("en");
    expect(detectLanguage("Nov 14-16", "en")).toBe("en");
    expect(detectLanguage("Camila Rojas", "es")).toBe("es");
  });

  it("entiende fechas en inglés", () => {
    expect(parseDateRange("from the 14th to the 16th of November", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-16" });
    expect(parseDateRange("Dec 30 to Jan 2", "2026-10-05")).toEqual({ checkIn: "2026-12-30", checkOut: "2027-01-02" });
    expect(parseDateRange("November 14 for 3 nights", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-17" });
  });
});

describe("Conversación completa en inglés (modo guiado)", () => {
  it("reserva en inglés y la confirmación, correo y avisos salen en inglés", async () => {
    const u = "@traveler";
    const send = (text?: string, buttonId?: string) => handleTurn({ channel: "instagram", channelUserId: u, text, buttonId });

    const hi = await send("Hello!");
    expect(texts(hi.parts)).toMatch(/How can I help/);

    const r1 = await send("I want Nov 14-16 for two people with a small dog");
    expect(texts(r1.parts)).toMatch(/options from/);
    const cards = r1.parts.find((p) => p.type === "rate_cards");
    expect(cards && cards.type === "rate_cards" && cards.items[0].label).toMatch(/Deluxe Room/);

    expect(texts((await send("the deluxe prepaid")).parts)).toMatch(/full name/);
    expect(texts((await send("John Smith")).parts)).toMatch(/Which email/);
    expect(texts((await send("john@test.com")).parts)).toMatch(/phone number/);
    const pay = await send("+1 787 555 0177");
    expect(texts(pay.parts)).toMatch(/holding your room/);

    const res = await db.reservation.findFirstOrThrow({ include: { payments: true, guest: true } });
    expect(res.guest.language).toBe("en");
    await markPaymentPaid(res.payments[0].id);

    const email = await db.emailLog.findFirstOrThrow({ where: { reservationId: res.id } });
    expect(email.subject).toMatch(/Booking confirmed/);
    expect(email.html).toMatch(/Room tax/);

    const wa = await db.conversation.findUniqueOrThrow({ where: { channel_channelUserId: { channel: "whatsapp", channelUserId: "+17875550177" } }, include: { messages: true } });
    expect(wa.messages.map((m) => m.partsJson).join(" ")).toMatch(/Payment received/);
  });

  it("si el huésped cambia a español, el agente cambia también", async () => {
    const u = "@bilingue";
    await handleTurn({ channel: "messenger", channelUserId: u, text: "Hello" });
    const r = await handleTurn({ channel: "messenger", channelUserId: u, text: "Hola, ¿cuáles son sus políticas?" });
    expect(texts(r.parts)).toMatch(/Check-in desde las/);
  });
});
