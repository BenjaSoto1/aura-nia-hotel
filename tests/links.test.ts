import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { quote } from "@/lib/tools/quote";
import { createReservation } from "@/lib/tools/reservations";
import { renderReservationEmail } from "@/lib/tools/email";
import { handleTurn } from "@/lib/agent/core";
import { manageLinkSignature } from "@/lib/manage-link";
import { POST as manageLinkPOST } from "@/app/api/aura/manage-link/route";
import type { Part } from "@/lib/types";
import { ctx, futureRange, resetDb } from "./helpers";

beforeEach(resetDb);

const texts = (parts: Part[]) => parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");
const buttons = (parts: Part[]) => parts.flatMap((p) => (p.type === "buttons" ? p.items.map((i) => i.id) : []));

async function book() {
  const q = await quote({ ...futureRange(30, 2), guests: 2, roomTypeCode: "DLX_SEA", ratePlanCode: "FLEX" }, ctx());
  const quoteId = (q.data!.quotes as { quoteId: string }[])[0].quoteId;
  const r = await createReservation({ quoteId, fullName: "Camila Rojas", email: "camila@test.com", phone: "+17875550123" }, ctx());
  return db.reservation.findUniqueOrThrow({ where: { code: String(r.data!.reservationCode) } });
}

describe("Botón 'Modificar o cancelar' del correo", () => {
  it("lleva al chat del sitio con un enlace firmado (no a WhatsApp)", async () => {
    const res = await book();
    const m = await renderReservationEmail(res.id, "confirmation");
    expect(m.html).toContain(`/?reserva=${res.code}&amp;k=${manageLinkSignature(res.code)}`);
  });

  it("el enlace vincula la sesión web y Nía muestra las opciones de esa reserva", async () => {
    const res = await book();
    const call = (body: object) => manageLinkPOST(new Request("http://x/api/aura/manage-link", { method: "POST", body: JSON.stringify(body) }));
    expect((await call({ sessionId: "web-link01", code: res.code, k: "0".repeat(20) })).status).toBe(403);
    const ok = await (await call({ sessionId: "web-link01", code: res.code, k: manageLinkSignature(res.code) })).json();
    expect(ok.ok).toBe(true);
    const r = await handleTurn({ channel: "web", channelUserId: "web-link01", buttonId: `manage:open:${res.code}`, buttonTitle: `Gestionar ${res.code}` });
    expect(buttons(r.parts)).toEqual(expect.arrayContaining([`manage:dates:${res.code}`, `manage:cancel:${res.code}`]));
  });
});

describe("Pedir una persona no deja el chat mudo", () => {
  it("avisa que recepción responderá y con 'Seguir con Nía' (o un botón del menú) Nía retoma", async () => {
    const c = { channel: "web" as const, channelUserId: "web-human1" };
    await handleTurn({ ...c, text: "hola" });
    await db.conversation.updateMany({ where: { channelUserId: "web-human1" }, data: { mode: "staff", needsHuman: true } });
    const wait = await handleTurn({ ...c, text: "¿hay alguien?" });
    expect(texts(wait.parts)).toMatch(/recepción/);
    expect(buttons(wait.parts)).toContain("nia:resume");
    expect((await handleTurn({ ...c, text: "¿hola?" })).parts).toHaveLength(0); // no repite el aviso
    const back = await handleTurn({ ...c, buttonId: "nia:resume", buttonTitle: "Seguir con Nía" });
    expect(buttons(back.parts)).toContain("menu:book");
    const conv = await db.conversation.findFirstOrThrow({ where: { channelUserId: "web-human1" } });
    expect(conv.mode).toBe("agent");
  });

  it("si una persona del equipo ya tomó la conversación, Nía no interviene", async () => {
    const c = { channel: "web" as const, channelUserId: "web-human2" };
    await handleTurn({ ...c, text: "hola" });
    await db.conversation.updateMany({ where: { channelUserId: "web-human2" }, data: { mode: "staff", needsHuman: false } });
    expect((await handleTurn({ ...c, buttonId: "menu:book", buttonTitle: "Reservar" })).parts).toHaveLength(0);
  });
});
