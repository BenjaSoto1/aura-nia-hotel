/**
 * Nía te llama por teléfono (Twilio + ElevenLabs) para probar reservas por voz en una llamada real.
 *
 *   npx tsx --env-file=.env scripts/call-me.ts +56912345678 [--from +17372508034]
 *
 * --from: número de Twilio que llama (por defecto TWILIO_FROM_NUMBER). Con una cuenta de prueba, el número
 * de destino debe estar verificado en Twilio. Cuando contestes, Nía te atiende igual que si hubieras llamado.
 */
import { callGuest } from "../lib/integrations/twilio";

const args = process.argv.slice(2);
const to = args.find((a) => a.startsWith("+"));
const fromIdx = args.indexOf("--from");
const from = (fromIdx >= 0 ? args[fromIdx + 1] : process.env.TWILIO_FROM_NUMBER) ?? "";
const site = (process.env.PHONE_TOOLS_BASE_URL || "https://hotelaura-nia.netlify.app").replace(/\/$/, "");

if (!to || !from) {
  console.error("Uso: npx tsx --env-file=.env scripts/call-me.ts +56912345678 --from +1XXXXXXXXXX");
  process.exit(1);
}

const key = process.env.TWILIO_WEBHOOK_KEY || process.env.ELEVENLABS_TOOL_SECRET || "";
callGuest(to, from, `${site}/api/twilio/voice?out=1${key ? `&k=${encodeURIComponent(key)}` : ""}`)
  .then((c) => console.log(`Llamando a ${to} desde ${from}… (${c.sid}, ${c.status}). Contesta: te atiende Nía.`))
  .catch((e) => {
    console.error(String(e.message ?? e));
    process.exit(1);
  });
