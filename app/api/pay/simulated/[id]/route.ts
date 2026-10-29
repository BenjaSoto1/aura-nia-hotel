import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markPaymentPaid } from "@/lib/lifecycle";
import { stripeEnabled } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Botón "Pagar (simulado)": misma lógica que el webhook de Stripe. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pay = await db.payment.findUnique({ where: { id } });
  if (!pay) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (pay.provider !== "simulated" && stripeEnabled()) return NextResponse.json({ error: "Este pago es de Stripe" }, { status: 400 });
  if (pay.status === "expired") return NextResponse.json({ error: "El enlace venció" }, { status: 410 });
  await markPaymentPaid(id, { externalId: `sim_${id}` });
  const res = await db.reservation.findUnique({ where: { id: pay.reservationId } });
  return NextResponse.json({ ok: true, code: res?.code, status: res?.status });
}
