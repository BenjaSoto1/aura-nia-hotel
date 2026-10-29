// Arranca el cron de recordatorios (cada minuto) en el runtime de Node con un proceso persistente
// (`npm run dev`, `npm start`). En plataformas serverless no hay proceso persistente: ahí hay que
// llamar a /api/cron/reminders cada minuto con un cron externo.
export async function register() {
  const serverless = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.VERCEL);
  if (process.env.NEXT_RUNTIME === "nodejs" && !serverless) {
    await import("./instrumentation-node");
  }
}
