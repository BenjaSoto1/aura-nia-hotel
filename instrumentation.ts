// Arranca el cron de recordatorios (solo en el runtime de Node y con un proceso persistente).
// En Netlify no hay proceso persistente: los recordatorios los dispara netlify/functions/reminders-cron.mts.
export async function register() {
  const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  if (process.env.NEXT_RUNTIME === "nodejs" && !serverless) {
    await import("./instrumentation-node");
  }
}
