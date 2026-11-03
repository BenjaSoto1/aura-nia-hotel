import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quote } from "@/lib/tools/quote";
import { createReservation } from "@/lib/tools/reservations";
import { cancelReservation, modifyReservation } from "@/lib/tools/manage";
import { renderReservationEmail } from "@/lib/tools/email";
import { handleTurn } from "@/lib/agent/core";
import { formatRange, parseISODate } from "@/lib/dates";
import type { Part } from "@/lib/types";
import { ctx, futureRange, resetDb } from "./helpers";

beforeEach(resetDb);

const PHONE = "+17875550123";
const texts = (parts: Part[]) => parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");
const buttons = (parts: Part[]) => parts.flatMap((p) => (p.type === "buttons" ? p.items.map((i) => i.id) : []));

async function book(room = "DLX_SEA", rateCode = "FLEX", range = futureRange(30, 2), c = ctx()) {
  const q = await quote({ ...range, guests: 2, roomTypeCode: room, ratePlanCode: rateCode }, c);
  const quoteId = (q.data!.quotes as { quoteId: string }[])[0].quoteId;
  const r = await createReservation({ quoteId, fullName: "Camila Rojas", email: "camila@test.com", phone: PHONE }, c);
  expect(r.ok).toBe(true);
  return String(r.data!.reservationCode);
}

describe("Fechas con el mes completo", () => {
  it("formatea rangos en español e inglés sin abreviar", () => {
    expect(formatRange(parseISODate("2026-10-14"), parseISODate("2026-10-16"), "es")).toBe("14–16 de octubre");
    expect(formatRange(parseISODate("2026-12-30"), parseISODate("2027-01-02"), "es")).toBe("30 de diciembre – 2 de enero");
    expect(formatRange(parseISODate("2026-10-14"), parseISODate("2026-10-16"), "en")).toBe("October 14–16");
  });

  it("el correo usa el mes completo y fotos recortadas para correo", async () => {
    const code = await book();
    const res = await db.reservation.findUniqueOrThrow({ where: { code } });
    const r = await renderReservationEmail(res.id, "confirmation");
    const month = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][res.checkIn.getUTCMonth()];
    expect(r.html).toContain(`${res.checkIn.getUTCDate()} de ${month}`);
    expect(r.subject).toContain(month);
    expect(r.html).toContain("/aura/uploads/email/");
    expect(r.html).not.toMatch(/object-fit/);
  });
});

describe("Modificar reservas", () => {
  it("cambia fechas: recalcula total y folio, reprograma y manda el correo de modificación", async () => {
    const code = await book();
    const before = await db.reservation.findUniqueOrThrow({ where: { code } });
    const range = futureRange(40, 3);
    const r = await modifyReservation({ reservationCode: code, ...range }, ctx());
    expect(r.ok).toBe(true);
    const after = await db.reservation.findUniqueOrThrow({ where: { code }, include: { folioLines: true, emails: true, events: true } });
    expect(after.checkIn.toISOString().slice(0, 10)).toBe(range.checkIn);
    expect(after.totalCents).toBeGreaterThan(before.totalCents); // 3 noches en vez de 2
    expect(after.folioLines.filter((l) => l.concept === "room")).toHaveLength(1);
    expect(after.folioLines.reduce((s, l) => s + l.amountCents, 0)).toBe(after.totalCents);
    expect(after.emails.map((e) => e.kind)).toContain("modification");
    expect(after.events.map((e) => e.type)).toContain("modified");
  });

  it("no permite pasar a una habitación sin disponibilidad", async () => {
    const range = futureRange(50, 2);
    await book("STE_TER", "FLEX", range, ctx({ channel: "web", channelUserId: "web-a" }));
    await book("STE_TER", "FLEX", range, ctx({ channel: "web", channelUserId: "web-b" }));
    const code = await book("DLX_SEA", "FLEX", range);
    const r = await modifyReservation({ reservationCode: code, roomTypeCode: "STE_TER" }, ctx());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/disponibilidad/);
  });

  it("protege la reserva: otro canal necesita el correo correcto", async () => {
    const code = await book();
    const stranger = ctx({ channel: "instagram", channelUserId: "@otra" });
    expect((await modifyReservation({ reservationCode: code, guests: 3 }, stranger)).ok).toBe(false);
    expect((await modifyReservation({ reservationCode: code, guests: 3, email: "otro@test.com" }, stranger)).ok).toBe(false);
    expect((await modifyReservation({ reservationCode: code, guests: 3, email: "camila@test.com" }, stranger)).ok).toBe(true);
  });

  it("con menos de 48 h a la llegada deriva a recepción", async () => {
    const code = await book("DLX_SEA", "FLEX", futureRange(1, 2));
    const r = await modifyReservation({ reservationCode: code, guests: 3 }, ctx());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/48 h/);
  });
});

describe("Cancelar reservas", () => {
  it("cancela, aplica la política y manda el correo de cancelación", async () => {
    const code = await book();
    const r = await cancelReservation({ reservationCode: code }, ctx());
    expect(r.ok).toBe(true);
    const res = await db.reservation.findUniqueOrThrow({ where: { code }, include: { emails: true } });
    expect(res.status).toBe("cancelled");
    expect(res.emails.find((e) => e.kind === "cancellation")?.subject).toMatch(/Reserva cancelada/);
  });
});

describe("Flujo guiado por WhatsApp", () => {
  const wa = (text?: string, buttonId?: string) => handleTurn({ channel: "whatsapp", channelUserId: PHONE, text, buttonId });

  it("modifica fechas y luego cancela con botones", async () => {
    const code = await book();
    const open = await wa("quiero modificar mi reserva");
    expect(texts(open.parts)).toContain(code);
    expect(buttons(open.parts)).toContain(`manage:dates:${code}`);

    await wa(undefined, `manage:dates:${code}`);
    const changed = await wa("del 2 al 5 de diciembre");
    expect(texts(changed.parts)).toMatch(/Actualicé tu reserva/);
    expect(texts(changed.parts)).toMatch(/diciembre/);

    const ask = await wa("quiero cancelar mi reserva");
    expect(buttons(ask.parts)).toContain(`manage:cancelyes:${code}`);
    const done = await wa(undefined, `manage:cancelyes:${code}`);
    expect(texts(done.parts)).toMatch(/cancelé tu reserva/);
    expect((await db.reservation.findUniqueOrThrow({ where: { code } })).status).toBe("cancelled");
  });

  it("si la conversación no está vinculada, pide código y correo", async () => {
    const code = await book();
    const ig = (text: string) => handleTurn({ channel: "instagram", channelUserId: "@viajera", text });
    const first = await ig("necesito cambiar mi reserva");
    expect(texts(first.parts)).toMatch(/código/);
    const opened = await ig(`${code} camila@test.com`);
    expect(buttons(opened.parts)).toContain(`manage:room:${code}`);
  });
});
