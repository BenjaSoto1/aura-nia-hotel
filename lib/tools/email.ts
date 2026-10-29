import * as React from "react";
import { render, toPlainText } from "@react-email/render";
import { createEvent } from "ics";
import nodemailer from "nodemailer";
import { db } from "../db";
import { appUrl, emailProvider } from "../config";
import { formatLong, formatRange, hotelLocalToUtc, nightsBetween, toISODate } from "../dates";
import { loadHotelPack, rate, rateName, room, roomName, service } from "../hotel-pack";
import { usd } from "../money";
import { gmailApi } from "../integrations/google";
import { googleCalendarTemplateLink } from "./calendar";
import type { EmailData } from "@/emails/shared";
import ReservationConfirmed, { confirmationSubject } from "@/emails/ReservationConfirmed";
import PrecheckinReminder, { precheckinSubject } from "@/emails/PrecheckinReminder";
import CheckoutReceipt, { receiptSubject } from "@/emails/CheckoutReceipt";

export type EmailKind = "confirmation" | "precheckin" | "receipt";

export async function buildEmailData(reservationId: string): Promise<EmailData & { start: Date; end: Date; range: string; to: string }> {
  const res = await db.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { guest: true, payments: true, services: { orderBy: { createdAt: "asc" } }, folioLines: { orderBy: { createdAt: "asc" } } },
  });
  const pack = loadHotelPack();
  const lang = (res.guest.language === "en" ? "en" : "es") as "es" | "en";
  const tz = pack.hotel.zona_horaria;
  const start = hotelLocalToUtc(toISODate(res.checkIn), pack.politicas.check_in, tz);
  const end = hotelLocalToUtc(toISODate(res.checkOut), pack.politicas.check_out, tz);
  const plan = rate(res.ratePlanCode);
  const paidPre = res.payments.some((p) => p.kind === "prepayment" && p.status === "paid");
  const paymentStatus =
    res.paymentMode === "prepaid"
      ? paidPre
        ? lang === "en" ? "Paid ✓" : "Pagado ✓"
        : lang === "en" ? "Pending payment" : "Pendiente de pago"
      : lang === "en" ? "Pay at the hotel" : "Pagas en el hotel";
  const charges = res.folioLines.reduce((s, l) => s + l.amountCents, 0);
  const paid = res.payments.filter((p) => p.status === "paid" && p.kind !== "preauth").reduce((s, p) => s + p.amountCents, 0);
  const phone = res.guest.phone ?? "";
  const waLink = `${appUrl()}/canal/whatsapp?u=${encodeURIComponent(phone)}`;
  const firstName = (res.guest.fullName ?? "").split(" ")[0] || (lang === "en" ? "guest" : "huésped");
  const title = `${pack.hotel.nombre} · ${roomName(res.roomTypeCode, lang)} · ${res.code}`;

  return {
    lang,
    to: res.guest.email ?? "",
    start,
    end,
    range: formatRange(res.checkIn, res.checkOut, lang),
    hotel: { name: pack.hotel.nombre, tagline: pack.hotel.lema, phone: pack.hotel.telefono, email: pack.hotel.correo, address: pack.hotel.direccion, city: pack.hotel.ciudad, colors: pack.hotel.colores },
    agentName: pack.agente.nombre,
    guestName: res.guest.fullName ?? "",
    firstName,
    code: res.code,
    roomName: roomName(res.roomTypeCode, lang),
    roomImage: absolute(room(res.roomTypeCode).foto),
    arrivalLong: formatLong(res.checkIn, lang),
    arrivalShort: shortDate(res.checkIn, lang),
    departureShort: shortDate(res.checkOut, lang),
    experiences: res.services.map((s) => {
      const svc = service(s.serviceCode);
      return { name: svc ? (lang === "en" ? svc.nombre_en ?? svc.nombre : svc.nombre) : s.serviceCode, when: s.datetime, image: svc?.foto ? absolute(svc.foto) : undefined };
    }),
    manageLink: waLink,
    checkInLong: formatLong(res.checkIn, lang),
    checkOutLong: formatLong(res.checkOut, lang),
    nights: nightsBetween(res.checkIn, res.checkOut),
    adults: res.adults,
    pets: res.pets,
    rateName: rateName(res.ratePlanCode, lang),
    cancellation: lang === "en" ? plan.cancelacion_en ?? plan.cancelacion : plan.cancelacion,
    paymentStatus,
    lines: res.folioLines.map((l) => ({ label: l.label, amount: usd(l.amountCents, lang), negative: l.amountCents < 0 })),
    total: usd(charges, lang),
    checkInTime: pack.politicas.check_in,
    checkOutTime: pack.politicas.check_out,
    services: pack.servicios
      .filter((s) => s.codigo !== "SPA" && !res.services.some((b) => b.serviceCode === s.codigo))
      .map((s) => ({
        name: lang === "en" ? s.nombre_en ?? s.nombre : s.nombre,
        description: s.descripcion ?? s.horario ?? "",
        image: s.foto ? absolute(s.foto) : undefined,
        price: s.precio_usd ? usd(s.precio_usd * 100, lang) : undefined,
        link: waLink,
      })),
    gcalLink: googleCalendarTemplateLink({ title, start, end, details: `${res.code} · ${pack.hotel.telefono}`, location: pack.hotel.direccion }),
    whatsappLink: waLink,
    precheckinUrl: res.checkinToken ? `${appUrl()}/checkin/${res.checkinToken}` : undefined,
    roomNumber: res.roomNumber,
    payments: res.payments
      .filter((p) => p.status === "paid" && p.kind !== "preauth")
      .map((p) => ({ label: `${p.kind === "prepayment" ? (lang === "en" ? "Prepayment" : "Prepago") : lang === "en" ? "Balance" : "Saldo"} · ${p.provider === "stripe" ? "Stripe" : lang === "en" ? "simulated" : "simulado"}`, amount: usd(p.amountCents, lang) })),
    paidTotal: usd(paid, lang),
    balance: usd(charges - paid, lang),
  };
}

