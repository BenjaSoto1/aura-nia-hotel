// Función programada de Netlify: cada minuto dispara los recordatorios de la app
// (pre-check-in, aviso de salida, encuesta y vencimiento de bloqueos de pago).
// Solo corre en deploys publicados (no en previews ni en `netlify dev`).
export default async () => {
  const base = (process.env.APP_PUBLIC_URL || process.env.URL || "").replace(/\/$/, "");
  if (!base) return new Response("Sin URL del sitio", { status: 500 });
  const res = await fetch(`${base}/api/cron/reminders`, {
    method: "POST",
    headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
  });
  const body = await res.text();
  console.log("[reminders-cron]", res.status, body);
  return new Response(body, { status: res.status });
};

export const config = { schedule: "* * * * *" };
