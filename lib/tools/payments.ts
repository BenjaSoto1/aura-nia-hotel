import { db } from "../db";
import { now } from "../clock";
import { appUrl, stripeEnabled } from "../config";
import { loadHotelPack, rate, roomName } from "../hotel-pack";
import { usd } from "../money";
import { postToChannel } from "../conversations";
import { stripe } from "../integrations/stripe";
import { folioSummary, logEvent } from "../lifecycle";
import { fail, ok, type ToolContext, type ToolResult } from "./context";
import type { Part } from "../types";

const LINK_MINUTES = 31; // Stripe exige que expires_at sea al menos 30 min en el futuro

async function createLink(opts: {
  reservationId: string;
  kind: "prepayment" | "balance" | "preauth";
  amountCents: number;
  label: string;
  email?: string | null;
  code: string;
}) {
  // Reutiliza un enlace vigente del mismo tipo y monto
  const existing = await db.payment.findFirst({
    where: { reservationId: opts.reservationId, kind: opts.kind, status: "link_sent", amountCents: opts.amountCents },
    orderBy: { createdAt: "desc" },
  });
  if (existing && Date.now() - existing.createdAt.getTime() < 25 * 60_000 && existing.url) return existing;

  const pay = await db.payment.create({
    data: { reservationId: opts.reservationId, kind: opts.kind, provider: stripeEnabled() ? "stripe" : "simulated", amountCents: opts.amountCents, status: "link_sent" },
  });
  let url = `${appUrl()}/pago/simulado/${pay.id}`;
  let externalId: string | null = null;
  if (stripeEnabled()) {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: opts.amountCents, product_data: { name: opts.label } } }],
      customer_email: opts.email ?? undefined,
      metadata: { reservationCode: opts.code, paymentId: pay.id, kind: opts.kind },
      payment_intent_data: {
        metadata: { reservationCode: opts.code, paymentId: pay.id, kind: opts.kind },
        ...(opts.kind === "preauth" ? { capture_method: "manual" as const } : {}),
      },
      success_url: `${appUrl()}/pago/exito?code=${opts.code}&pid=${pay.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/pago/exito?code=${opts.code}&pid=${pay.id}&cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + LINK_MINUTES * 60,
    });
    url = session.url!;
    externalId = session.id;
  }
  const updated = await db.payment.update({ where: { id: pay.id }, data: { url, externalId } });
  await logEvent(opts.reservationId, "payment_link_sent", `${opts.kind} ${usd(opts.amountCents)} · ${updated.provider}`);
  return updated;
}

/** En canales de voz el enlace no se lee: se envía al WhatsApp del huésped. */
async function deliverToWhatsappIfVoice(ctx: ToolContext, phone: string | null | undefined, parts: Part[]) {
  if (ctx.channel === "phone" && phone) {
    await postToChannel("whatsapp", phone, parts);
    return true;
  }
  return false;
}

export async function createPaymentLink(input: { reservationCode: string; purpose?: "prepayment" | "balance" }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() }, include: { guest: true } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  const purpose = input.purpose ?? (res.status === "pending_payment" ? "prepayment" : "balance");
  let amount: number;
  let label: string;
  if (purpose === "prepayment") {
    if (res.status !== "pending_payment") return fail(en ? "This reservation does not need a prepayment." : "Esta reserva no requiere prepago.");
    if (res.holdExpiresAt && res.holdExpiresAt < (await now())) return fail(en ? "The 30-minute hold expired; quote again." : "El bloqueo de 30 minutos venció; hay que cotizar de nuevo.");
    amount = res.totalCents;
    label = `${loadHotelPack().hotel.nombre} · ${res.code} · ${roomName(res.roomTypeCode, ctx.lang)}`;
  } else {
    const f = await folioSummary(res.id);
    if (f.balanceCents <= 0) return fail(en ? "There is no balance due." : "No hay saldo pendiente.");
    amount = f.balanceCents;
    label = `${loadHotelPack().hotel.nombre} · ${res.code} · ${en ? "Balance" : "Saldo"}`;
  }
  const pay = await createLink({ reservationId: res.id, kind: purpose, amountCents: amount, label, email: res.guest.email, code: res.code });
  const parts: Part[] = [{ type: "payment_link", url: pay.url!, amountCents: amount, label: purpose === "prepayment" ? (en ? "Pay booking" : "Pagar reserva") : en ? "Pay balance" : "Pagar saldo" }];
  const sentToWa = await deliverToWhatsappIfVoice(ctx, res.guest.phone, [
    { type: "text", text: en ? `Here is the secure payment link for ${res.code} (${usd(amount, "en")}):` : `Aquí tienes el enlace de pago seguro de ${res.code} (${usd(amount)}):` },
    ...parts,
  ]);
  return ok(
    {
      reservationCode: res.code,
      purpose,
      amount: usd(amount, ctx.lang),
      provider: pay.provider,
      sentToWhatsapp: sentToWa ? res.guest.phone : null,
      instructions: sentToWa
        ? "Di que enviaste el enlace de pago al WhatsApp del huésped. No leas la URL."
        : "El enlace se muestra como botón. No escribas la URL en el texto. La reserva se confirma sola cuando llegue el pago.",
    },
    ctx.channel === "phone" ? [] : parts,
  );
}

export async function preauthorize(input: { reservationCode: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() }, include: { guest: true } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  if (res.paymentMode !== "pay_at_hotel") return fail(en ? "Only pay-at-hotel bookings need a guarantee." : "Solo las reservas con pago en el hotel requieren garantía.");
  const already = await db.payment.findFirst({ where: { reservationId: res.id, kind: "preauth", status: "authorized" } });
  if (already) return ok({ reservationCode: res.code, status: "already_authorized" });
  const amount = Math.round((rate(res.ratePlanCode).garantia_usd ?? 100) * 100);
  const pay = await createLink({ reservationId: res.id, kind: "preauth", amountCents: amount, label: `${loadHotelPack().hotel.nombre} · ${res.code} · ${en ? "Guarantee (hold, not charged)" : "Garantía (retención, no se cobra)"}`, email: res.guest.email, code: res.code });
  const parts: Part[] = [{ type: "payment_link", url: pay.url!, amountCents: amount, label: en ? "Authorize guarantee" : "Autorizar garantía" }];
  await deliverToWhatsappIfVoice(ctx, res.guest.phone, [
    {
      type: "text",
      text: en
        ? `To secure ${res.code}, authorize a ${usd(amount, "en")} guarantee. It's a hold, not a charge, and it's released at check-out.`
        : `Para asegurar ${res.code}, autoriza una garantía de ${usd(amount)}. Es una retención, no un cobro, y se libera al hacer checkout.`,
    },
    ...parts,
  ]);
  return ok({ reservationCode: res.code, amount: usd(amount, ctx.lang), url: pay.url, note: "Retención con captura manual; se libera al hacer checkout." }, ctx.channel === "phone" ? [] : parts);
}

export { createLink };
