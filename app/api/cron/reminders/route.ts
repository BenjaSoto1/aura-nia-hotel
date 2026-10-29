import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/jobs/reminders";

export const dynamic = "force-dynamic";

/**
 * Ejecuta los recordatorios vencidos. Con `npm start` / `npm run dev` lo hace node-cron cada minuto;
 * en hosting serverless llámalo cada minuto con un cron externo. Si CRON_SECRET está definido, se exige.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await processDueReminders();
  return NextResponse.json({ ok: true, ...r });
}

export const GET = run;
export const POST = run;
