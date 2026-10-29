import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { realNow } from "../clock";
import { agentMode } from "../config";
import { getOrCreateConversation, partsToPlainText, saveMessage } from "../conversations";
import { anthropicTools, runTool } from "../tools";
import type { ToolContext } from "../tools/context";
import type { InboundMessage, Part } from "../types";
import { maskCards } from "./masking";
import { dynamicContext, staticSystemPrompt } from "./prompt";
import { guidedTurn } from "./guided";
import { specialTurn } from "./special";

const MAX_TOOL_CALLS = 6;
const HISTORY = 20;

import { detectLanguage } from "./language";
export { detectLanguage };

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

/**
 * Punto de entrada único de todos los canales.
 * Devuelve las partes salientes generadas en este turno (además de guardarlas en la bandeja).
 */
export async function handleTurn(inbound: InboundMessage): Promise<{ parts: Part[]; mode: string }> {
  const masked = inbound.text ? maskCards(inbound.text) : { text: undefined, masked: false };
  const msg: InboundMessage = { ...inbound, text: masked.text };
  let conv = await getOrCreateConversation(msg.channel, msg.channelUserId, msg.displayName);

  // Idioma: se detecta en cada mensaje escrito. Si cambia, también se actualiza el huésped
  // para que recordatorios, correos y avisos proactivos salgan en el mismo idioma.
  if (msg.text) {
    const lang = detectLanguage(msg.text, conv.language);
    if (lang !== conv.language) {
      conv = await db.conversation.update({ where: { id: conv.id }, data: { language: lang } });
      if (conv.guestId) await db.guest.update({ where: { id: conv.guestId }, data: { language: lang } });
    }
  }

  // Guardar el entrante (la imagen nunca se guarda: solo un marcador)
  const inParts: Part[] = [];
  if (msg.text) inParts.push({ type: "text", text: msg.text });
  if (msg.buttonId) inParts.push({ type: "text", text: `▸ ${msg.buttonTitle ?? msg.buttonId}` });
  if (msg.attachment) inParts.push({ type: "text", text: conv.language === "en" ? "📷 Photo sent (not stored)" : "📷 Foto enviada (no se almacena)" });
  if (inParts.length) await saveMessage({ conversationId: conv.id, direction: "in", author: "guest", parts: inParts });

  if (conv.mode === "staff") return { parts: [], mode: "staff" };

  const ctx: ToolContext = { channel: msg.channel, channelUserId: msg.channelUserId, conversationId: conv.id, lang: conv.language === "en" ? "en" : "es" };

  if (masked.masked) {
    const parts: Part[] = [
      {
        type: "text",
        text:
          ctx.lang === "en"
            ? "For your security I hid the card number you sent. Please never share card details in chat — I'll send you a secure payment link instead."
            : "Por tu seguridad oculté el número de tarjeta que enviaste. Nunca compartas datos de tarjeta por chat: te enviaré un enlace de pago seguro.",
      },
    ];
    await saveMessage({ conversationId: conv.id, direction: "out", author: "agent", parts });
    return { parts, mode: "safety" };
  }

  // Flujos transaccionales deterministas (check-in en el chat, servicios, saldo, reseñas)
  const special = await specialTurn(msg, ctx);
  if (special) {
    if (special.length) await saveMessage({ conversationId: conv.id, direction: "out", author: "agent", parts: special });
    return { parts: special, mode: "special" };
  }

  let parts: Part[];
  let toolCalls: unknown[] = [];
  let mode: string = agentMode();
  if (mode === "ai") {
    try {
      const r = await aiTurn(msg, ctx, conv.id);
      parts = r.parts;
      toolCalls = r.toolCalls;
    } catch (e) {
      console.error("[agent] fallo del modo IA, uso modo guiado", e);
      mode = "guided";
      parts = await guidedTurn(msg, ctx);
    }
  } else {
    parts = await guidedTurn(msg, ctx);
  }
  if (parts.length) await saveMessage({ conversationId: conv.id, direction: "out", author: "agent", parts, toolCalls: toolCalls.length ? toolCalls : undefined });
  return { parts, mode };
}

