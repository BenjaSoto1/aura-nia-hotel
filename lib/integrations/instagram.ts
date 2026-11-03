// Instagram real (Meta Graph API): DMs y comentarios de la cuenta del hotel.
//
// Funciona con los dos tipos de token de Meta:
//  - Instagram Login ("IGAA…", recomendado): graph.instagram.com, no necesita página de Facebook.
//    Permisos: instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments.
//  - Facebook Login ("EAA…"): graph.facebook.com con el token de la página vinculada a la cuenta de Instagram.
//    Permisos: instagram_basic, instagram_manage_messages, instagram_manage_comments, pages_show_list,
//    pages_manage_metadata, business_management. Si el token es de usuario, se obtiene el de la página.
//
// Variables: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_APP_SECRET (firma de webhooks), INSTAGRAM_VERIFY_TOKEN.
import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { appUrl } from "../config";
import type { Part } from "../types";

const VERSION = process.env.INSTAGRAM_API_VERSION || "v23.0";
const MAX_TEXT = 1000; // límite de Instagram por mensaje

export function instagramToken() {
  return (process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
}

/** "meta" cuando hay token (y no se forzó el simulador con INSTAGRAM_PROVIDER=simulated). */
export function instagramProvider(): "meta" | "simulated" {
  if (process.env.INSTAGRAM_PROVIDER === "simulated") return "simulated";
  return instagramToken() ? "meta" : "simulated";
}

const isIgLogin = (t: string) => t.startsWith("IG");
const host = (t: string) => (isIgLogin(t) ? "https://graph.instagram.com" : "https://graph.facebook.com");

export class GraphError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number,
  ) {
    super(message);
  }
}

async function graph<T = Record<string, unknown>>(token: string, method: "GET" | "POST", path: string, body?: unknown, query: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${host(token)}/${VERSION}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await r.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_subcode?: number } } & T;
  if (!r.ok || data.error) throw new GraphError(data.error?.message || `HTTP ${r.status}`, data.error?.code, data.error?.error_subcode);
  return data;
}

export interface InstagramAccount {
  /** ID de la cuenta profesional de Instagram (coincide con entry.id de los webhooks). */
  igId: string;
  username: string;
  /** Token con el que se envía: el mismo (Instagram Login) o el de la página (Facebook Login). */
  sendToken: string;
  /** Facebook Login: la página vinculada (los mensajes se envían a /{pageId}/messages). */
  pageId?: string;
  login: "instagram" | "facebook";
}

let cached: { token: string; account: InstagramAccount; at: number } | null = null;

/** Descubre la cuenta de Instagram del token (con caché de 10 min). */
export async function instagramAccount(): Promise<InstagramAccount> {
  const token = instagramToken();
  if (!token) throw new GraphError("Falta INSTAGRAM_ACCESS_TOKEN");
  if (cached && cached.token === token && Date.now() - cached.at < 600_000) return cached.account;
  let account: InstagramAccount;
  if (isIgLogin(token)) {
    const me = await graph<{ user_id?: string; id: string; username: string }>(token, "GET", "me", undefined, { fields: "user_id,username" });
    account = { igId: me.user_id || me.id, username: me.username, sendToken: token, login: "instagram" };
  } else {
    // Token de página (tiene instagram_business_account) o de usuario (se busca la página en /me/accounts).
    const asPage = await graph<{ id: string; instagram_business_account?: { id: string; username?: string } }>(token, "GET", "me", undefined, {
      fields: "id,instagram_business_account{id,username}",
    }).catch(() => null);
    if (asPage?.instagram_business_account) {
      account = { igId: asPage.instagram_business_account.id, username: asPage.instagram_business_account.username ?? "", sendToken: token, pageId: asPage.id, login: "facebook" };
    } else {
      const pages = await graph<{ data: { id: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] }>(token, "GET", "me/accounts", undefined, {
        fields: "id,name,access_token,instagram_business_account{id,username}",
      });
      const page = pages.data.find((p) => p.instagram_business_account);
      if (!page) {
        throw new GraphError(
          "El token no ve ninguna página de Facebook con una cuenta de Instagram profesional vinculada. Genera un token de Instagram Login (IGAA…) o agrega los permisos pages_show_list e instagram_basic.",
        );
      }
      account = { igId: page.instagram_business_account!.id, username: page.instagram_business_account!.username ?? "", sendToken: page.access_token, pageId: page.id, login: "facebook" };
    }
  }
  cached = { token, account, at: Date.now() };
  return account;
}

