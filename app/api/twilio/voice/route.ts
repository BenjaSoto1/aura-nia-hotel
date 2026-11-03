import { elevenLabsTwiml, verifyTwilioSignature } from "@/lib/integrations/twilio";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Webhook de voz de Twilio. Configúralo como "A call comes in" de tu número (POST), o úsalo como Url de una
 * llamada saliente (?out=1). Responde con el TwiML de ElevenLabs que conecta la llamada con "Nía · Teléfono".
 */
const twiml = (inner: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, { headers: { "content-type": "text/xml" } });

export async function POST(req: Request) {
  const u = new URL(req.url);
  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>;
  // Twilio firma con la URL pública exacta que llamó (https). Detrás del proxy de Netlify la petición puede
  // llegar como http o con otro host interno, así que se prueba con la dirección pública y con la del pedido.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const path = `${u.pathname}${u.search}`;
  const candidates = [`https://${host}${path}`, `${appUrl().replace(/^http:/, "https:")}${path}`, `${appUrl()}${path}`, req.url];
  const sig = req.headers.get("x-twilio-signature");
  // Alternativa a la firma: token secreto en la URL (las llamadas de prueba de Twilio no siempre firman igual).
  const key = process.env.TWILIO_WEBHOOK_KEY || process.env.ELEVENLABS_TOOL_SECRET;
  const keyOk = !!key && u.searchParams.get("k") === key;
  if (!keyOk && !candidates.some((c) => verifyTwilioSignature(c, params, sig))) return new Response("Firma inválida", { status: 403 });
  const outbound = u.searchParams.get("out") === "1";
  // Entrante: llama el huésped (From). Saliente: Nía llama al huésped (To).
  const guest = outbound ? params.To : params.From;
  const hotel = outbound ? params.From : params.To;
  try {
    const xml = await elevenLabsTwiml(guest, hotel);
    return new Response(xml, { headers: { "content-type": "text/xml" } });
  } catch (e) {
    console.error("[twilio] no se pudo conectar con ElevenLabs", e);
    return twiml('<Say language="es-MX">Lo sentimos, en este momento no podemos atender tu llamada. Escríbenos por el sitio de Aura.</Say>');
  }
}
