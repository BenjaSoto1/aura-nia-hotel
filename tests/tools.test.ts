import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { priceStay, quote } from "@/lib/tools/quote";
import { checkAvailability } from "@/lib/tools/availability";
import { createReservation } from "@/lib/tools/reservations";
import { createPaymentLink } from "@/lib/tools/payments";
import { markPaymentPaid } from "@/lib/lifecycle";
import { maskCards } from "@/lib/agent/masking";
import { parseDateRange } from "@/lib/dates";
import { normalizeEmail } from "@/lib/phone";
import { ctx, futureRange, resetDb } from "./helpers";

beforeEach(resetDb);

describe("Hotel Pack y precios", () => {
  it("calcula prepago con descuento, mascota e impuesto", () => {
    const p = priceStay("DLX_SEA", "PREPAGO", 2, 1);
    // 389 × 2 = 778; −12% = 93.36 → 684.64; mascota 25×2 = 50; impuesto 9% de 684.64 = 61.62
    expect(p.lines.map((l) => l.amountCents)).toEqual([77800, -9336, 5000, 6162]);
    expect(p.totalCents).toBe(77800 - 9336 + 5000 + 6162);
  });

  it("flexible sin descuento", () => {
    const p = priceStay("STD_CITY", "FLEX", 3, 0);
    expect(p.totalCents).toBe(86700 + Math.round(86700 * 0.09));
  });
});

describe("Disponibilidad y cotización", () => {
  it("lista habitaciones y excluye las que no admiten tantas personas", async () => {
    const r = await checkAvailability({ ...futureRange(40, 2), guests: 3 }, ctx());
    expect(r.ok).toBe(true);
    const codes = (r.data!.available as { roomTypeCode: string }[]).map((x) => x.roomTypeCode);
    expect(codes).toContain("DLX_SEA");
    expect(codes).not.toContain("STD_CITY");
  });

  it("rechaza fechas pasadas", async () => {
    const r = await checkAvailability({ checkIn: "2020-01-01", checkOut: "2020-01-03", guests: 2 }, ctx());
    expect(r.ok).toBe(false);
  });

  it("quote sin habitación devuelve todas las combinaciones como tarjetas", async () => {
    const r = await quote({ ...futureRange(40, 2), guests: 2, pets: 0 }, ctx());
    expect(r.ok).toBe(true);
    const part = r.parts![0];
    expect(part.type).toBe("rate_cards");
    if (part.type === "rate_cards") expect(part.items).toHaveLength(6);
  });

  it("ignora precios externos: el total sale de la base", async () => {
    const r = await quote({ ...futureRange(40, 2), guests: 2, roomTypeCode: "DLX_SEA", ratePlanCode: "FLEX", totalCents: 1 } as never, ctx());
    expect((r.data!.quotes as { totalCents: number }[])[0].totalCents).toBe(priceStay("DLX_SEA", "FLEX", 2, 0).totalCents);
  });
});

