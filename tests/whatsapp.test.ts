import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { partsToWhatsApp } from "@/lib/integrations/whatsapp";
import { POST as inboundPOST } from "@/app/api/integrations/whatsapp/inbound/route";
import { postToChannel } from "@/lib/conversations";
import { resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
  process.env.WHATSAPP_INTEGRATION_KEY = "clave-flowy";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.WHATSAPP_INTEGRATION_KEY;
  delete process.env.WHATSAPP_OUTBOUND_WEBHOOK_URL;
  delete process.env.WHATSAPP_OUTBOUND_SECRET;
});

const call = (body: object, key = "clave-flowy") =>
  inboundPOST(new Request("http://x/api/integrations/whatsapp/inbound", { method: "POST", headers: { "x-aura-key": key }, body: JSON.stringify(body) }));

describe("Formato WhatsApp Cloud API", () => {
  it("texto + hasta 3 botones → un mensaje interactivo de botones", () => {
    const m = partsToWhatsApp([{ type: "text", text: "¿Qué tarifa prefieres?" }, { type: "buttons", items: [{ id: "a", title: "Flexible" }, { id: "b", title: "Prepago" }] }]);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ type: "interactive", interactive: { type: "button", body: { text: "¿Qué tarifa prefieres?" } } });
  });

  it("más de 3 botones → lista; tarifas → lista con pick:<quoteId>; pago → botón cta_url", () => {
    const m = partsToWhatsApp([
      { type: "text", text: "Menú" },
      { type: "buttons", items: ["1", "2", "3", "4", "5"].map((i) => ({ id: `m${i}`, title: `Opción ${i}` })) },
      { type: "rate_cards", items: [{ roomTypeCode: "DLX_SEA", ratePlanCode: "FLEX", label: "Vista al Mar · Flexible", totalCents: 84802, nights: 2, quoteId: "q1" }] },
      { type: "payment_link", url: "/pago/simulado/x", amountCents: 74626, label: "Prepago AUR-1" },
    ]);
    expect(m.map((x) => (x.type === "interactive" ? x.interactive.type : x.type))).toEqual(["list", "list", "cta_url"]);
    expect(JSON.stringify(m[1])).toContain('"id":"pick:q1"');
    expect(JSON.stringify(m[2])).toMatch(/"url":"https?:\/\/[^"]+\/pago\/simulado\/x"/);
  });
});

describe("Endpoint de entrada para Flowy", () => {
  it("exige la clave", async () => {
    expect((await call({ from: "+56911112222", text: "Hola" }, "otra")).status).toBe(401);
  });

  it("responde con los mensajes de Nía en formato WhatsApp y no repite un mismo messageId", async () => {
    const r = await (await call({ from: "56911112222", text: "Hola", messageId: "wamid.1" })).json();
    expect(r.to).toBe("+56911112222");
    expect(r.messages.length).toBeGreaterThan(0);
    expect(r.messages.some((m: { type: string }) => m.type === "interactive")).toBe(true);
    expect((await (await call({ from: "56911112222", text: "Hola", messageId: "wamid.1" })).json()).duplicate).toBe(true);
  });

  it("un botón llega como buttonId", async () => {
    const r = await (await call({ from: "+56911112222", buttonId: "menu:book", buttonTitle: "Reservar habitación" })).json();
    expect(JSON.stringify(r.messages)).toMatch(/fechas|dates/i);
  });
});

describe("Webhook de salida (mensajes que Nía envía sola)", () => {
  it("firma el cuerpo con HMAC-SHA256 y marca si requiere plantilla", async () => {
    process.env.WHATSAPP_OUTBOUND_WEBHOOK_URL = "https://flowy.example/hook";
    process.env.WHATSAPP_OUTBOUND_SECRET = "secreto";
    const seen: { body: string; sig: string | null }[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      seen.push({ body: String(init.body), sig: new Headers(init.headers).get("x-aura-signature") });
      return new Response("ok");
    });
    await postToChannel("whatsapp", "+56911112222", [{ type: "text", text: "Mañana te esperamos" }], { template: true });
    expect(seen).toHaveLength(1);
    const body = JSON.parse(seen[0].body);
    expect(body).toMatchObject({ event: "message.outbound", to: "+56911112222", template: true });
    expect(seen[0].sig).toBe(crypto.createHmac("sha256", "secreto").update(seen[0].body).digest("hex"));
  });
});
