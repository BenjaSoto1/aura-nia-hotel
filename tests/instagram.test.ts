import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { classifyComment, processInstagramWebhook } from "@/lib/integrations/instagram-webhook";
import { partsToInstagram, verifyInstagramSignature } from "@/lib/integrations/instagram";
import { resetDb } from "./helpers";

const MY_ID = "17841400000000001";
const GUEST = "998877665544332";

/** API de Meta falsa: registra cada llamada y responde como Instagram Login. */
let calls: { method: string; path: string; body: Record<string, unknown> | null; query: Record<string, string> }[] = [];
function fakeGraph() {
  calls = [];
  vi.stubGlobal("fetch", async (input: URL | string, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/v[\d.]+\//, "");
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method: init?.method ?? "GET", path, body, query: Object.fromEntries(url.searchParams) });
    const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });
    if (path === "me") return json({ user_id: MY_ID, username: "aura.hotel" });
    if (path === GUEST) return json({ username: "viajera", name: "Ana" });
    if (path.startsWith("aWdf")) return json({ from: { id: GUEST, username: "viajera" }, message: "hola desde edit" });
    if (path.endsWith("/messages")) return json({ message_id: "m_" + calls.length });
    if (path.endsWith("/replies")) return json({ id: "c_" + calls.length });
    return json({});
  });
}

beforeEach(async () => {
  await resetDb();
  process.env.INSTAGRAM_ACCESS_TOKEN = "IGAAtest-token";
  fakeGraph();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.INSTAGRAM_APP_SECRET;
});

const dm = (mid: string, text: string, extra: Record<string, unknown> = {}) => ({
  object: "instagram",
  entry: [{ id: MY_ID, messaging: [{ sender: { id: GUEST }, recipient: { id: MY_ID }, message: { mid, text, ...extra } }] }],
});
const sent = () => calls.filter((c) => c.method === "POST" && c.path.endsWith("/messages"));

describe("Instagram real: DMs", () => {
  it("responde un DM con el cerebro de Nía y lo envía por la API (con botones rápidos)", async () => {
    const r = await processInstagramWebhook(dm("mid.1", "Hola, quiero reservar"));
    expect(r).toEqual([`dm de ${GUEST}`]);
    const out = sent();
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].path).toBe(`${MY_ID}/messages`);
    expect(out[0].body).toMatchObject({ recipient: { id: GUEST } });
    expect(out.some((c) => Array.isArray((c.body!.message as { quick_replies?: unknown[] }).quick_replies))).toBe(true);
    const conv = await db.conversation.findUniqueOrThrow({ where: { channel_channelUserId: { channel: "instagram", channelUserId: GUEST } } });
    expect(conv.displayName).toBe("@viajera");
  });

  it("un botón rápido llega como buttonId y no se procesa dos veces el mismo evento", async () => {
    await processInstagramWebhook(dm("mid.2", "Hola"));
    const ev = dm("mid.3", "Reservar", { quick_reply: { payload: "menu:book" } });
    expect(await processInstagramWebhook(ev)).toEqual([`dm: botón de ${GUEST}`]);
    expect(await processInstagramWebhook(ev)).toEqual(["duplicado"]);
  });

  it("acepta el formato del botón Test de Meta (mensaje dentro de changes)", async () => {
    const ev = { object: "instagram", entry: [{ id: MY_ID, changes: [{ field: "messages", value: { sender: { id: GUEST }, recipient: { id: MY_ID }, message: { mid: "test_mid", text: "hola" } } }] }] };
    expect(await processInstagramWebhook(ev)).toEqual([`dm de ${GUEST}`]);
    expect(sent().length).toBeGreaterThan(0);
  });

  it("un message_edit sin remitente recupera el mensaje y responde", async () => {
    const ev = { object: "instagram", entry: [{ id: MY_ID, messaging: [{ timestamp: 1, message_edit: { mid: "aWdfZAG1zZA123", text: "Hola, quiero reservar", num_edit: 0 } }] }] };
    expect(await processInstagramWebhook(ev)).toEqual([`dm de ${GUEST}`]);
    expect(sent().length).toBeGreaterThan(0);
  });

  it("Meta avisa el mismo mensaje dos veces (message + message_edit): Nía responde una sola vez", async () => {
    await processInstagramWebhook(dm("mid.hola", "Hola"));
    const after1 = sent().length;
    const edit = { object: "instagram", entry: [{ id: MY_ID, messaging: [{ timestamp: 1, message_edit: { mid: "aWdfOTRA", text: "Hola", num_edit: 0 } }] }] };
    expect(await processInstagramWebhook(edit)).toEqual(["duplicado (mismo mensaje)"]);
    expect(sent().length).toBe(after1);
  });

  it("un aviso sin contenido no genera respuesta (ni saludo extra)", async () => {
    const empty = { object: "instagram", entry: [{ id: MY_ID, messaging: [{ sender: { id: GUEST }, recipient: { id: MY_ID }, message: { mid: "mid.vacio" } }] }] };
    expect(await processInstagramWebhook(empty)).toEqual(["ignorado: sin contenido"]);
    expect(sent()).toHaveLength(0);
  });

  it("'Elegir' en una tarjeta de tarifa llega con la habitación y la tarifa elegidas", async () => {
    const q = await db.quote.create({ data: { roomTypeCode: "DLX_SEA", ratePlanCode: "FLEX", checkIn: new Date("2026-11-16"), checkOut: new Date("2026-11-19"), guests: 2, pets: 0, totalCents: 127203, linesJson: "[]" } });
    await processInstagramWebhook({ object: "instagram", entry: [{ id: MY_ID, messaging: [{ sender: { id: GUEST }, recipient: { id: MY_ID }, postback: { mid: "pb.pick", title: "Elegir", payload: `pick:${q.id}` } }] }] });
    const conv = await db.conversation.findUniqueOrThrow({ where: { channel_channelUserId: { channel: "instagram", channelUserId: GUEST } }, include: { messages: true } });
    expect(conv.messages.some((m) => m.partsJson.includes("Habitación Vista al Mar · Flexible"))).toBe(true);
  });

  it("ignora los ecos y los mensajes de la propia cuenta", async () => {
    const echo = dm("mid.4", "eco", { is_echo: true });
    expect((await processInstagramWebhook(echo))[0]).toMatch(/^eco/);
    expect(sent()).toHaveLength(0);
  });

  it("los mensajes del simulador (usuarios no numéricos) no se envían a Meta", async () => {
    const { postToChannel } = await import("@/lib/conversations");
    await postToChannel("instagram", "ana.viajera", [{ type: "text", text: "hola" }]);
    expect(sent()).toHaveLength(0);
  });
});

