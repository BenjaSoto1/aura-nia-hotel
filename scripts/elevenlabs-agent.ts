/**
 * Crea (o actualiza) el agente de voz de ElevenLabs para Nía: prompt desde el Hotel Pack y las mismas
 * herramientas del core como "client tools" (el navegador las ejecuta contra /api/tools/[name]).
 *
 * Uso (la API key se lee de .env o del entorno, nunca se guarda en el repo):
 *   npx tsx --env-file=.env scripts/elevenlabs-agent.ts
 * Si ELEVENLABS_AGENT_ID ya existe, actualiza ese agente; si no, crea uno nuevo e imprime su id.
 * Opcional: ELEVENLABS_VOICE_ID (voz; por defecto una voz multilingüe de la biblioteca).
 *
 * Agente telefónico (llamadas a un número real, sin navegador):
 *   npx tsx --env-file=.env scripts/elevenlabs-agent.ts --phone
 * Crea/actualiza "Nía · Teléfono" (ELEVENLABS_PHONE_AGENT_ID) con las mismas herramientas como server tools:
 * ElevenLabs llama directo a https://<sitio>/api/tools/<nombre>?channel=phone con la cabecera secreta
 * ELEVENLABS_TOOL_SECRET y el número de quien llama ({{system__caller_id}}) como identificador del huésped.
 * Opcional: PHONE_TOOLS_BASE_URL (por defecto https://hotelaura-nia.netlify.app).
 */
import { loadHotelPack } from "../lib/hotel-pack";
import { staticSystemPrompt } from "../lib/agent/prompt";
import { anthropicTools } from "../lib/tools";
import { VOICE_TOOL_NAMES } from "../lib/tool-names";

const API = "https://api.elevenlabs.io/v1/convai/agents";
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Falta ELEVENLABS_API_KEY (agrégala a .env o al entorno).");
  process.exit(1);
}
const PHONE = process.argv.includes("--phone");
const SITE = (process.env.PHONE_TOOLS_BASE_URL || "https://hotelaura-nia.netlify.app").replace(/\/$/, "");
const TOOL_SECRET = process.env.ELEVENLABS_TOOL_SECRET;
if (PHONE && !TOOL_SECRET) {
  console.error("Falta ELEVENLABS_TOOL_SECRET (la misma clave en .env y en las variables de Netlify).");
  process.exit(1);
}

type Schema = { type?: string; description?: string; enum?: unknown[]; items?: Schema; properties?: Record<string, Schema>; required?: string[] };

/** Descripciones claras para el modelo de voz (el esquema del core no siempre las trae). */
const FIELD_HINTS: Record<string, string> = {
  checkIn: "Fecha de llegada en formato AAAA-MM-DD. Debe ser hoy o posterior; si el huésped no dice el año, usa la próxima vez que ocurra esa fecha.",
  checkOut: "Fecha de salida en formato AAAA-MM-DD, posterior a la llegada.",
  guests: "Número de personas (adultos) que se hospedan.",
  pets: "Número de mascotas (0 si no viajan con mascota).",
  roomTypeCode: "Código de la habitación elegida (opcional: sin él se cotizan todas).",
  ratePlanCode: "Código de la tarifa: FLEX (flexible, paga en el hotel) o PREPAGO (12% de descuento, no reembolsable). Opcional.",
  quoteId: "Identificador de la opción elegida, tal como lo devolvió la herramienta quote.",
  fullName: "Nombre y apellido del huésped.",
  email: "Correo del huésped, completo y sin espacios (p. ej. nombre@gmail.com). A este correo llega la confirmación y la invitación de calendario.",
  phone: "Teléfono del huésped con código de país (p. ej. +56 9 1234 5678).",
  reservationCode: "Código de la reserva, p. ej. AUR-48213.",
  purpose: "prepayment para pagar la reserva o balance para pagar el saldo.",
  serviceCode: "Código del servicio a reservar.",
  datetime: "Fecha y hora del servicio, p. ej. 2026-11-15 18:00.",
  reason: "Motivo por el que el huésped necesita a una persona.",
};

/** ElevenLabs exige descripción en cada propiedad y no acepta format / minimum / maximum. */
function clean(s: Schema, name: string): Schema {
  const out: Schema = { type: s.type ?? "string", description: FIELD_HINTS[name] ?? s.description ?? name };
  if (s.enum) out.enum = s.enum;
  if (s.type === "array" && s.items) out.items = clean(s.items, `${name} item`);
  if (s.type === "object") {
    out.properties = Object.fromEntries(Object.entries(s.properties ?? {}).map(([k, v]) => [k, clean(v, k)]));
    if (s.required?.length) out.required = s.required;
  }
  return out;
}

// send_to_whatsapp no hace falta en voz: los enlaces de pago del teléfono ya se reenvían solos al WhatsApp.
const coreTools = anthropicTools().filter((t) => (VOICE_TOOL_NAMES as readonly string[]).includes(t.name) && t.name !== "send_to_whatsapp");

