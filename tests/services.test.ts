import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quote } from "@/lib/tools/quote";
import { createReservation } from "@/lib/tools/reservations";
import { bookService, designExtraToService } from "@/lib/tools/services";
import { renderReservationEmail } from "@/lib/tools/email";
import { parseServiceWhen } from "@/lib/dates";
import { POST as servicePOST } from "@/app/api/aura/service/route";
import { ctx, futureRange, resetDb } from "./helpers";

beforeEach(resetDb);

async function book(rateCode = "FLEX", c = ctx()) {
  const q = await quote({ ...futureRange(20, 3), guests: 2, roomTypeCode: "DLX_SEA", ratePlanCode: rateCode }, c);
  const quoteId = (q.data!.quotes as { quoteId: string }[])[0].quoteId;
  const r = await createReservation({ quoteId, fullName: "Camila Rojas", email: "camila@test.com", phone: "+17875550123" }, c);
  expect(r.ok).toBe(true);
  return db.reservation.findUniqueOrThrow({ where: { code: String(r.data!.reservationCode) } });
}

describe("Día y hora de un servicio en texto libre", () => {
  it("entiende fechas y horas en español e inglés", () => {
    expect(parseServiceWhen("2026-11-21 20:30", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-11-21", time: "20:30" });
    expect(parseServiceWhen("15 nov 19:00", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-11-15", time: "19:00" });
    expect(parseServiceWhen("Nov 15 at 7:30 pm", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-11-15", time: "19:30" });
    expect(parseServiceWhen("mañana a las 8 de la noche", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-10-13", time: "20:00" });
    expect(parseServiceWhen("tonight", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-10-12", time: null });
    expect(parseServiceWhen("a las 9", "2026-10-12", "2026-11-20")).toEqual({ date: "2026-11-20", time: "09:00" });
  });
});

describe("Servicios del hotel", () => {
  it("reserva la navegación: folio, día dentro de la estadía y correo con invitación", async () => {
    const res = await book();
    const day = res.checkIn.toISOString().slice(0, 10);
    const r = await bookService({ reservationCode: res.code, serviceCode: "SAIL", datetime: day }, ctx());
    expect(r.ok).toBe(true);
    expect(r.data!.datetime).toBe(`${day} 17:15`); // sin hora → horario del servicio
    expect(r.data!.emailSentTo).toBe("camila@test.com");
    const after = await db.reservation.findUniqueOrThrow({ where: { id: res.id }, include: { folioLines: true, emails: true } });
    expect(after.folioLines.some((l) => l.concept === "service" && l.amountCents === 14000)).toBe(true);
    const mail = after.emails.find((e) => e.kind === "service")!;
    expect(mail.refId).toBe(r.data!.serviceBookingId);
    expect(mail.subject).toContain("Navegación al atardecer");
    expect(mail.html).toContain("17:15");
  });

  it("rechaza días fuera de la estadía", async () => {
    const res = await book();
    const r = await bookService({ reservationCode: res.code, serviceCode: "REST", datetime: "2020-01-01 20:00" }, ctx());
    expect(r.ok).toBe(false);
  });

  it("con pago pendiente no manda correo propio (va en la confirmación)", async () => {
    const res = await book("PREPAGO");
    const day = res.checkIn.toISOString().slice(0, 10);
    const r = await bookService({ reservationCode: res.code, serviceCode: "SAND", datetime: `${day} 18:00` }, ctx());
    expect(r.ok).toBe(true);
    expect(r.data!.emailSentTo).toBeNull();
    expect(await db.emailLog.count({ where: { reservationId: res.id, kind: "service" } })).toBe(0);
  });

  it("el correo de servicio sale en inglés para huéspedes en inglés", async () => {
    const res = await book();
    await db.guest.update({ where: { id: res.guestId }, data: { language: "en" } });
    const day = res.checkIn.toISOString().slice(0, 10);
    const r = await bookService({ reservationCode: res.code, serviceCode: "YOGA", datetime: `${day} 6:30am` }, ctx(), { notify: false });
    const m = await renderReservationEmail(res.id, "service", { serviceBookingId: String(r.data!.serviceBookingId) });
    expect(m.subject).toContain("Sunrise yoga");
    expect(m.html).toContain("Experience confirmed");
  });

  it("las experiencias del sitio se traducen a servicios con día y hora", () => {
    const stay = { checkIn: new Date("2026-11-21T00:00:00Z"), checkOut: new Date("2026-11-23T00:00:00Z") };
    expect(designExtraToService({ kind: "dinner", hora: "20:30" }, stay, "2026-10-12")).toMatchObject({ serviceCode: "REST", datetime: "2026-11-21 20:30" });
    expect(designExtraToService({ kind: "sunset", sun: "sand" }, stay, "2026-10-12")).toMatchObject({ serviceCode: "SAND", datetime: "2026-11-21 18:00" });
    // Yoga al amanecer: antes del check-in → el día siguiente
    expect(designExtraToService({ kind: "spa", ritual: "yoga", slot: "Amanecer · 6:30" }, stay, "2026-10-12")).toMatchObject({ serviceCode: "YOGA", datetime: "2026-11-22 06:30" });
    expect(designExtraToService({ kind: "spa", ritual: "masaje", slot: "Tarde · 16:00" }, stay, "2026-10-12")).toMatchObject({ serviceCode: "MASAJE", datetime: "2026-11-21 16:00" });
  });

  it("el sitio reserva la experiencia en la estadía de la sesión, o pide reservar primero", async () => {
    const call = (body: object) => servicePOST(new Request("http://x/api/aura/service", { method: "POST", body: JSON.stringify(body) })).then((r) => r.json());
    const none = await call({ sessionId: "web-nadie", kind: "dinner", hora: "20:30" });
    expect(none.needsStay).toBe(true);

    const c = ctx({ channel: "web", channelUserId: "web-test01" });
    const res = await book("FLEX", c);
    const ok = await call({ sessionId: c.channelUserId, code: res.code, kind: "sunset", sun: "sail" });
    expect(ok.ok).toBe(true);
    expect(ok.say).toContain("camila@test.com");
    expect(await db.serviceBooking.count({ where: { reservationId: res.id, serviceCode: "SAIL" } })).toBe(1);
  });
});
