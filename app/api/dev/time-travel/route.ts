import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { now, setOffsetMs, travelTo } from "@/lib/clock";
import { timeTravelEnabled } from "@/lib/config";
import { processDueReminders } from "@/lib/jobs/reminders";
import { reservationTimes } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ now: await now(), enabled: timeTravelEnabled() });
}

/** body: { action: "precheckin" | "checkout_day" | "plus1h" | "plus1d" | "reset", reservationId? } */
export async function POST(req: Request) {
  try {
    return await travel(req);
  } catch (e) {
    console.error("[time-travel]", e);
    return NextResponse.json({ error: `No se pudo mover el reloj: ${(e as Error).message}` }, { status: 500 });
  }
}

async function travel(req: Request) {
  if (!timeTravelEnabled()) return NextResponse.json({ error: "Viaje en el tiempo desactivado" }, { status: 403 });
  const { action, reservationId } = await req.json();
  const current = await now();
  let target: Date | null = null;
  let code: string | undefined;

  if (action === "reset") {
    await setOffsetMs(0);
    return NextResponse.json({ now: await now(), processed: 0 });
  }
  if (action === "plus1h") target = new Date(current.getTime() + 3_600_000);
  if (action === "plus1d") target = new Date(current.getTime() + 86_400_000);
  if (action === "precheckin" || action === "checkout_day") {
    const res = reservationId
      ? await db.reservation.findUnique({ where: { id: reservationId } })
      : await db.reservation.findFirst({ where: { status: { in: ["confirmed", "precheckin_done", "in_house"] } }, orderBy: { createdAt: "desc" } });
    if (!res) return NextResponse.json({ error: "No hay una reserva confirmada para simular. Reserva con tarifa Flexible (o paga la prepago) y vuelve a intentar." }, { status: 404 });
    code = res.code;
    const rem = await db.scheduledReminder.findUnique({ where: { reservationId_kind: { reservationId: res.id, kind: action === "precheckin" ? "precheckin" : "checkout_notice" } } });
    const times = await reservationTimes(res.id);
    target = new Date((rem?.runAt ?? (action === "precheckin" ? new Date(times.arrival.getTime() - 86_400_000) : times.checkoutNotice)).getTime() + 60_000);
  }
  if (!target) return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  const at = await travelTo(target);
  const r = await processDueReminders();
  return NextResponse.json({ now: at, processed: r.processed, code });
}
