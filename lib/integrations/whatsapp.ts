// WhatsApp para equipos externos (Flowy): las respuestas de Nía en formato WhatsApp Cloud API y el
// webhook de salida para los mensajes que Nía envía sola (recordatorios, pagos, check-in, encuesta).
//
//  Entrada:  POST /api/integrations/whatsapp/inbound   (cabecera x-aura-key: WHATSAPP_INTEGRATION_KEY)
//  Salida:   POST a WHATSAPP_OUTBOUND_WEBHOOK_URL        (cabecera x-aura-signature: HMAC-SHA256 del cuerpo)
import crypto from "node:crypto";
import { appUrl } from "../config";
import type { Part } from "../types";

/** Mensaje de WhatsApp Cloud API (cuerpo de POST /{phone-number-id}/messages, sin "to" ni "messaging_product"). */
export type WaMessage =
  | { type: "text"; text: { body: string; preview_url?: boolean } }
  | { type: "image"; image: { link: string; caption?: string } }
  | { type: "interactive"; interactive: Record<string, unknown> };

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + "…");
const absolute = (u: string) => (/^https?:/i.test(u) ? u : `${appUrl()}${u.startsWith("/") ? "" : "/"}${u}`);
const money = (c: number) => "$" + Math.round(c / 100).toLocaleString("en-US");

/**
 * Partes del core → mensajes de WhatsApp:
 *  - texto → text (WhatsApp entiende *negrita*)
 *  - botones ≤3 → interactive "button" (sobre el último texto); 4–10 → interactive "list"
 *  - tarifas → interactive "list" (id pick:<quoteId>) ; galería de habitaciones → fotos + lista
 *  - pago / enlace → interactive "cta_url" (botón que abre la URL)
 */
export function partsToWhatsApp(parts: Part[], lang: "es" | "en" = "es"): WaMessage[] {
  const en = lang === "en";
  const out: WaMessage[] = [];
  let pendingText: string | null = null;
  const flush = () => {
    if (pendingText) out.push({ type: "text", text: { body: clip(pendingText, 4096) } });
    pendingText = null;
  };
  const takeBody = (fallback: string) => {
    const b = pendingText ?? fallback;
    pendingText = null;
    return clip(b, 1024);
  };
  const list = (rows: { id: string; title: string; description?: string }[], button: string, fallbackBody: string) => {
    out.push({
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: takeBody(fallbackBody) },
        action: {
          button: clip(button, 20),
          sections: [{ title: clip(en ? "Options" : "Opciones", 24), rows: rows.slice(0, 10).map((r) => ({ id: r.id.slice(0, 200), title: clip(r.title, 24), ...(r.description ? { description: clip(r.description, 72) } : {}) })) }],
        },
      },
    });
  };

  for (const p of parts) {
    if (p.type === "text") {
      pendingText = pendingText ? `${pendingText}\n\n${p.text}` : p.text;
    } else if (p.type === "buttons") {
      if (p.items.length <= 3) {
        out.push({
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: takeBody(en ? "Choose an option:" : "Elige una opción:") },
            action: { buttons: p.items.map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: clip(b.title, 20) } })) },
          },
        });
      } else list(p.items.map((b) => ({ id: b.id, title: b.title })), en ? "See options" : "Ver opciones", en ? "Choose an option:" : "Elige una opción:");
    } else if (p.type === "rate_cards") {
      const nights = (n: number) => `${n} ${en ? (n === 1 ? "night" : "nights") : n === 1 ? "noche" : "noches"}`;
      list(
        p.items.filter((i) => i.quoteId).map((i) => ({ id: `pick:${i.quoteId}`, title: i.label, description: `${money(i.totalCents)} · ${nights(i.nights)}${i.detail ? ` · ${i.detail}` : ""}` })),
        en ? "See rates" : "Ver tarifas",
        en ? "These are the options for your dates:" : "Estas son las opciones para tus fechas:",
      );
    } else if (p.type === "cards") {
      flush();
      for (const c of p.items.slice(0, 3)) if (c.image) out.push({ type: "image", image: { link: absolute(c.image), caption: clip(`*${c.title}*${c.subtitle ? `\n${c.subtitle}` : ""}`, 1024) } });
      const rows = p.items.flatMap((c) => (c.buttons ?? []).filter((b) => b.id).map((b) => ({ id: b.id!, title: c.title, description: b.title })));
      if (rows.length) list(rows, en ? "Choose" : "Elegir", en ? "Which one would you like?" : "¿Cuál te gustaría?");
    } else if (p.type === "payment_link" || p.type === "link") {
      const url = absolute(p.url);
      const label = p.type === "payment_link" ? `${p.label || (en ? "Secure payment" : "Pago seguro")} · ${money(p.amountCents)}` : p.title;
      out.push({
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: takeBody(label) },
          action: { name: "cta_url", parameters: { display_text: clip(p.type === "payment_link" ? (en ? "Pay securely" : "Pagar seguro") : p.title, 20), url } },
        },
      });
    } else if (p.type === "image") {
      flush();
      out.push({ type: "image", image: { link: absolute(p.url), caption: p.alt } });
    } else if (p.type === "reservation_summary") {
      pendingText = `${pendingText ? pendingText + "\n\n" : ""}*${en ? "Booking" : "Reserva"} ${p.reservationCode}*${p.lines?.length ? "\n" + p.lines.join("\n") : ""}`;
    }
  }
  flush();
  return out;
}

/** Firma del webhook de salida: HMAC-SHA256 (hex) del cuerpo con WHATSAPP_OUTBOUND_SECRET. */
export function signOutbound(body: string) {
  return crypto.createHmac("sha256", process.env.WHATSAPP_OUTBOUND_SECRET || "").update(body).digest("hex");
}

export const whatsappOutboundEnabled = () => Boolean(process.env.WHATSAPP_OUTBOUND_WEBHOOK_URL);

/**
 * Empuja a Flowy un mensaje que Nía envía por su cuenta (o el equipo desde el panel).
 * `template: true` = mensaje proactivo: fuera de la ventana de 24 h debe ir como plantilla aprobada (ver docs).
 */
export async function pushWhatsAppOutbound(opts: { to: string; parts: Part[]; lang: "es" | "en"; template: boolean; author: string; kind?: string }) {
  const body = JSON.stringify({
    event: "message.outbound",
    to: opts.to,
    lang: opts.lang,
    author: opts.author, // agent | staff | system
    template: opts.template,
    templateHint: opts.kind ?? null,
    whatsapp: partsToWhatsApp(opts.parts, opts.lang),
    parts: opts.parts,
    sentAt: new Date().toISOString(),
  });
  const r = await fetch(process.env.WHATSAPP_OUTBOUND_WEBHOOK_URL!, {
    method: "POST",
    headers: { "content-type": "application/json", "x-aura-signature": signOutbound(body) },
    body,
  });
  if (!r.ok) throw new Error(`Webhook de WhatsApp respondió ${r.status}`);
}
