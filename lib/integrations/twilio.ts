// Twilio + ElevenLabs: llamadas telefónicas reales atendidas por "Nía · Teléfono" (ELEVENLABS_PHONE_AGENT_ID).
// Twilio pide instrucciones (TwiML) a /api/twilio/voice; ese endpoint registra la llamada en ElevenLabs
// (register-call), que devuelve el TwiML que conecta el audio con el agente.
import crypto from "node:crypto";

export function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

/** Firma X-Twilio-Signature: HMAC-SHA1 (auth token) de la URL + parámetros POST ordenados, en base64. */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** TwiML de ElevenLabs para conectar esta llamada con el agente telefónico. `guest` es el número del huésped. */
export async function elevenLabsTwiml(guest: string, hotelNumber: string) {
  const r = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_PHONE_AGENT_ID,
      // Siempre "como si llamara el huésped": así {{system__caller_id}} es su número (sirve igual si Nía lo llamó).
      from_number: guest,
      to_number: hotelNumber,
      direction: "inbound",
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`ElevenLabs register-call ${r.status}: ${text.slice(0, 300)}`);
  return text;
}

/** Nía llama a un huésped (útil con números de prueba de Twilio que no reciben llamadas entrantes). */
export async function callGuest(to: string, from: string, voiceUrl: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Url: voiceUrl }), // las cuentas de prueba no aceptan más parámetros
  });
  const d = (await r.json()) as { sid?: string; status?: string; message?: string; code?: number };
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${d.message ?? ""} (${d.code ?? ""})`);
  return d;
}