describe("Instagram real: comentarios", () => {
  const comment = (id: string, text: string, from = GUEST) => ({
    object: "instagram",
    entry: [{ id: MY_ID, changes: [{ field: "comments", value: { id, text, from: { id: from, username: "viajera" }, media: { id: "media1" } } }] }],
  });

  it("clasifica preguntas, quejas y elogios", () => {
    expect(classifyComment("¿Cuánto cuesta la suite?")).toBe("ask");
    expect(classifyComment("How much for 2 nights?")).toBe("ask");
    expect(classifyComment("Pésimo servicio")).toBe("complaint");
    expect(classifyComment("Qué lugar más lindo 😍")).toBe("thanks");
  });

  it("pregunta: respuesta pública breve + respuesta privada de Nía por DM", async () => {
    expect(await processInstagramWebhook(comment("c1", "¿Precio para 2 noches en noviembre?"))).toEqual(["comentario: ask"]);
    const pub = calls.find((c) => c.path === "c1/replies")!;
    expect(pub.query.message).toContain("@viajera");
    const priv = sent().find((c) => (c.body!.recipient as { comment_id?: string }).comment_id === "c1")!;
    expect(String((priv.body!.message as { text: string }).text).length).toBeGreaterThan(10);
    // Solo una respuesta privada (Instagram no permite más hasta que la persona conteste).
    expect(sent()).toHaveLength(1);
  });

  it("elogio: solo un gracias público; los comentarios propios se ignoran", async () => {
    expect(await processInstagramWebhook(comment("c2", "Hermoso 😍"))).toEqual(["comentario: gracias"]);
    expect(sent()).toHaveLength(0);
    expect(await processInstagramWebhook(comment("c3", "¡Gracias!", MY_ID))).toEqual(["ignorado: comentario propio"]);
  });

  it("queja: pasa a una persona del equipo", async () => {
    await processInstagramWebhook(comment("c4", "Pésima experiencia, quiero un reembolso"));
    const conv = await db.conversation.findUniqueOrThrow({ where: { channel_channelUserId: { channel: "instagram", channelUserId: GUEST } } });
    expect(conv.needsHuman).toBe(true);
  });
});

describe("Menú rápido y fotos", () => {
  it("'Ver habitaciones' manda un carrusel con foto, precio y botón; 'menú' muestra las opciones", async () => {
    process.env.APP_PUBLIC_URL = "https://hotel.example";
    await processInstagramWebhook({ object: "instagram", entry: [{ id: MY_ID, messaging: [{ sender: { id: GUEST }, recipient: { id: MY_ID }, postback: { mid: "pb1", title: "Ver habitaciones y fotos", payload: "menu:rooms" } }] }] });
    const tpl = sent().map((c) => c.body!.message as { attachment?: { type: string; payload: { elements: { image_url?: string; buttons?: { payload?: string }[] }[] } } }).find((m) => m.attachment?.type === "template")!;
    expect(tpl.attachment!.payload.elements).toHaveLength(3);
    expect(tpl.attachment!.payload.elements[0].image_url).toMatch(/^https:\/\/hotel\.example\/aura\/uploads\/images\//);
    expect(tpl.attachment!.payload.elements[0].buttons![0].payload).toMatch(/^room:/);

    calls = [];
    await processInstagramWebhook(dm("mid.menu", "menú"));
    const qr = sent().flatMap((c) => ((c.body!.message as { quick_replies?: { payload: string }[] }).quick_replies ?? []).map((q) => q.payload));
    expect(qr).toEqual(expect.arrayContaining(["menu:rooms", "menu:book", "menu:services", "menu:mine"]));
    delete process.env.APP_PUBLIC_URL;
  });
});

describe("Firma de los webhooks", () => {
  it("valida X-Hub-Signature-256 con el app secret", () => {
    process.env.INSTAGRAM_APP_SECRET = "secreto";
    const body = '{"object":"instagram"}';
    const sig = "sha256=" + crypto.createHmac("sha256", "secreto").update(body).digest("hex");
    expect(verifyInstagramSignature(body, sig)).toBe(true);
    expect(verifyInstagramSignature(body, "sha256=" + "0".repeat(64))).toBe(false);
    expect(verifyInstagramSignature(body, null)).toBe(false);
  });

  it("convierte enlaces relativos en absolutos y limita los botones a 20 caracteres", () => {
    const m = partsToInstagram([{ type: "text", text: "Hola" }, { type: "buttons", items: [{ id: "x", title: "Habitación Vista al Mar con balcón" }] }, { type: "link", url: "/checkin/abc", title: "Pre-check-in" }]);
    expect(m[1].text).toMatch(/^Pre-check-in\nhttps?:\/\//);
    expect(m[1].quick_replies![0].title.length).toBeLessThanOrEqual(20);
  });
});
