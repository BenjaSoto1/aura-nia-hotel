import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleTurn } from "@/lib/agent/core";
import { deliveryContext } from "@/lib/integrations/instagram";
import { partsToWhatsApp } from "@/lib/integrations/whatsapp";
import { db } from "@/lib/db";
import type { Part } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/**
 * Entrada de WhatsApp para Flowy: por cada mensaje que el huésped envía al número del hotel, Flowy llama aquí
 * y recibe la respuesta de Nía lista para enviar con WhatsApp Cloud API (mismo cerebro que el resto de canales).
 *
 *   POST /api/integrations/whatsapp/inbound
 *   x-aura-key: <WHATSAPP_INTEGRATION_KEY>
 *   { "from": "+56912345678", "text": "Hola", "name": "Camila", "messageId": "wamid.…" }
 *   { "from": "+56912345678", "buttonId": "menu:book", "buttonTitle": "Reservar habitación" }   ← respuesta a botón/lista
 *
 * Responde { messages: WaMessage[], parts, mode, language }. Si el equipo tomó la conversación en el panel
 * (mode "staff"), messages viene vacío: lo que escriba el equipo llega por el webhook de salida.
 */
const Body = z.object({
  from: z.string().min(6).max(20),
  text: z.string().max(4000).optional(),
  buttonId: z.string().max(256).optional(),
  buttonTitle: z.string().max(200).optional(),
  name: z.string().max(120).optional(),
  messageId: z.string().max(200).optional(),
  hasImage: z.boolean().optional(),
});

function authorized(req: Request) {
  const key = process.env.WHATSAPP_INTEGRATION_KEY;
  const got = req.headers.get("x-aura-key") ?? "";
  return !!key && got.length === key.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(key));
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Cuerpo inválido", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const phone = "+" + b.from.replace(/\D/g, "");

  // Idempotencia: WhatsApp reintenta webhooks; el mismo messageId no se responde dos veces.
  if (b.messageId) {
    try {
      await db.webhookEvent.create({ data: { id: `wa:${b.messageId}` } });
    } catch {
      return NextResponse.json({ duplicate: true, messages: [], parts: [] });
    }
  }

  // Todo lo que Nía le envía a este huésped durante el turno (respuesta + confirmaciones que publica el ciclo de
  // vida, p. ej. "reserva confirmada") viaja en este mismo llamado; no se duplica por el webhook de salida.
  const capture = { channel: "whatsapp", channelUserId: phone, parts: [] as Part[] };
  const r = await deliveryContext.run({ suppress: true, capture }, () =>
    handleTurn({
      channel: "whatsapp",
      channelUserId: phone,
      text: b.buttonId ? undefined : b.text,
      buttonId: b.buttonId,
      buttonTitle: b.buttonTitle,
      displayName: b.name,
      attachment: b.hasImage ? { kind: "image", dataUrl: "" } : undefined,
    }),
  );
  const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: "whatsapp", channelUserId: phone } } });
  const lang = conv?.language === "en" ? "en" : "es";
  const parts = capture.parts.length ? capture.parts : r.parts;
  return NextResponse.json({ to: phone, mode: r.mode, language: lang, messages: partsToWhatsApp(parts, lang), parts });
}
