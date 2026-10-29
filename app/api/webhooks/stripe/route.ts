import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/integrations/stripe";
import { stripeEnabled } from "@/lib/config";
import { logEvent, markPaymentPaid } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "Stripe no configurado" }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Falta STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Firma inválida: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    const paymentId = s.metadata?.paymentId;
    if (paymentId) {
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      // Pagos normales: payment_status = paid. Garantía (captura manual): unpaid pero autorizada.
      const pay = await db.payment.findUnique({ where: { id: paymentId } });
      if (pay && (s.payment_status === "paid" || pay.kind === "preauth")) {
        await markPaymentPaid(paymentId, { externalId: s.id, paymentIntent: pi ?? undefined });
      }
    }
  } else if (event.type === "checkout.session.expired") {
    const s = event.data.object as Stripe.Checkout.Session;
    const paymentId = s.metadata?.paymentId;
    if (paymentId) {
      const pay = await db.payment.findUnique({ where: { id: paymentId } });
      if (pay?.status === "link_sent") {
        await db.payment.update({ where: { id: paymentId }, data: { status: "expired" } });
        await logEvent(pay.reservationId, "payment_link_expired", "Checkout de Stripe venció");
      }
    }
  }
  return NextResponse.json({ received: true });
}