function shortDate(d: Date, lang: "es" | "en") {
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
}

function absolute(url: string) {
  return /^https?:/.test(url) ? url : `${appUrl()}${url}`;
}

export async function renderReservationEmail(reservationId: string, kind: EmailKind) {
  const d = await buildEmailData(reservationId);
  let element: React.ReactElement;
  let subject: string;
  if (kind === "confirmation") {
    element = React.createElement(ReservationConfirmed, { d });
    subject = confirmationSubject(d, d.range);
  } else if (kind === "precheckin") {
    element = React.createElement(PrecheckinReminder, { d });
    subject = precheckinSubject(d);
  } else {
    element = React.createElement(CheckoutReceipt, { d });
    subject = receiptSubject(d);
  }
  const html = await render(element);
  const text = toPlainText(html);
  return { subject, html, text, to: d.to, data: d };
}

/** Correo que firma como organizador del evento: debe ser el remitente real para que Gmail confíe en la invitación. */
function senderEmail() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_SENDER || "";
}

/**
 * Invitación de calendario (METHOD:REQUEST) con el huésped como invitado: Gmail la muestra como
 * evento con "Sí / Quizás / No" y la agrega a su Google Calendar, sin necesidad de OAuth.
 */
function buildIcs(d: Awaited<ReturnType<typeof buildEmailData>>) {
  const toArr = (x: Date) => [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes()] as [number, number, number, number, number];
  const organizer = senderEmail() || d.hotel.email;
  const { value, error } = createEvent({
    uid: `${d.code}@aura-nia`,
    method: "REQUEST",
    start: toArr(d.start),
    startInputType: "utc",
    startOutputType: "utc",
    end: toArr(d.end),
    endInputType: "utc",
    endOutputType: "utc",
    title: `${d.hotel.name} · ${d.roomName} · ${d.code}`,
    description: `${d.roomName} · ${d.code}\n${d.lang === "en" ? "Check-in from" : "Check-in desde las"} ${d.checkInTime} · ${d.lang === "en" ? "check-out until" : "check-out hasta las"} ${d.checkOutTime}`,
    location: d.hotel.address,
    status: "CONFIRMED",
    organizer: { name: d.hotel.name, email: organizer },
    attendees: d.to ? [{ name: d.guestName || d.to, email: d.to, rsvp: true, partstat: "NEEDS-ACTION", role: "REQ-PARTICIPANT" }] : [],
    alarms: [{ action: "display", description: "Check-in", trigger: { hours: 24, before: true } }],
  });
  if (error) throw error;
  return value!;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");
const encodeHeader = (s: string) => `=?UTF-8?B?${b64(s)}?=`;
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");

function buildMime(opts: { fromName: string; to: string; subject: string; html: string; text: string; ics?: string }) {
  const mixed = "mixed_" + Math.random().toString(36).slice(2);
  const alt = "alt_" + Math.random().toString(36).slice(2);
  // Gmail completa el remitente con la cuenta conectada; con GMAIL_SENDER mostramos además el nombre del hotel.
  const sender = process.env.GMAIL_SENDER;
  const lines = [
    ...(sender ? [`From: ${encodeHeader(opts.fromName)} <${sender}>`] : []),
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
    `--${alt}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(opts.text)),
    `--${alt}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(opts.html)),
  ];
  if (opts.ics) {
    // La parte text/calendar dentro de "alternative" es lo que Gmail interpreta como invitación.
    lines.push(`--${alt}`, "Content-Type: text/calendar; charset=UTF-8; method=REQUEST", "Content-Transfer-Encoding: base64", "", wrap76(b64(opts.ics)));
  }
  lines.push(`--${alt}--`);
  if (opts.ics) {
    lines.push(
      `--${mixed}`,
      'Content-Type: application/ics; name="invite.ics"',
      'Content-Disposition: attachment; filename="invite.ics"',
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(opts.ics)),
    );
  }
  lines.push(`--${mixed}--`, "");
  return lines.join("\r\n");
}

