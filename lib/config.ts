import { hasGoogleTokens } from "./integrations/google-tokens";

/**
 * URL pública de la app. En Netlify, si no se define APP_PUBLIC_URL, se usa `URL`
 * (variable que Netlify expone también en tiempo de ejecución de las funciones).
 */
export function appUrl() {
  const configured = process.env.APP_PUBLIC_URL;
  const site = process.env.URL;
  // Un APP_PUBLIC_URL de localhost (del .env local) nunca debe ganarle a la URL real del sitio publicado.
  const useSite = site && !/localhost|127\.0\.0\.1/.test(site) && (!configured || /localhost|127\.0\.0\.1/.test(configured));
  return ((useSite ? site : configured) || site || "http://localhost:3000").replace(/\/$/, "");
}

/** true cuando corre en Netlify / AWS Lambda (sin proceso persistente: no hay node-cron ni disco). */
export function isServerless() {
  return Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
}

export function agentMode(): "ai" | "guided" {
  if ((process.env.AGENT_MODE || "ai") === "guided") return "guided";
  return process.env.ANTHROPIC_API_KEY ? "ai" : "guided";
}

/** Solo se aceptan claves de prueba de Stripe; una clave live deja Stripe en modo simulado. */
export function stripeEnabled() {
  const k = process.env.STRIPE_SECRET_KEY || "";
  return k.startsWith("sk_test_") || k.startsWith("rk_test_");
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${appUrl()}/api/google/callback`;
}

/** Google conectado = credenciales OAuth + un token guardado (base de datos, variable o archivo local). */
export async function googleConnected() {
  return googleConfigured() && (await hasGoogleTokens());
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

export async function emailProvider(): Promise<"gmail" | "smtp" | "simulated"> {
  const p = process.env.EMAIL_PROVIDER || "gmail";
  if (p === "simulated") return "simulated";
  if (p === "smtp") return smtpConfigured() ? "smtp" : "simulated";
  if (await googleConnected()) return "gmail";
  // Sin Google autorizado pero con SMTP configurado, el correo sale igual por SMTP.
  return smtpConfigured() ? "smtp" : "simulated";
}

export function voiceProvider(): "elevenlabs" | "browser" {
  return (process.env.VOICE_PROVIDER || "elevenlabs") === "elevenlabs" && process.env.ELEVENLABS_AGENT_ID ? "elevenlabs" : "browser";
}

export function timeTravelEnabled() {
  // Se controla solo con la variable para que también funcione con `npm run demo` y en Netlify.
  return process.env.ENABLE_TIME_TRAVEL === "true";
}

export async function integrationStatus() {
  const connected = await googleConnected();
  return {
    agent: { mode: agentMode(), model: process.env.LLM_MODEL || "claude-sonnet-5-5" },
    stripe: stripeEnabled() ? "real" : "simulado",
    google: connected ? "real" : googleConfigured() ? "sin autorizar" : "simulado",
    email: await emailProvider(),
    voice: voiceProvider(),
    whatsapp: "simulado",
    instagram: process.env.INSTAGRAM_PROVIDER === "simulated" || !process.env.INSTAGRAM_ACCESS_TOKEN ? "simulado" : "real",
    timeTravel: timeTravelEnabled(),
  };
}