describe("Reservas", () => {
  async function quoteId(room = "STE_TER", rate = "FLEX", range = futureRange(50, 2)) {
    const r = await quote({ ...range, guests: 2, roomTypeCode: room, ratePlanCode: rate }, ctx());
    return (r.data!.quotes as { quoteId: string }[])[0].quoteId;
  }

  it("dos canales a la vez por la última habitación: una gana y la otra recibe sin disponibilidad", async () => {
    const range = futureRange(60, 2);
    // Suite Terraza tiene inventario 2: tomamos una primero
    const first = await createReservation({ quoteId: await quoteId("STE_TER", "FLEX", range), fullName: "Ana Uno", email: "ana@test.com", phone: "+17875550001" }, ctx());
    expect(first.ok).toBe(true);
    const [qa, qb] = [await quoteId("STE_TER", "FLEX", range), await quoteId("STE_TER", "FLEX", range)];
    const [a, b] = await Promise.all([
      createReservation({ quoteId: qa, fullName: "Camila Rojas", email: "camila@test.com", phone: "+17875550002" }, ctx({ channel: "whatsapp", channelUserId: "+17875550002" })),
      createReservation({ quoteId: qb, fullName: "John Smith", email: "john@test.com", phone: "+17875550003" }, ctx({ channel: "instagram", channelUserId: "@john" })),
    ]);
    const oks = [a, b].filter((x) => x.ok);
    const fails = [a, b].filter((x) => !x.ok);
    expect(oks).toHaveLength(1);
    expect(fails).toHaveLength(1);
    expect(fails[0].error).toMatch(/agot/);
    expect(await db.reservation.count({ where: { roomTypeCode: "STE_TER" } })).toBe(2);
  });

  it("flexible queda confirmada, con correo y evento de calendario simulados y recordatorios", async () => {
    const r = await createReservation({ quoteId: await quoteId("STD_CITY", "FLEX"), fullName: "Camila Rojas", email: "camila@test.com", phone: "787 555 0123" }, ctx());
    expect(r.ok).toBe(true);
    expect(r.data!.status).toBe("confirmed");
    const res = await db.reservation.findUniqueOrThrow({ where: { code: String(r.data!.reservationCode) }, include: { emails: true, reminders: true, events: true } });
    expect(res.emails[0].subject).toContain("Reserva confirmada");
    expect(res.emails[0].html).toContain(res.code);
    expect(res.calendarEventId).toMatch(/^sim_/);
    expect(res.reminders.map((x) => x.kind).sort()).toEqual(["checkout_notice", "precheckin", "review"]);
  });

  it("prepago solo se confirma cuando llega el pago", async () => {
    const r = await createReservation({ quoteId: await quoteId("DLX_SEA", "PREPAGO"), fullName: "Camila Rojas", email: "camila@test.com", phone: "+17875550123" }, ctx());
    expect(r.data!.status).toBe("pending_payment");
    const link = await createPaymentLink({ reservationCode: String(r.data!.reservationCode), purpose: "prepayment" }, ctx());
    expect(link.ok).toBe(true);
    const pay = await db.payment.findFirstOrThrow({ where: { reservation: { code: String(r.data!.reservationCode) } } });
    expect(pay.url).toContain("/pago/simulado/");
    expect((await db.reservation.findUniqueOrThrow({ where: { code: String(r.data!.reservationCode) } })).status).toBe("pending_payment");
    await markPaymentPaid(pay.id);
    const res = await db.reservation.findUniqueOrThrow({ where: { code: String(r.data!.reservationCode) } });
    expect(res.status).toBe("confirmed");
  });
});

describe("Seguridad y parsing", () => {
  it("normaliza correos dictados o con espacios", () => {
    expect(normalizeEmail("camila punto rojas arroba gmail punto com")).toBe("camila.rojas@gmail.com");
    expect(normalizeEmail(" Camila.Rojas@Gmail.com ")).toBe("camila.rojas@gmail.com");
    expect(normalizeEmail("ana guion bajo b arroba test punto cl")).toBe("ana_b@test.cl");
  });

  it("no permite reservar en fechas pasadas y el error dice qué día es hoy", async () => {
    const r = await checkAvailability({ checkIn: "2020-01-01", checkOut: "2020-01-03", guests: 2 }, ctx());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Hoy es \d{4}-\d{2}-\d{2}/);
  });

  it("enmascara tarjetas válidas (Luhn) y deja otros números", () => {
    expect(maskCards("mi tarjeta es 4242 4242 4242 4242 gracias").text).toBe("mi tarjeta es [TARJETA OCULTA] gracias");
    expect(maskCards("mi teléfono es +1 787 555 0123").masked).toBe(false);
    expect(maskCards("1234 5678 9012 3456").masked).toBe(false);
  });

  it("entiende rangos de fechas en español e inglés", () => {
    expect(parseDateRange("del 14 al 16 de noviembre", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-16" });
    expect(parseDateRange("14-16 nov", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-16" });
    expect(parseDateRange("Nov 14-16", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-16" });
    expect(parseDateRange("18–21 de diciembre", "2026-10-05")).toEqual({ checkIn: "2026-12-18", checkOut: "2026-12-21" });
    expect(parseDateRange("30 de diciembre al 2 de enero", "2026-10-05")).toEqual({ checkIn: "2026-12-30", checkOut: "2027-01-02" });
    expect(parseDateRange("14 de noviembre, 3 noches", "2026-10-05")).toEqual({ checkIn: "2026-11-14", checkOut: "2026-11-17" });
  });
});
