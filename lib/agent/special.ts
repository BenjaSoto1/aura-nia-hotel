// Flujos transaccionales deterministas que funcionan igual en modo IA y guiado:
// check-in dentro del chat (Jumio y firma simulados), servicios desde botones, saldo, reseñas,
// y modificar o cancelar reservas (manage-flow.ts).
import { db } from "../db";
import { loadHotelPack, rate, service } from "../hotel-pack";
import { usd } from "../money";
import { postToChannel } from "../conversations";
import { completeCheckin, folioSummary, logEvent } from "../lifecycle";
import { bookService } from "../tools/services";
import { checkout } from "../tools/folio";
import { preauthorize } from "../tools/payments";
import { handoffToWhatsapp } from "../tools";
import type { ToolContext } from "../tools/context";
import type { InboundMessage, Part } from "../types";
import { normalizePhone } from "../phone";

import { getState, setState } from "./state";
import { manageTurn } from "./manage-flow";

export { getState, setState };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Busca la reserva activa más próxima del huésped de esta conversación. */
export async function activeReservationFor(ctx: ToolContext) {
  const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
  let guestId = conv?.guestId;
  if (!guestId && (ctx.channel === "whatsapp" || ctx.channel === "phone")) guestId = (await db.guest.findFirst({ where: { phone: ctx.channelUserId } }))?.id;
  if (!guestId) return null;
  return db.reservation.findFirst({
    where: { guestId, status: { in: ["confirmed", "precheckin_done", "in_house", "pending_payment"] } },
    orderBy: { checkIn: "asc" },
  });
}