const voiceTools = PHONE
  ? // Teléfono: server tools (webhook). ElevenLabs llama directo al sitio; el número de quien llama viaja como channelUserId.
    coreTools.map((t) => {
      const sch = clean(t.input_schema as Schema, t.name);
      return {
        type: "webhook",
        name: t.name,
        description: t.description,
        response_timeout_secs: 20,
        api_schema: {
          url: `${SITE}/api/tools/${t.name}?channel=phone`,
          method: "POST",
          request_headers: { "x-aura-tool-secret": TOOL_SECRET },
          request_body_schema: {
            type: "object",
            description: `Parámetros de ${t.name}`,
            properties: { ...(sch.properties ?? {}), channelUserId: { type: "string", dynamic_variable: "system__caller_id" } },
            required: [...(sch.required ?? []), "channelUserId"],
          },
        },
      };
    })
  : coreTools.map((t) => ({
      type: "client",
      name: t.name,
      description: t.description,
      parameters: clean(t.input_schema as Schema, t.name),
      expects_response: true,
      response_timeout_secs: 20,
    }));

const pack = loadHotelPack();
const agent = pack.agente.nombre;
const phoneRules = `

Llamada telefónica:
- Estás atendiendo una llamada al número del hotel. El teléfono de quien llama es {{system__caller_id}}: úsalo como teléfono del huésped (confírmalo en voz alta) en vez de pedírselo.
- La fecha y hora actual (UTC) es {{system__time_utc}}; el hotel está en ${pack.hotel.zona_horaria}. Solo se reserva de hoy en adelante.
- No hay pantalla: describe las opciones en una o dos frases (habitación y total) y pregunta cuál prefiere.
- El correo pídelo deletreado, letra por letra, y repítelo antes de reservar.
- Recomienda la tarifa Flexible (pagas en el hotel): así la reserva queda confirmada al instante por teléfono. Si prefiere prepago, dile que el enlace de pago le llega por mensaje y la reserva se confirma al pagar.`;

const prompt = `${staticSystemPrompt()}

Reglas de voz (web y teléfono):
- Hablas por voz: frases cortas y naturales, sin listas, sin emojis, sin leer URLs ni códigos largos letra por letra salvo que te lo pidan.
- UNA sola pregunta por turno. Espera la respuesta antes de pedir el siguiente dato.
- Al conectar recibirás un mensaje de contexto con el canal, la fecha del hotel y, en llamadas, el teléfono del huésped: úsalo.
- Las tarjetas de tarifas y los botones de pago aparecen solos en la pantalla del huésped (web) o le llegan por WhatsApp (teléfono). Dilo en una frase.
- Precios: di el total redondeado en dólares; nunca inventes cifras, salen de las herramientas.
- Fechas: solo se reserva de hoy en adelante. Usa la fecha de hoy que llega en el mensaje de contexto. Si una herramienta responde que la fecha ya pasó, usa la fecha de hoy que indica el error y vuelve a preguntar o corrige el año.
- Flujo de reserva, un dato por turno: fechas → número de personas → mascota → llama a quote y resume las opciones en una frase → el huésped elige → nombre → correo → teléfono → create_reservation. Con tarifa prepago, luego create_payment_link.
- Correo: en la web pide que lo escriba en el chat de la pantalla; por teléfono pide que lo deletree. Antes de reservar, confírmalo en voz alta una vez.
- Al confirmar la reserva, di que le llegó por correo la confirmación con una invitación para su Google Calendar.${PHONE ? phoneRules : ""}`;

const body = {
  name: PHONE ? `${agent} · Teléfono · ${pack.hotel.nombre}` : `${agent} · ${pack.hotel.nombre}`,
  conversation_config: {
    agent: {
      first_message: PHONE ? `Hola, gracias por llamar a ${pack.hotel.nombre}. Soy ${agent}, ¿en qué te ayudo?` : `Hola, soy ${agent}, la concierge de ${pack.hotel.nombre}. ¿En qué te ayudo?`,
      language: "es",
      // Claude Haiku 4.5: rápido para voz y confiable llamando herramientas.
      prompt: { prompt, llm: process.env.ELEVENLABS_LLM || "claude-haiku-4-5", temperature: 0.3, tools: voiceTools },
    },
    tts: { voice_id: process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL", model_id: "eleven_flash_v2_5" },
  },
  platform_settings: { auth: { enable_auth: Boolean(process.env.ELEVENLABS_PRIVATE === "true") } },
};

async function main() {
  const id = (PHONE ? process.env.ELEVENLABS_PHONE_AGENT_ID : process.env.ELEVENLABS_AGENT_ID)?.trim() || undefined;
  const res = await fetch(id ? `${API}/${id}` : `${API}/create`, {
    method: id ? "PATCH" : "POST",
    headers: { "xi-api-key": key!, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`ElevenLabs respondió ${res.status}: ${text}`);
    process.exit(1);
  }
  const data = JSON.parse(text) as { agent_id?: string };
  const agentId = id || data.agent_id;
  console.log(`${id ? "Agente actualizado" : "Agente creado"}: ${agentId}${PHONE ? " (teléfono)" : ""}`);
  console.log(`Herramientas: ${voiceTools.map((t) => t.name).join(", ")}`);
  if (!id) {
    console.log(
      PHONE
        ? `\nAgrega ELEVENLABS_PHONE_AGENT_ID=${agentId} a .env y asígnale tu número en ElevenLabs → Phone Numbers.`
        : `\nAgrega ELEVENLABS_AGENT_ID=${agentId} a .env y a las variables de Netlify, y VOICE_PROVIDER=elevenlabs.`,
    );
  }
}

main();
