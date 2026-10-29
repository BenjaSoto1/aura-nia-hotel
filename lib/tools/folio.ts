import { db } from "../db";
import { usd } from "../money";
import { finalizeCheckout, folioSummary } from "../lifecycle";
import { fail, ok, type ToolContext, type ToolResult } from "./context";
import { createPaymentLink } from "./payments";

export async function getFolio(input: { reservationCode: string }, ctx: ToolContext): Promise<ToolResult> {
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() } });
  if (!res) return fail(ctx.lang === "en" ? "Reservation not found." : "No encontré esa reserva.");
  const f = await folioSummary(res.id);
  return ok({
    reservationCode: res.code,
    lines: f.lines.map((l) => ({ label: l.label, amount: usd(l.amountCents, ctx.lang) })),
    payments: f.payments.filter((p) => p.status === "paid" || p.status === "authorized").map((p) => ({ kind: p.kind, status: p.status, amount: usd(p.amountCents, ctx.lang) })),
    total: usd(f.chargesCents, ctx.lang),
    paid: usd(f.paidCents, ctx.lang),
    balance: usd(f.balanceCents, ctx.lang),
  });
}

export async function checkout(input: { reservationCode: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  if (res.status === "checked_out") return ok({ reservationCode: res.code, status: "checked_out" });
  if (!["confirmed", "precheckin_done", "in_house"].includes(res.status)) return fail(en ? "That reservation cannot be checked out." : "Esa reserva no puede hacer checkout.");
  const f = await folioSummary(res.id);
  if (f.balanceCents > 0) {
    const link = await createPaymentLink({ reservationCode: res.code, purpose: "balance" }, ctx);
    return ok({ reservationCode: res.code, status: "balance_due", balance: usd(f.balanceCents, ctx.lang), note: "Al pagarse el saldo, el checkout se completa solo y se envía el comprobante." }, link.parts);
  }
  await finalizeCheckout(res.id);
  return ok({ reservationCode: res.code, status: "checked_out", note: "Garantía liberada y comprobante enviado." });
}