async function buildHistory(conversationId: string): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: HISTORY });
  rows.reverse();
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const r of rows) {
    const text = partsToPlainText(JSON.parse(r.partsJson) as Part[]);
    if (!text.trim()) continue;
    const role = r.direction === "in" ? "user" : "assistant";
    const prefix = r.author === "staff" ? "[Mensaje del equipo del hotel] " : r.template ? "[Mensaje automático del hotel] " : "";
    out.push({ role, content: prefix + text });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

async function aiTurn(msg: InboundMessage, ctx: ToolContext, conversationId: string) {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const guest = conv.guestId ? await db.guest.findUnique({ where: { id: conv.guestId } }) : null;
  const messages = await buildHistory(conversationId);
  // Botones: se traducen a texto con la referencia que el modelo necesita
  if (msg.buttonId && messages.length) {
    const last = messages[messages.length - 1];
    if (msg.buttonId.startsWith("pick:")) {
      last.content = `${last.content}\n(Elegí la opción con quoteId ${msg.buttonId.slice(5)})`;
    }
  }
  if (!messages.length) messages.push({ role: "user", content: msg.text || "Hola" });

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: staticSystemPrompt(), cache_control: { type: "ephemeral" } },
    { type: "text", text: dynamicContext(ctx.channel, ctx.channelUserId, realNow(), guest, ctx.lang) },
  ];
  const tools = anthropicTools() as Anthropic.Beta.BetaTool[];
  const suggested: Part[] = [];
  const toolCalls: { name: string; input: unknown; result: unknown }[] = [];
  let finalText = "";

  for (let i = 0; i <= MAX_TOOL_CALLS; i++) {
    const response = await anthropic().beta.messages.create({
      model: process.env.LLM_MODEL || "claude-sonnet-5-5",
      max_tokens: 4096,
      system,
      tools,
      messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
      finalText = ctx.lang === "en" ? "Sorry, I can't help with that. Can I help you with your stay?" : "Lo siento, no puedo ayudar con eso. ¿Te ayudo con tu estadía?";
      break;
    }
    const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (text) finalText = text;
    const uses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || !uses.length) break;

    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      const over = toolCalls.length >= MAX_TOOL_CALLS;
      const r = over ? { ok: false, error: "Límite de herramientas por turno alcanzado; responde al huésped." } : await runTool(u.name, u.input, ctx);
      toolCalls.push({ name: u.name, input: u.input, result: r });
      if ("parts" in r && r.parts) suggested.push(...r.parts);
      results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(r.ok ? r.data : { error: r.error }), is_error: !r.ok });
    }
    messages.push({ role: "user", content: results });
  }

  // Unir tarjetas de tarifas de varias llamadas en una sola parte
  const parts: Part[] = [];
  if (finalText) parts.push({ type: "text", text: stripUrls(finalText) });
  const cards = suggested.filter((p) => p.type === "rate_cards").flatMap((p) => (p.type === "rate_cards" ? p.items : []));
  if (cards.length) parts.push({ type: "rate_cards", items: dedupeCards(cards) });
  parts.push(...suggested.filter((p) => p.type !== "rate_cards"));
  return { parts, toolCalls };
}

function dedupeCards<T extends { roomTypeCode: string; ratePlanCode: string }>(items: T[]) {
  const seen = new Map<string, T>();
  for (const it of items) seen.set(`${it.roomTypeCode}:${it.ratePlanCode}`, it); // el último gana (cotización más reciente)
  return [...seen.values()];
}

// Los enlaces van como botones: si el modelo pegó una URL de pago, la quitamos del texto.
function stripUrls(text: string) {
  return text.replace(/\(?https?:\/\/\S*(pago|checkout\.stripe|checkin)\S*\)?/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}