// ---------------- Envío ----------------
type Recipient = { id: string } | { comment_id: string };
interface IgButton {
  type: "postback" | "web_url";
  title: string;
  payload?: string;
  url?: string;
}
interface IgElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  buttons?: IgButton[];
}
interface IgMessage {
  text?: string;
  quick_replies?: { content_type: "text"; title: string; payload: string }[];
  attachment?: { type: "image"; payload: { url: string } } | { type: "template"; payload: { template_type: "generic"; elements: IgElement[] } };
  /** Si Instagram rechaza el carrusel, se envía esto (fotos + texto). No viaja a la API. */
  fallback?: IgMessage[];
}

async function sendRaw(recipient: Recipient, message: IgMessage) {
  const acc = await instagramAccount();
  const path = acc.login === "facebook" ? `${acc.pageId}/messages` : `${acc.igId}/messages`;
  return graph<{ message_id?: string }>(acc.sendToken, "POST", path, { recipient, message, ...(acc.login === "facebook" ? { messaging_type: "RESPONSE" } : {}) });
}

const absolute = (u: string) => (/^https?:/i.test(u) ? u : `${appUrl()}${u.startsWith("/") ? "" : "/"}${u}`);
const money = (c: number) => "$" + Math.round(c / 100).toLocaleString("en-US");
const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

