import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/config";
import { now } from "@/lib/clock";
import { processDueReminders } from "@/lib/jobs/reminders";

export const dynamic = "force-dynamic";

// Respaldo del cron: la consola consulta este estado cada pocos segundos, así que aprovechamos
// para disparar los recordatorios vencidos (como máximo cada 30 s por instancia).
const g = globalThis as unknown as { __auraLastSweep?: number };

export async function GET() {
  if (!g.__auraLastSweep || Date.now() - g.__auraLastSweep > 30_000) {
    g.__auraLastSweep = Date.now();
    // Se espera (con tope) en vez de dejarlo suelto: en Netlify lo pendiente se congela al responder.
    const sweep = processDueReminders().catch((e) => console.error("[status] recordatorios", e));
    await Promise.race([sweep, new Promise((r) => setTimeout(r, 8_000))]);
  }
  return NextResponse.json({ ...(await integrationStatus()), now: await now(), today: new Date().toISOString() });
}
