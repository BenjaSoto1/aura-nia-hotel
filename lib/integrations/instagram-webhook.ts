// Procesa los webhooks de Instagram: DMs (texto, botones rápidos, fotos) y comentarios en publicaciones.
// La respuesta la da el mismo cerebro de Nía que en el resto de canales; la entrega real la hace saveMessage.
import { db } from "../db";
import { handleTurn } from "../agent/core";
import { detectLanguage } from "../agent/language";
import { getOrCreateConversation, saveMessage } from "../conversations";
import { loadHotelPack, rateName, roomName } from "../hotel-pack";
import type { Part } from "../types";
import { deliveryContext, instagramAccount, instagramMessage, instagramProfile, partsToInstagram, replyToComment, sendPrivateReply } from "./instagram";

interface MessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  message?: { mid: string; text?: string; is_echo?: boolean; is_deleted?: boolean; quick_reply?: { payload: string }; attachments?: { type: string }[] };
  postback?: { mid?: string; title?: string; payload: string };
  /** Meta a veces avisa un mensaje nuevo solo como message_edit (num_edit 0), sin remitente. */
  message_edit?: { mid: string; text?: string; num_edit?: number };
}
interface CommentValue {
  id: string;
  text?: string;
  from?: { id: string; username?: string };
  media?: { id: string };
  parent_id?: string;
}
export interface InstagramWebhook {
  object?: string;
  entry?: { id: string; messaging?: MessagingEvent[]; changes?: { field: string; value: CommentValue | MessagingEvent }[] }[];
}