/** Partes del core → mensajes de Instagram (texto, botones rápidos y fotos). */
export function partsToInstagram(parts: Part[], lang: "es" | "en" = "es"): IgMessage[] {
  const out: IgMessage[] = [];
  const quick: { title: string; payload: string }[] = [];
  const text = (t: string) => {
    for (let i = 0; i < t.length; i += MAX_TEXT) out.push({ text: t.slice(i, i + MAX_TEXT) });
  };
  const publicImage = (u?: string) => {
    if (!u) return undefined;
    const url = absolute(u);
    // Instagram descarga la foto: solo sirve con una URL pública (no localhost).
    return /^https:/.test(url) && !/localhost|127\.0\.0\.1/.test(url) ? url : undefined;
  };
  /** Carrusel (plantilla genérica, hasta 10 tarjetas) con plan B: foto + texto por tarjeta. */
  const carousel = (cards: { title: string; subtitle?: string; image?: string; buttons: IgButton[] }[], fallbackText: string, fallbackQuick: { title: string; payload: string }[]) => {
    const elements = cards.slice(0, 10).map((c) => ({
      title: clip(c.title, 80),
      ...(c.subtitle ? { subtitle: clip(c.subtitle.replace(/\s*\n\s*/g, " · "), 80) } : {}),
      ...(publicImage(c.image) ? { image_url: publicImage(c.image) } : {}),
      ...(c.buttons.length ? { buttons: c.buttons.slice(0, 3).map((b) => ({ ...b, title: clip(b.title, 20) })) } : {}),
    }));
    const fallback: IgMessage[] = [];
    for (const c of cards) {
      const img = publicImage(c.image);
      if (img) fallback.push({ attachment: { type: "image", payload: { url: img } } });
    }
    fallback.push({ text: fallbackText.slice(0, MAX_TEXT), ...(fallbackQuick.length ? { quick_replies: fallbackQuick.slice(0, 13).map((q) => ({ content_type: "text" as const, title: clip(q.title, 20), payload: q.payload })) } : {}) });
    out.push({ attachment: { type: "template", payload: { template_type: "generic", elements } }, fallback });
  };
  for (const p of parts) {
    if (p.type === "text") text(p.text);
    else if (p.type === "rate_cards") {
      const nights = (n: number) => `${n} ${lang === "en" ? (n === 1 ? "night" : "nights") : n === 1 ? "noche" : "noches"}`;
      carousel(
        p.items.map((i) => ({
          title: i.label,
          subtitle: `${money(i.totalCents)} · ${nights(i.nights)}${i.detail ? ` · ${i.detail}` : ""}`,
          image: i.image,
          buttons: i.quoteId ? [{ type: "postback", title: lang === "en" ? "Choose" : "Elegir", payload: `pick:${i.quoteId}` }] : [],
        })),
        p.items.map((i) => `• ${i.label} — ${money(i.totalCents)} (${nights(i.nights)})`).join("\n"),
        p.items.filter((i) => i.quoteId).map((i) => ({ title: i.label, payload: `pick:${i.quoteId}` })),
      );
    } else if (p.type === "cards") {
      carousel(
        p.items.map((c) => ({
          title: c.title,
          subtitle: c.subtitle,
          image: c.image,
          buttons: (c.buttons ?? []).map((b): IgButton => (b.url ? { type: "web_url", title: b.title, url: absolute(b.url) } : { type: "postback", title: b.title, payload: b.id ?? b.title })),
        })),
        p.items.map((c) => `• ${c.title}${c.subtitle ? `\n${c.subtitle}` : ""}`).join("\n\n"),
        p.items.flatMap((c) => (c.buttons ?? []).filter((b) => b.id).map((b) => ({ title: `${c.title}`, payload: b.id! }))),
      );
    } else if (p.type === "buttons") p.items.forEach((b) => quick.push({ title: b.title, payload: b.id }));
    else if (p.type === "payment_link") text(`${p.label || (lang === "en" ? "Secure payment" : "Pago seguro")} · ${money(p.amountCents)}\n${absolute(p.url)}`);
    else if (p.type === "link") text(`${p.title}\n${absolute(p.url)}`);
    else if (p.type === "reservation_summary") text(`${lang === "en" ? "Booking" : "Reserva"} ${p.reservationCode}${p.lines?.length ? "\n" + p.lines.join("\n") : ""}`);
    else if (p.type === "image") {
      const url = publicImage(p.url);
      if (url) out.push({ attachment: { type: "image", payload: { url } } });
    }
  }
  if (quick.length) {
    const qr = quick.slice(0, 13).map((q) => ({ content_type: "text" as const, title: clip(q.title, 20), payload: q.payload.slice(0, 1000) }));
    // Los botones rápidos van en el último mensaje (si es un carrusel o una foto, se agrega una línea corta).
    const last = out[out.length - 1];
    if (last?.text) last.quick_replies = qr;
    else out.push({ text: lang === "en" ? "What would you like to do?" : "¿Qué te gustaría hacer?", quick_replies: qr });
  }
  return out;
}

/** Envía un DM al usuario (IGSID). Si Instagram rechaza un carrusel, manda las fotos y el texto. */
export async function sendInstagramParts(igsid: string, parts: Part[], lang: "es" | "en" = "es") {
  for (const { fallback, ...m } of partsToInstagram(parts, lang)) {
    try {
      await sendRaw({ id: igsid }, m);
    } catch (e) {
      if (!fallback) throw e;
      console.warn("[instagram] carrusel rechazado, envío fotos y texto:", (e as Error).message);
      for (const f of fallback) await sendRaw({ id: igsid }, f);
    }
  }
}

/** Respuesta privada a un comentario (abre el DM con esa persona; Instagram permite una por comentario). */
export async function sendPrivateReply(commentId: string, text: string) {
  return sendRaw({ comment_id: commentId }, { text: text.slice(0, MAX_TEXT) });
}

/** Respuesta pública en el hilo del comentario. */
export async function replyToComment(commentId: string, text: string) {
  const acc = await instagramAccount();
  return graph<{ id: string }>(acc.sendToken, "POST", `${commentId}/replies`, undefined, { message: text });
}

/** Nombre de usuario de quien escribe (para el panel). */
export async function instagramProfile(igsid: string): Promise<{ username?: string; name?: string }> {
  const acc = await instagramAccount();
  return graph<{ username?: string; name?: string }>(acc.sendToken, "GET", igsid, undefined, { fields: acc.login === "instagram" ? "username,name" : "username,name" }).catch(() => ({}));
}