export async function specialTurn(msg: InboundMessage, ctx: ToolContext): Promise<Part[] | null> {
  const en = ctx.lang === "en";
  const T = (es: string, e: string) => (en ? e : es);
  const b = msg.buttonId ?? "";
  const state = await getState(ctx);

  // ---------- Check-in dentro del chat ----------
  if (b.startsWith("checkin_start:")) {
    const code = b.split(":")[1];
    await setState(ctx, { ...state, step: "checkin_consent", code });
    return [
      {
        type: "text",
        text: T(
          `Hagamos tu check-in de ${code} aquí mismo 🛎\nNecesito tu consentimiento para verificar tu identidad con una foto de tu documento (verificación biométrica de Jumio, simulada en este demo). Solo guardamos el resultado, no la imagen.`,
          `Let's do your check-in for ${code} right here 🛎\nI need your consent to verify your identity with a photo of your ID (Jumio biometric check, simulated in this demo). We only keep the result, never the image.`,
        ),
      },
      { type: "buttons", items: [{ id: `checkin_consent:${code}`, title: T("Acepto", "I agree") }, { id: `checkin_desk:${code}`, title: T("Prefiero en recepción", "I'll do it at the desk") }] },
    ];
  }
  if (b.startsWith("checkin_desk:")) {
    await setState(ctx, { ...state, step: undefined });
    return [{ type: "text", text: T(`Perfecto, te esperamos en recepción desde las ${loadHotelPack().politicas.check_in}. ¡Buen viaje!`, `Perfect, we'll see you at the front desk from ${loadHotelPack().politicas.check_in}. Safe travels!`) }];
  }
  if (b.startsWith("checkin_consent:")) {
    const code = b.split(":")[1];
    await setState(ctx, { ...state, step: "checkin_photo", code });
    return [{ type: "text", text: T("Gracias. Envía una foto de tu pasaporte o documento de identidad 📷 (usa el clip para adjuntar).", "Thanks. Send a photo of your passport or ID 📷 (use the clip to attach).") }];
  }
  if (msg.attachment && (state.step === "checkin_photo" || state.step === "checkin_consent")) {
    const code = state.code as string;
    await postToChannel(ctx.channel, ctx.channelUserId, [{ type: "text", text: T("🔎 Verificando identidad… (documento + prueba de vida)", "🔎 Verifying identity… (document + liveness)") }]);
    await sleep(2000);
    const res = await db.reservation.findUnique({ where: { code } });
    if (res) await logEvent(res.id, "identity_verified", "Jumio (simulado): documento y prueba de vida aprobados. Imagen descartada.");
    await setState(ctx, { ...state, step: "checkin_sign", code });
    return [
      { type: "text", text: T("✅ Identidad verificada (simulado). La imagen fue descartada.", "✅ Identity verified (simulated). The image was discarded.") },
      {
        type: "text",
        text: T(
          `Último paso: firma las condiciones de estadía.\n• Check-in ${loadHotelPack().politicas.check_in} / check-out ${loadHotelPack().politicas.check_out}\n• ${loadHotelPack().politicas.mascotas}\n• Prohibido fumar en habitaciones`,
          `Last step: sign the stay terms.\n• Check-in ${loadHotelPack().politicas.check_in} / check-out ${loadHotelPack().politicas.check_out}\n• ${loadHotelPack().politicas.mascotas_en ?? loadHotelPack().politicas.mascotas}\n• No smoking in rooms`,
        ),
      },
      { type: "buttons", items: [{ id: `checkin_sign:${code}`, title: T("✍️ Firmar condiciones", "✍️ Sign terms") }] },
    ];
  }
  if (b.startsWith("checkin_sign:")) {
    const code = b.split(":")[1];
    const res = await db.reservation.findUnique({ where: { code } });
    if (!res) return [{ type: "text", text: T("No encontré la reserva.", "Reservation not found.") }];
    await logEvent(res.id, "terms_signed", `Condiciones firmadas en ${ctx.channel}`);
    await setState(ctx, { ...state, step: undefined });
    if (res.paymentMode === "pay_at_hotel") {
      const pre = await db.payment.findFirst({ where: { reservationId: res.id, kind: "preauth", status: "authorized" } });
      if (!pre) {
        const r = await preauthorize({ reservationCode: code }, ctx);
        return [
          { type: "text", text: T(`Firmado ✍️. Como tu tarifa es de pago en el hotel, autoriza una garantía de ${usd((rate(res.ratePlanCode).garantia_usd ?? 100) * 100)} (se retiene, no se cobra). Al autorizarla te doy tu habitación.`, `Signed ✍️. Since you pay at the hotel, please authorize a ${usd((rate(res.ratePlanCode).garantia_usd ?? 100) * 100, "en")} guarantee (held, not charged). Then I'll give you your room.`) },
          ...(r.parts ?? []),
        ];
      }
    }
    await completeCheckin(res.id);
    return [];
  }

  // ---------- Servicios ----------
  if (b.startsWith("svc:")) {
    const [, svcCode, code] = b.split(":");
    const svc = service(svcCode);
    await setState(ctx, { ...state, step: "svc_when", svcCode, code });
    return [
      {
        type: "text",
        text: T(
          `¡Claro! ${svc?.nombre}${svc?.horario ? ` (horario ${svc.horario})` : ""}${svc?.precio_usd ? `, ${usd(svc.precio_usd * 100)} al folio` : ""}. ¿Para qué día y hora? Ej.: "15 nov 19:00"`,
          `Sure! ${svc?.nombre_en ?? svc?.nombre}${svc?.horario ? ` (hours ${svc.horario})` : ""}${svc?.precio_usd ? `, ${usd(svc.precio_usd * 100, "en")} to your bill` : ""}. What day and time? E.g. "Nov 15 7pm"`,
        ),
      },
    ];
  }
  if (state.step === "svc_when" && msg.text) {
    await setState(ctx, { ...state, step: undefined });
    const r = await bookService({ reservationCode: state.code, serviceCode: state.svcCode, datetime: msg.text }, ctx);
    if (!r.ok) return [{ type: "text", text: r.error! }];
    return [
      { type: "text", text: T(`Listo ✅ ${r.data!.service} para el ${r.data!.when}. ${r.data!.charged}.`, `Done ✅ ${r.data!.service} on ${r.data!.when}. ${r.data!.charged}.`) + (r.data!.note ? ` ${r.data!.note}` : "") },
      { type: "buttons", items: [{ id: `folio:${state.code}`, title: T("Ver mi cuenta", "See my bill") }] },
    ];
  }

  // ---------- Folio, saldo, reseñas ----------
  if (b.startsWith("folio:")) {
    const code = b.split(":")[1];
    const res = await db.reservation.findUnique({ where: { code } });
    if (!res) return [{ type: "text", text: "?" }];
    const f = await folioSummary(res.id);
    const lines = f.lines.map((l) => `• ${l.label}: ${usd(l.amountCents, ctx.lang)}`).join("\n");
    return [
      { type: "text", text: `${T("Tu cuenta", "Your bill")} ${code}\n${lines}\n${T("Pagado", "Paid")}: ${usd(f.paidCents, ctx.lang)}\n*${T("Saldo", "Balance")}: ${usd(f.balanceCents, ctx.lang)}*` },
      ...(f.balanceCents > 0 ? [{ type: "buttons" as const, items: [{ id: `pay_balance:${code}`, title: T("Pagar saldo y salir", "Pay balance & check out") }] }] : []),
    ];
  }
  if (b.startsWith("pay_balance:") || b.startsWith("checkout:")) {
    const code = b.split(":")[1];
    const r = await checkout({ reservationCode: code }, ctx);
    if (!r.ok) return [{ type: "text", text: r.error! }];
    if (r.data!.status === "checked_out") return [];
    return [{ type: "text", text: T(`Tu saldo es ${r.data!.balance}. Págalo aquí y cierro tu checkout:`, `Your balance is ${r.data!.balance}. Pay here and I'll close your check-out:`) }, ...(r.parts ?? [])];
  }
  if (b.startsWith("review:")) {
    const [, n, code] = b.split(":");
    const res = await db.reservation.findUnique({ where: { code } });
    if (res) await logEvent(res.id, "review", `${n}/5`);
    return [{ type: "text", text: Number(n) >= 4 ? T("¡Gracias! Nos alegra mucho 💚 Te esperamos pronto.", "Thank you! We're so glad 💚 Hope to see you soon.") : T("Gracias por contarnos. Una persona del equipo te escribirá para saber cómo mejorar.", "Thanks for telling us. A team member will reach out to learn how we can improve.") }];
  }

  // ---------- Pasar a WhatsApp (Instagram / Messenger) ----------
  if (b === "handoff_wa" || b.startsWith("handoff_wa:")) {
    const quoteId = b.split(":")[1] ?? state.quoteId;
    const conv = await db.conversation.findUnique({ where: { channel_channelUserId: { channel: ctx.channel, channelUserId: ctx.channelUserId } } });
    const guest = conv?.guestId ? await db.guest.findUnique({ where: { id: conv.guestId } }) : null;
    if (guest?.phone) {
      const r = await handoffToWhatsapp({ phone: guest.phone, quoteId }, ctx);
      return [{ type: "text", text: String(r.data?.say ?? "") }, ...(r.parts ?? [])];
    }
    await setState(ctx, { ...state, step: "handoff_phone", quoteId });
    return [{ type: "text", text: T("¡Genial! ¿A qué número de WhatsApp te escribo? (con código de país)", "Great! Which WhatsApp number should I write to? (with country code)") }];
  }
  if (state.step === "handoff_phone" && msg.text) {
    const phone = normalizePhone(msg.text);
    if (!phone) return [{ type: "text", text: T("Ese número no parece válido. Prueba con el formato +1 787 555 0123.", "That number doesn't look valid. Try +1 787 555 0123.") }];
    await setState(ctx, { ...state, step: undefined });
    const r = await handoffToWhatsapp({ phone, quoteId: state.quoteId }, ctx);
    return [{ type: "text", text: String(r.data?.say ?? r.error) }, ...(r.parts ?? [])];
  }

  // ---------- Modificar o cancelar una reserva ----------
  const managed = await manageTurn(msg, ctx);
  if (managed) return managed;

  return null;
}