/** Marca el evento como procesado; false si ya lo estaba (Meta reintenta los webhooks). */
async function firstTime(id: string) {
  try {
    await db.webhookEvent.create({ data: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function processInstagramWebhook(body: InstagramWebhook) {
  const results: string[] = [];
  const me = await instagramAccount().catch(() => null);
  for (const entry of body.entry ?? []) {
    for (const ev of entry.messaging ?? []) results.push(await handleMessaging(ev, me?.igId ?? entry.id));
    for (const ch of entry.changes ?? []) {
      if (ch.field === "comments") results.push(await handleComment(ch.value as CommentValue, me?.igId ?? entry.id));
      // El botón "Test" de Meta (y algunas versiones de la API) mandan los mensajes dentro de changes.
      else if (ch.field === "messages" || ch.field === "messaging_postbacks") results.push(await handleMessaging(ch.value as MessagingEvent, me?.igId ?? entry.id));
      else results.push(`ignorado: ${ch.field}`);
    }
  }
  return results;
}

/** ¿Entró este mismo texto del huésped en esta conversación en el último minuto? */
async function recentlyReceived(conversationId: string, text: string) {
  const since = new Date(Date.now() - 60_000);
  const rows = await db.message.findMany({ where: { conversationId, direction: "in", createdAt: { gte: since } }, select: { partsJson: true } });
  return rows.some((r) => (JSON.parse(r.partsJson) as Part[]).some((p) => p.type === "text" && p.text.trim() === text));
}

async function handleMessaging(ev: MessagingEvent, myId: string) {
  // message_edit sin remitente: se recupera el mensaje por su id para saber quién escribió.
  const edit = ev.message_edit;
  if (!ev.sender?.id && edit?.mid) {
    if ((edit.num_edit ?? 0) > 0) return "ignorado: edición de un mensaje";
    try {
      const m = await instagramMessage(edit.mid);
      if (!m.from?.id) return "ignorado: message_edit sin remitente";
      ev = { sender: { id: m.from.id }, message: { mid: edit.mid, text: edit.text ?? m.message } };
    } catch (e) {
      return `ignorado: no pude leer el mensaje ${edit.mid} (${(e as Error).message})`;
    }
  }
  const from = ev.sender?.id;
  if (ev.message?.is_echo || (from && from === myId)) return "eco: mensaje enviado por la cuenta del hotel (no se responde)";
  if (!from) return "ignorado: sin remitente";
  if (ev.message?.is_deleted) return "ignorado: mensaje borrado";
  const mid = ev.message?.mid ?? ev.postback?.mid ?? `${from}:${ev.postback?.payload}`;
  if (!(await firstTime(`ig:msg:${mid}`))) return "duplicado";

  const quick = ev.message?.quick_reply?.payload ?? ev.postback?.payload;
  const text = ev.message?.text?.trim();
  const hasImage = ev.message?.attachments?.some((a) => a.type === "image");
  // Avisos sin contenido (lecturas, reacciones, ediciones vacías): no se responden.
  if (!quick && !text && !hasImage) return "ignorado: sin contenido";

  const conv = await getOrCreateConversation("instagram", from);
  // "Elegir" en una tarjeta de tarifa: el título real es la habitación y la tarifa elegidas.
  let buttonTitle = quick ? ev.message?.text ?? ev.postback?.title : undefined;
  if (quick?.startsWith("pick:")) {
    const q = await db.quote.findUnique({ where: { id: quick.slice(5) } });
    if (q) buttonTitle = `${roomName(q.roomTypeCode, conv.language)} · ${rateName(q.ratePlanCode, conv.language)}`;
  }
  // Meta avisa el mismo mensaje dos veces (message + message_edit): si ya entró igual hace instantes, no se repite.
  const inbound = quick ? `▸ ${buttonTitle ?? quick}` : text;
  if (inbound && (await recentlyReceived(conv.id, inbound))) return "duplicado (mismo mensaje)";

  if (!conv.displayName) {
    const p = await instagramProfile(from);
    if (p.username || p.name) await db.conversation.update({ where: { id: conv.id }, data: { displayName: p.username ? `@${p.username}` : p.name } });
  }
  // La respuesta se entrega sola al guardarse (saveMessage → API de Instagram).
  await handleTurn({
    channel: "instagram",
    channelUserId: from,
    text: quick ? undefined : text,
    buttonId: quick,
    buttonTitle,
    attachment: hasImage ? { kind: "image", dataUrl: "" } : undefined,
  });
  return quick ? `dm: botón de ${from}` : `dm de ${from}`;
}

// ---------------- Comentarios ----------------
const ASKS = /\?|precio|cu[aá]nto|tarifa|costo|valor|reserv|disponib|fecha|noche|habitaci|suite|info|dm\b|privado|inbox|price|how much|cost|rate|book|availab|night|room|vacanc|dates?\b|pet|mascota|perro|dog/i;
const COMPLAINT = /p[eé]sim|horrible|terrible|queja|sucio|mal servicio|reembolso|estafa|awful|dirty|complain|refund|scam|worst|peor/i;

/** Qué hacer con un comentario: preguntas y quejas pasan a DM; elogios y emojis reciben un gracias público. */
export function classifyComment(text: string): "ask" | "complaint" | "thanks" {
  if (COMPLAINT.test(text)) return "complaint";
  if (ASKS.test(text)) return "ask";
  return "thanks";
}

function publicReply(kind: "ask" | "complaint" | "thanks", lang: "es" | "en", user?: string, seed = 0) {
  const at = user ? `@${user} ` : "";
  const hotel = loadHotelPack().hotel.nombre;
  if (kind === "ask") return lang === "en" ? `${at}Hi! We just sent you a DM with the details 🌊` : `${at}¡Hola! Te escribimos por mensaje directo con los detalles 🌊`;
  if (kind === "complaint")
    return lang === "en" ? `${at}We're sorry about this. We sent you a DM so our team can help you personally.` : `${at}Lamentamos lo ocurrido. Te escribimos por mensaje directo para que nuestro equipo te ayude personalmente.`;
  const es = [`${at}¡Gracias! 🤍 Te esperamos en ${hotel}.`, `${at}¡Qué lindo leerte! 🌅`, `${at}¡Gracias por acompañarnos! 🌊`];
  const en = [`${at}Thank you! 🤍 We'd love to host you at ${hotel}.`, `${at}So lovely to read this! 🌅`, `${at}Thanks for being here! 🌊`];
  const list = lang === "en" ? en : es;
  return list[seed % list.length];
}

const textOf = (parts: Part[], lang: "es" | "en") => {
  // La respuesta privada a un comentario es solo texto: los carruseles van con su versión en texto.
  const msgs = partsToInstagram(parts, lang).flatMap((m) => (m.text ? [m] : m.fallback ?? []));
  const body = msgs.map((m) => m.text).filter(Boolean).join("\n\n");
  const options = msgs.flatMap((m) => m.quick_replies ?? []).map((q) => q.title);
  return options.length ? `${body}\n\n${lang === "en" ? "Reply with" : "Respóndeme"}: ${options.join(" · ")}` : body;
};

async function handleComment(v: CommentValue, myId: string) {
  const from = v.from?.id;
  if (!from || from === myId) return "ignorado: comentario propio";
  if (!v.text?.trim()) return "ignorado: vacío";
  if (!(await firstTime(`ig:comment:${v.id}`))) return "duplicado";

  const lang = detectLanguage(v.text, "es");
  const kind = classifyComment(v.text);
  const conv = await getOrCreateConversation("instagram", from, v.from?.username ? `@${v.from.username}` : undefined);
  const note = (text: string) => saveMessage({ conversationId: conv.id, direction: "out", author: "system", deliver: false, parts: [{ type: "text", text }] });
  await note(`💬 Comentó en una publicación: «${v.text}»`);

  // 1) Respuesta pública en el hilo.
  const pub = publicReply(kind, lang, v.from?.username, v.id.length);
  try {
    await replyToComment(v.id, pub);
    await note(`↳ Respuesta pública: ${pub}`);
  } catch (e) {
    await note(`⚠️ No se pudo responder el comentario: ${(e as Error).message}`);
  }
  if (kind === "thanks") return "comentario: gracias";

  // 2) Respuesta privada (DM ligado al comentario) con lo que respondería Nía.
  let dm: string;
  if (kind === "complaint") {
    await db.conversation.update({ where: { id: conv.id }, data: { needsHuman: true } });
    dm =
      lang === "en"
        ? `Hi${v.from?.username ? ` @${v.from.username}` : ""}, I'm ${loadHotelPack().agente.nombre} from ${loadHotelPack().hotel.nombre}. I'm sorry about your experience. I've passed your comment to our team and someone will write to you here shortly. Could you share your booking code, if you have one?`
        : `Hola${v.from?.username ? ` @${v.from.username}` : ""}, soy ${loadHotelPack().agente.nombre} de ${loadHotelPack().hotel.nombre}. Lamento tu experiencia. Ya le pasé tu comentario a nuestro equipo y una persona te escribirá por aquí en breve. ¿Me compartes tu código de reserva, si tienes uno?`;
    await saveMessage({ conversationId: conv.id, direction: "out", author: "agent", deliver: false, parts: [{ type: "text", text: dm }] });
  } else {
    const r = await deliveryContext.run({ suppress: true }, () => handleTurn({ channel: "instagram", channelUserId: from, text: v.text, displayName: v.from?.username ? `@${v.from.username}` : undefined }));
    dm = textOf(r.parts, lang);
  }
  if (!dm.trim()) return "comentario: sin respuesta";
  try {
    await sendPrivateReply(v.id, dm);
  } catch (e) {
    await note(`⚠️ No se pudo enviar la respuesta privada: ${(e as Error).message}`);
    return "comentario: privada falló";
  }
  return `comentario: ${kind}`;
}
