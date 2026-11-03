import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quote } from "@/lib/tools/quote";
import { createReservation } from "@/lib/tools/reservations";
import { modifyReservation } from "@/lib/tools/manage";
import { dashboardMetrics } from "@/lib/admin/metrics";
import { searchReservations } from "@/lib/admin/reservations";
import { adminToken, safeEqual } from "@/lib/admin/auth";
import { ctx, futureRange, resetDb } from "./helpers";

beforeEach(resetDb);

async function book(room: string, rateCode: string, range: { checkIn: string; checkOut: string }, name: string, email: string, channel: "whatsapp" | "web" = "whatsapp") {
  // Un teléfono distinto por huésped: el sistema reconoce al huésped por teléfono o correo.
  const phone = `+1787555${String(Math.abs([...email].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 10000).padStart(4, "0")}`;
  const c = ctx({ channel, channelUserId: channel === "web" ? `web-${email}` : phone });
  const q = await quote({ ...range, guests: 2, roomTypeCode: room, ratePlanCode: rateCode }, c);
  const quoteId = (q.data!.quotes as { quoteId: string }[])[0].quoteId;
  const r = await createReservation({ quoteId, fullName: name, email, phone }, c);
  return String(r.data!.reservationCode);
}

describe("Métricas del panel", () => {
  it("cuenta ingresos y reservas vendidas, excluye pendientes, y calcula ocupación", async () => {
    await book("DLX_SEA", "FLEX", futureRange(3, 2), "Ana Uno", "ana@test.com");
    await book("STD_CITY", "FLEX", futureRange(5, 3), "Beto Dos", "beto@test.com", "web");
    await book("STE_TER", "PREPAGO", futureRange(4, 2), "Caro Tres", "caro@test.com"); // queda pendiente de pago
    const m = await dashboardMetrics(30);
    const confirmed = await db.reservation.findMany({ where: { status: "confirmed" } });
    expect(m.kpis.bookings.value).toBe(2);
    expect(m.kpis.revenue.value).toBe(confirmed.reduce((s, r) => s + r.totalCents, 0));
    expect(m.byChannel.find((c) => c.channel === "web")!.count).toBe(1);
    expect(m.ops.pendingPayments).toHaveLength(1);
    expect(m.kpis.occupancyNext.soldNights).toBe(2 + 3 + 2); // la pendiente con hold vigente ocupa
    expect(m.daily).toHaveLength(30);
    expect(m.daily.reduce((s, d) => s + d.count, 0)).toBe(2);
  });
});

describe("Búsqueda de reservas", () => {
  it("encuentra por nombre sin tildes y filtra por canal", async () => {
    await book("DLX_SEA", "FLEX", futureRange(10, 2), "José Martínez", "jose@test.com");
    await book("STD_CITY", "FLEX", futureRange(12, 2), "Laura Pérez", "laura@test.com", "web");
    expect((await searchReservations({ q: "martinez" })).map((r) => r.guest.fullName)).toEqual(["José Martínez"]);
    expect(await searchReservations({ channel: "web" })).toHaveLength(1);
    expect(await searchReservations({ q: "nadie" })).toHaveLength(0);
  });
});

describe("Recepción", () => {
  it("puede modificar con menos de 48 h a la llegada (el huésped no)", async () => {
    const code = await book("DLX_SEA", "FLEX", futureRange(1, 2), "Ana Uno", "ana@test.com");
    expect((await modifyReservation({ reservationCode: code, guests: 3 }, ctx())).ok).toBe(false);
    const staff = await modifyReservation({ reservationCode: code, email: "ana@test.com", guests: 3 }, { channel: "web", channelUserId: "panel", lang: "es" }, { staff: true });
    expect(staff.ok).toBe(true);
    expect((await db.reservation.findUniqueOrThrow({ where: { code } })).adults).toBe(3);
  });
});

describe("Acceso al panel", () => {
  it("el token depende de la contraseña y se compara en tiempo constante", async () => {
    const a = await adminToken("clave-1");
    expect(a).toHaveLength(64);
    expect(safeEqual(a, await adminToken("clave-1"))).toBe(true);
    expect(safeEqual(a, await adminToken("clave-2"))).toBe(false);
  });
});

describe("Acciones de recepción (API del panel)", () => {
  it("agrega servicio, registra check-in y cierra con cobro en recepción", async () => {
    const { POST } = await import("@/app/api/panel/reservations/[id]/route");
    const code = await book("DLX_SEA", "FLEX", futureRange(0, 2), "Ana Uno", "ana@test.com");
    const res = await db.reservation.findUniqueOrThrow({ where: { code } });
    const call = async (body: Record<string, unknown>) =>
      (await POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: res.id }) })).json();

    expect((await call({ action: "service", serviceCode: "SPA", datetime: `${futureRange(0, 1).checkIn} 16:00` })).ok).toBe(true);
    const ci = await call({ action: "checkin" });
    expect(ci.ok).toBe(true);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: res.id } })).status).toBe("in_house");

    expect((await call({ action: "checkout" })).ok).toBe(false); // hay saldo: pide cobrarlo
    expect((await call({ action: "checkout", collect: true })).ok).toBe(true);
    const done = await db.reservation.findUniqueOrThrow({ where: { id: res.id }, include: { payments: true, emails: true } });
    expect(done.status).toBe("checked_out");
    expect(done.payments.some((p) => p.provider === "recepcion" && p.status === "paid")).toBe(true);
    expect(done.emails.map((e) => e.kind)).toContain("receipt");
  });
});