/** Un mensaje por su id (algunos webhooks, como message_edit, no traen el remitente). */
export async function instagramMessage(mid: string): Promise<{ from?: { id: string; username?: string }; message?: string }> {
  const acc = await instagramAccount();
  return graph(acc.sendToken, "GET", mid, undefined, { fields: "from,to,message,created_time" });
}

/** Preguntas rápidas del hotel (los payload los entiende el core: menu:*). */
const QUICK_MENU = {
  es: [
    ["Ver habitaciones y fotos", "menu:rooms"],
    ["Consultar disponibilidad", "menu:book"],
    ["Experiencias y servicios", "menu:services"],
    ["Mi reserva", "menu:mine"],
  ],
  en: [
    ["See rooms & photos", "menu:rooms"],
    ["Check availability", "menu:book"],
    ["Experiences & services", "menu:services"],
    ["My booking", "menu:mine"],
  ],
} as const;

/**
 * Menú rápido de Instagram:
 *  - ice breakers: hasta 4 preguntas que se ven al abrir un chat nuevo con el hotel;
 *  - menú persistente: el botón ☰ del chat, siempre disponible.
 * Español por defecto e inglés para cuentas en inglés.
 */
export async function setInstagramQuickMenu() {
  const acc = await instagramAccount();
  const path = acc.login === "facebook" ? `${acc.pageId}/messenger_profile` : "me/messenger_profile";
  const query: Record<string, string> = acc.login === "facebook" ? { platform: "instagram" } : {};
  const results: Record<string, string> = {};
  const iceBreakers = (["es", "en"] as const).map((l) => ({
    locale: l === "es" ? "default" : "en_US",
    call_to_actions: QUICK_MENU[l].map(([question, payload]) => ({ question, payload })),
  }));
  try {
    await graph(acc.sendToken, "POST", path, { platform: "instagram", ice_breakers: iceBreakers }, query);
    results.ice_breakers = "ok";
  } catch (e) {
    results.ice_breakers = (e as Error).message;
  }
  const menu = (["es", "en"] as const).map((l) => ({
    locale: l === "es" ? "default" : "en_US",
    composer_input_disabled: false,
    call_to_actions: [...QUICK_MENU[l], [l === "es" ? "Hablar con una persona" : "Talk to a person", "menu:human"]].map(([title, payload]) => ({ type: "postback", title, payload })),
  }));
  try {
    await graph(acc.sendToken, "POST", path, { platform: "instagram", persistent_menu: menu }, query);
    results.persistent_menu = "ok";
  } catch (e) {
    results.persistent_menu = (e as Error).message;
  }
  return results;
}

/** Suscribe la cuenta a los webhooks de mensajes y comentarios (Instagram Login). */
export async function subscribeInstagramWebhooks() {
  const acc = await instagramAccount();
  if (acc.login === "instagram") {
    return graph(acc.sendToken, "POST", "me/subscribed_apps", undefined, { subscribed_fields: "messages,messaging_postbacks,comments" });
  }
  return graph(acc.sendToken, "POST", `${acc.pageId}/subscribed_apps`, undefined, { subscribed_fields: "messages,messaging_postbacks,feed" });
}

// ---------------- Webhooks ----------------
/** Valida X-Hub-Signature-256 (HMAC-SHA256 del cuerpo con el app secret). Sin secreto configurado, solo en desarrollo. */
export function verifyInstagramSignature(rawBody: string, header: string | null) {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production" || process.env.INSTAGRAM_ALLOW_UNSIGNED === "true";
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Mientras se procesa un comentario, la respuesta de Nía no debe salir como DM normal (Instagram exige que el
 * primer mensaje sea la "respuesta privada" al comentario). Esta marca le dice a saveMessage que no la entregue.
 */
export const deliveryContext = new AsyncLocalStorage<{
  suppress: boolean;
  /** Si se indica, los salientes de esa conversación se acumulan aquí (entrada síncrona de WhatsApp para Flowy). */
  capture?: { channel: string; channelUserId: string; parts: Part[] };
}>();

/** IGSID reales son numéricos; el simulador usa nombres (así el simulador sigue funcionando con la cuenta real conectada). */
export const isRealIgsid = (id: string) => /^\d{5,}$/.test(id);