/** Gmail con contraseña de aplicación por defecto; SMTP_HOST permite cualquier otro proveedor (Brevo, Resend SMTP, etc.). */
function smtpTransport() {
  const auth = { user: process.env.SMTP_USER, pass: (process.env.SMTP_APP_PASSWORD || "").replace(/\s+/g, "") };
  if (!process.env.SMTP_HOST) return nodemailer.createTransport({ service: "gmail", auth });
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth });
}

export async function sendReservationEmail(reservationId: string, kind: EmailKind) {
  const r = await renderReservationEmail(reservationId, kind);
  const provider = await emailProvider();
  const fromName = process.env.EMAIL_FROM_NAME || loadHotelPack().hotel.nombre;
  const ics = kind === "confirmation" ? buildIcs(r.data) : undefined;
  let status = "simulated";
  let error: string | null = null;
  try {
    if (provider === "gmail") {
      const raw = Buffer.from(buildMime({ fromName, to: r.to, subject: r.subject, html: r.html, text: r.text, ics })).toString("base64url");
      await (await gmailApi()).users.messages.send({ userId: "me", requestBody: { raw } });
      status = "sent";
    } else if (provider === "smtp") {
      await smtpTransport().sendMail({
        from: `"${fromName}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: r.to,
        subject: r.subject,
        html: r.html,
        text: r.text,
        // icalEvent = parte text/calendar con method=REQUEST: Gmail la muestra como invitación de Google Calendar.
        icalEvent: ics ? { method: "REQUEST", filename: "invite.ics", content: ics } : undefined,
      });
      status = "sent";
    }
  } catch (e) {
    status = "failed";
    error = String(e);
  }
  await db.emailLog.create({ data: { reservationId, kind, to: r.to, subject: r.subject, html: r.html, provider, status, error } });
  await db.reservationEvent.create({
    data: { reservationId, type: status === "failed" ? "email_failed" : "email_sent", detail: `${kind} → ${r.to} (${provider}${status === "simulated" ? ", simulado" : ""})${error ? " · " + error : ""}` },
  });
  return { status, provider, subject: r.subject };
}
