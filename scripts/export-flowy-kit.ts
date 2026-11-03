/**
 * Genera el paquete para el equipo de WhatsApp (Flowy) en docs/flowy-whatsapp/, a partir del código real:
 *  - system-prompt.md : prompt estático + contexto dinámico de ejemplo para WhatsApp
 *  - tools.json       : herramientas del core (nombre, descripción, JSON Schema)
 *  - ejemplos.md      : conversaciones de WhatsApp reales (core en modo guiado) con la salida en formato Cloud API
 *
 *   EMAIL_PROVIDER=simulated npx tsx --env-file=.env scripts/export-flowy-kit.ts
 * (con EMAIL_PROVIDER=simulated no se envía ningún correo real mientras se generan los ejemplos)
 */
import fs from "node:fs";
import path from "node:path";
import { dynamicContext, staticSystemPrompt } from "../lib/agent/prompt";
import { anthropicTools } from "../lib/tools";
import { handleTurn } from "../lib/agent/core";
import { partsToWhatsApp } from "../lib/integrations/whatsapp";
import { deliveryContext } from "../lib/integrations/instagram";
import { db } from "../lib/db";
import type { Part } from "../lib/types";

const OUT = path.join(process.cwd(), "docs", "flowy-whatsapp");
fs.mkdirSync(OUT, { recursive: true });

// ---------- System prompt ----------
const example = dynamicContext("whatsapp", "+56912345678", new Date("2026-10-19T15:00:00Z"), null, "es");
fs.writeFileSync(
  path.join(OUT, "system-prompt.md"),
  `# System prompt de Nía (generado desde lib/agent/prompt.ts)

Va en dos bloques: el **estático** (cacheable, igual para todos) y el **dinámico** (por conversación, va después).
Los datos del hotel (habitaciones, tarifas, servicios, políticas) salen del Hotel Pack (\`hotel-pack.yaml\`).

## 1. Bloque estático

\`\`\`text
${staticSystemPrompt()}
\`\`\`

## 2. Bloque dinámico (ejemplo para WhatsApp)

\`\`\`text
${example}
\`\`\`

Se arma en cada turno con: idioma detectado del huésped (es/en), canal, número del huésped, fecha y hora del hotel
(zona America/Puerto_Rico) y, si se conoce, nombre y correo del huésped. Modelo usado en producción: Claude Sonnet,
temperatura por defecto, máximo 4096 tokens, con las herramientas de \`tools.json\`.
`,
);

// ---------- Herramientas ----------
fs.writeFileSync(path.join(OUT, "tools.json"), JSON.stringify(anthropicTools(), null, 2));

// ---------- Ejemplos ----------
type Turn = { text?: string; buttonId?: string; buttonTitle?: string; pick?: number };
const scenarios: { title: string; phone: string; turns: Turn[] }[] = [
  { title: "Saludo y menú", phone: "+56900000101", turns: [{ text: "Hola" }] },
  {
    title: "Reserva completa (tarifa flexible)",
    phone: "+56900000102",
    turns: [
      { text: "Hola, quiero reservar del 20 al 22 de noviembre para 2 personas" },
      { text: "No, sin mascota" },
      { pick: 1 },
      { text: "Camila Rojas" },
      { text: "camila.rojas@example.com" },
      { text: "Sí, ese es mi número" },
    ],
  },
  { title: "Fotos de las habitaciones", phone: "+56900000103", turns: [{ text: "¿Tienen fotos de las habitaciones?" }] },
  { title: "Políticas y mascotas", phone: "+56900000104", turns: [{ text: "¿Aceptan perros? El mío pesa 8 kg" }] },
  { title: "Huésped en inglés", phone: "+56900000105", turns: [{ text: "Hi! Do you have a room for this weekend?" }] },
  { title: "Pedir una persona", phone: "+56900000106", turns: [{ text: "Quiero hablar con una persona de recepción" }, { text: "¿Hay alguien?" }] },
];

const fmtParts = (parts: Part[]) =>
  parts
    .map((p) => {
      if (p.type === "text") return p.text;
      if (p.type === "buttons") return `[botones: ${p.items.map((b) => `${b.title} → ${b.id}`).join(" | ")}]`;
      if (p.type === "rate_cards") return `[tarifas: ${p.items.map((i) => `${i.label} $${Math.round(i.totalCents / 100)} → pick:${i.quoteId}`).join(" | ")}]`;
      if (p.type === "cards") return `[tarjetas con foto: ${p.items.map((c) => c.title).join(" | ")}]`;
      if (p.type === "payment_link") return `[botón de pago $${Math.round(p.amountCents / 100)}]`;
      if (p.type === "link") return `[enlace: ${p.title}]`;
      return `[${p.type}]`;
    })
    .join("\n");

async function main() {
  let md = `# Conversaciones de ejemplo por WhatsApp

Generadas con el core real (modo guiado: respuestas deterministas con botones; en producción con IA el texto es más
natural, pero los botones, tarjetas, ids y herramientas son los mismos). Para cada turno: lo que escribe el huésped,
lo que responde Nía (partes del core) y el JSON exacto para WhatsApp Cloud API que devuelve \`/api/integrations/whatsapp/inbound\`.
`;
  for (const sc of scenarios) {
    await db.message.deleteMany({ where: { conversation: { channel: "whatsapp", channelUserId: sc.phone } } });
    await db.conversation.deleteMany({ where: { channel: "whatsapp", channelUserId: sc.phone } });
    md += `\n## ${sc.title}\n`;
    let lastParts: Part[] = [];
    for (const t of sc.turns) {
      let turn: Turn = t;
      if (t.pick) {
        const cards = lastParts.find((p) => p.type === "rate_cards");
        const it = cards && cards.type === "rate_cards" ? cards.items[t.pick - 1] ?? cards.items[0] : null;
        turn = it ? { buttonId: `pick:${it.quoteId}`, buttonTitle: it.label } : { text: "La primera" };
      }
      const capture = { channel: "whatsapp", channelUserId: sc.phone, parts: [] as Part[] };
      const r0 = await deliveryContext.run({ suppress: true, capture }, () =>
        handleTurn({ channel: "whatsapp", channelUserId: sc.phone, text: turn.text, buttonId: turn.buttonId, buttonTitle: turn.buttonTitle }),
      );
      const r = { parts: capture.parts.length ? capture.parts : r0.parts };
      lastParts = r.parts;
      md += `\n**Huésped:** ${turn.text ?? `▸ (toca) ${turn.buttonTitle} → \`${turn.buttonId}\``}\n\n**Nía:**\n\n\`\`\`text\n${fmtParts(r.parts) || "(sin respuesta)"}\n\`\`\`\n\n<details><summary>JSON WhatsApp</summary>\n\n\`\`\`json\n${JSON.stringify(partsToWhatsApp(r.parts), null, 2)}\n\`\`\`\n\n</details>\n`;
    }
  }
  fs.writeFileSync(path.join(OUT, "ejemplos.md"), md);
  console.log(`OK → ${path.relative(process.cwd(), OUT)} (system-prompt.md, tools.json, ejemplos.md)`);
}

main().finally(() => db.$disconnect());
