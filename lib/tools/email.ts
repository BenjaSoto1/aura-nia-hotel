import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, toPlainText } from "@react-email/render";
import { createEvent } from "ics";
import nodemailer from "nodemailer";
import { db } from "../db";
import { appUrl, emailProvider } from "../config";
import { formatDayMonth, formatLong, formatRange, formatServiceWhen, hotelLocalToUtc, nightsBetween, parseISODate, toISODate } from "../dates";
import { loadHotelPack, rate, rateName, room, roomName, service } from "../hotel-pack";
import { usd } from "../money";
import { gmailApi } from "../integrations/google";
import { googleCalendarTemplateLink } from "./calendar";
import { chatLink, manageLinkFor } from "../manage-link";
import type { EmailData } from "@/emails/shared";
import ReservationConfirmed, { confirmationSubject, modificationSubject } from "@/emails/ReservationConfirmed";
import ReservationCancelled, { cancellationSubject } from "@/emails/ReservationCancelled";
import PrecheckinReminder, { precheckinSubject } from "@/emails/PrecheckinReminder";
import CheckoutReceipt, { receiptSubject } from "@/emails/CheckoutReceipt";
import ServiceBooked, { serviceSubject } from "@/emails/ServiceBooked";

export type EmailKind = "confirmation" | "modification" | "cancellation" | "precheckin" | "receipt" | "service";

/** Extras por envío: texto destacado (cambios aplicados o política de cancelación). */
export interface EmailOptions {
  notice?: string;
  /** kind "service": qué servicio reservado se confirma. */
  serviceBookingId?: string;
}

export async function buildEmailData(reservationId: string, opts: EmailOptions = {}): Promise<EmailData & { start: Date; end: Date; range: string; to: string }> {
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
    roomImage: emailImage(room(res.roomTypeCode).foto, "hero"),
    arrivalLong: formatLong(res.checkIn, lang),
    arrivalShort: formatDayMonth(res.checkIn, lang),
    departureShort: formatDayMonth(res.checkOut, lang),
    experiences: res.services.map((s) => {
      const svc = service(s.serviceCode);
      return { name: svc ? (lang === "en" ? svc.nombre_en ?? svc.nombre : svc.nombre) : s.serviceCode, when: formatServiceWhen(s.datetime, lang), image: svc?.foto ? emailImage(svc.foto, "thumb") : undefined };
    }),
    manageLink: manageLinkFor(res.code),
    chatLink: chatLink(),
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
      .filter((s) => s.sugerir && !res.services.some((b) => b.serviceCode === s.codigo))
      .map((s) => ({
        name: lang === "en" ? s.nombre_en ?? s.nombre : s.nombre,
        description: s.descripcion ?? s.horario ?? "",
        image: s.foto ? emailImage(s.foto, "card") : undefined,
        price: s.precio_usd ? usd(s.precio_usd * 100, lang) : undefined,
        link: waLink,
      })),
    gcalLink: googleCalendarTemplateLink({ title, start, end, details: `${res.code} · ${pack.hotel.telefono}`, location: pack.hotel.direccion }),
    whatsappLink: waLink,
    precheckinUrl: res.checkinToken ? `${appUrl()}/checkin/${res.checkinToken}` : undefined,
    roomNumber: res.roomNumber,
    payments: res.payments
      .filter((p) => p.status === "paid" && p.kind !== "preauth")
      .map((p) => ({ label: `${p.kind === "prepayment" ? (lang === "en" ? "Prepayment" : "Prepago") : lang === "en" ? "Balance" : "Saldo"} · ${p.provider === "stripe" ? (lang === "en" ? "payment gateway" : "pasarela de pago") : lang === "en" ? "simulated" : "simulado"}`, amount: usd(p.amountCents, lang) })),
    paidTotal: usd(paid, lang),
    balance: usd(charges - paid, lang),
    notice: opts.notice,
    bookAgainLink: appUrl(),
    service: serviceData(res.services.find((b) => b.id === opts.serviceBookingId), lang),
  };
}

/** Datos del servicio confirmado (correo "service"): nombre, día y hora, foto, cargo y horario de inicio/fin. */
function serviceData(b: { id: string; serviceCode: string; datetime: string; notes: string | null } | undefined, lang: "es" | "en") {
  if (!b) return undefined;
  const pack = loadHotelPack();
  const svc = service(b.serviceCode);
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/.exec(b.datetime);
  const start = m ? hotelLocalToUtc(m[1], m[2], pack.hotel.zona_horaria) : null;
  const end = start ? new Date(start.getTime() + (svc?.duracion_min ?? 60) * 60_000) : null;
  return {
    id: b.id,
    name: svc ? (lang === "en" ? svc.nombre_en ?? svc.nombre : svc.nombre) : b.serviceCode,
    description: svc?.descripcion ?? "",
    image: svc?.foto ? emailImage(svc.foto, "hero") : undefined,
    dayLong: m ? formatLong(parseISODate(m[1]), lang) : b.datetime,
    time: m?.[2] ?? "",
    duration: svc?.duracion_min ? [Math.floor(svc.duracion_min / 60) ? `${Math.floor(svc.duracion_min / 60)} h` : "", svc.duracion_min % 60 ? `${svc.duracion_min % 60} min` : ""].filter(Boolean).join(" ") : "",
    price: svc?.precio_usd ? usd(svc.precio_usd * 100, lang) : undefined,
    notes: b.notes ?? undefined,
    start,
    end,
    gcalLink: start && end ? googleCalendarTemplateLink({ title: `${pack.hotel.nombre} · ${svc ? (lang === "en" ? svc.nombre_en ?? svc.nombre : svc.nombre) : b.serviceCode}`, start, end, details: b.notes ?? "", location: pack.hotel.direccion }) : undefined,
  };
}

/**
 * Versión de la foto recortada para el correo (scripts/build-email-images.py): Gmail ignora object-fit,
 * así que cada hueco usa una imagen con su proporción exacta.
 */
function emailImage(foto: string, variant: "hero" | "card" | "thumb") {
  const m = /^\/aura\/uploads\/images\/([^/]+)\.(jpe?g|png)$/i.exec(foto);
  return absolute(m ? `/aura/uploads/email/${m[1]}-${variant}.jpg` : foto);
}

function absolute(url: string) {
  return /^https?:/.test(url) ? url : `${appUrl()}${url}`;
}

export async function renderReservationEmail(reservationId: string, kind: EmailKind, opts: EmailOptions = {}) {
  const d = await buildEmailData(reservationId, opts);
  let element: React.ReactElement;
  let subject: string;
  if (kind === "confirmation") {
    element = React.createElement(ReservationConfirmed, { d });
    subject = confirmationSubject(d, d.range);
  } else if (kind === "modification") {
    element = React.createElement(ReservationConfirmed, { d, modified: true });
    subject = modificationSubject(d, d.range);
  } else if (kind === "cancellation") {
    element = React.createElement(ReservationCancelled, { d });
    subject = cancellationSubject(d, d.range);
  } else if (kind === "service") {
    if (!d.service) throw new Error("Falta el servicio reservado (serviceBookingId)");
    element = React.createElement(ServiceBooked, { d });
    subject = serviceSubject(d);
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
function buildIcs(d: Awaited<ReturnType<typeof buildEmailData>>, method: "REQUEST" | "CANCEL" = "REQUEST") {
  const toArr = (x: Date) => [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes()] as [number, number, number, number, number];
  const organizer = senderEmail() || d.hotel.email;
  const { value, error } = createEvent({
    uid: `${d.code}@aura-nia`,
    method,
    // Mismo UID y SEQUENCE creciente: el calendario del huésped actualiza (o elimina) el evento existente.
    sequence: Math.floor(Date.now() / 1000) - 1_790_000_000,
    start: toArr(d.start),
    startInputType: "utc",
    startOutputType: "utc",
    end: toArr(d.end),
    endInputType: "utc",
    endOutputType: "utc",
    title: `${d.hotel.name} · ${d.roomName} · ${d.code}`,
    description: `${d.roomName} · ${d.code}\n${d.lang === "en" ? "Check-in from" : "Check-in desde las"} ${d.checkInTime} · ${d.lang === "en" ? "check-out until" : "check-out hasta las"} ${d.checkOutTime}`,
    location: d.hotel.address,
    status: method === "CANCEL" ? "CANCELLED" : "CONFIRMED",
    organizer: { name: d.hotel.name, email: organizer },
    attendees: d.to ? [{ name: d.guestName || d.to, email: d.to, rsvp: true, partstat: "NEEDS-ACTION", role: "REQ-PARTICIPANT" }] : [],
    alarms: [{ action: "display", description: "Check-in", trigger: { hours: 24, before: true } }],
  });
  if (error) throw error;
  return value!;
}

/** Invitación de calendario del servicio reservado (mesa, navegación, ritual…). */
function buildServiceIcs(d: Awaited<ReturnType<typeof buildEmailData>>) {
  const sv = d.service;
  if (!sv?.start || !sv.end) return undefined;
  const toArr = (x: Date) => [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes()] as [number, number, number, number, number];
  const organizer = senderEmail() || d.hotel.email;
  const { value, error } = createEvent({
    uid: `${d.code}-${sv.id}@aura-nia`,
    method: "REQUEST",
    sequence: Math.floor(Date.now() / 1000) - 1_790_000_000,
    start: toArr(sv.start),
    startInputType: "utc",
    startOutputType: "utc",
    end: toArr(sv.end),
    endInputType: "utc",
    endOutputType: "utc",
    title: `${d.hotel.name} · ${sv.name}`,
    description: `${sv.name} · ${d.code}${sv.notes ? `\n${sv.notes}` : ""}`,
    location: d.hotel.address,
    status: "CONFIRMED",
    organizer: { name: d.hotel.name, email: organizer },
    attendees: d.to ? [{ name: d.guestName || d.to, email: d.to, rsvp: true, partstat: "NEEDS-ACTION", role: "REQ-PARTICIPANT" }] : [],
    alarms: [{ action: "display", description: sv.name, trigger: { hours: 2, before: true } }],
  });
  if (error) throw error;
  return value!;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");
const encodeHeader = (s: string) => `=?UTF-8?B?${b64(s)}?=`;
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");

function buildMime(opts: { fromName: string; to: string; subject: string; html: string; text: string; ics?: string; icsMethod?: string; inline?: InlineImage[] }) {
  const mixed = "mixed_" + Math.random().toString(36).slice(2);
  const alt = "alt_" + Math.random().toString(36).slice(2);
  const related = "rel_" + Math.random().toString(36).slice(2);
  const inline = opts.inline ?? [];
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
    `Content-Type: multipart/related; boundary="${related}"`,
    "",
    `--${related}`,
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
    lines.push(`--${alt}`, `Content-Type: text/calendar; charset=UTF-8; method=${opts.icsMethod ?? "REQUEST"}`, "Content-Transfer-Encoding: base64", "", wrap76(b64(opts.ics)));
  }
  lines.push(`--${alt}--`);
  for (const img of inline) {
    lines.push(`--${related}`, `Content-Type: ${img.contentType}; name="${img.filename}"`, `Content-ID: <${img.cid}>`, `Content-Disposition: inline; filename="${img.filename}"`, "Content-Transfer-Encoding: base64", "", wrap76(img.content.toString("base64")));
  }
  lines.push(`--${related}--`);
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

interface InlineImage {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Incrusta las fotos del propio sitio como imágenes en línea (cid:). Así se ven en Gmail aunque la app
 * corra en localhost o detrás de un login. En local se leen de public/; en Netlify se piden por HTTP.
 * El HTML guardado para el panel conserva las URL normales para poder previsualizarlo en el navegador.
 */
async function inlineSiteImages(html: string) {
  const base = appUrl();
  const urls = [...new Set([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith(`${base}/aura/`)))];
  const inline: InlineImage[] = [];
  let out = html;
  for (const [i, url] of urls.entries()) {
    const pathname = new URL(url).pathname;
    let content: Buffer | null = null;
    const local = path.join(process.cwd(), "public", decodeURIComponent(pathname));
    try {
      if (fs.existsSync(local)) content = fs.readFileSync(local);
      else {
        const r = await fetch(url);
        if (r.ok) content = Buffer.from(await r.arrayBuffer());
      }
    } catch {
      content = null;
    }
    if (!content) continue; // si no se pudo leer, queda la URL pública
    const cid = `img${i}@aura`;
    const filename = path.basename(pathname);
    inline.push({ cid, filename, content, contentType: /\.png$/i.test(filename) ? "image/png" : "image/jpeg" });
    out = out.split(`src="${url}"`).join(`src="cid:${cid}"`);
  }
  return { html: out, inline };
}

export async function sendReservationEmail(reservationId: string, kind: EmailKind, opts: EmailOptions = {}) {
  const r = await renderReservationEmail(reservationId, kind, opts);
  const provider = await emailProvider();
  const fromName = process.env.EMAIL_FROM_NAME || loadHotelPack().hotel.nombre;
  const icsMethod = kind === "cancellation" ? "CANCEL" : "REQUEST";
  const ics = kind === "service" ? buildServiceIcs(r.data) : kind === "confirmation" || kind === "modification" || kind === "cancellation" ? buildIcs(r.data, icsMethod) : undefined;
  let status = "simulated";
  let error: string | null = null;
  try {
    const mail = provider === "simulated" ? null : await inlineSiteImages(r.html);
    if (provider === "gmail" && mail) {
      const raw = Buffer.from(buildMime({ fromName, to: r.to, subject: r.subject, html: mail.html, text: r.text, ics, icsMethod, inline: mail.inline })).toString("base64url");
      await (await gmailApi()).users.messages.send({ userId: "me", requestBody: { raw } });
      status = "sent";
    } else if (provider === "smtp" && mail) {
      await smtpTransport().sendMail({
        from: `"${fromName}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: r.to,
        subject: r.subject,
        html: mail.html,
        text: r.text,
        attachments: mail.inline.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType, cid: a.cid, contentDisposition: "inline" as const })),
        // icalEvent = parte text/calendar con method=REQUEST: Gmail la muestra como invitación de Google Calendar.
        icalEvent: ics ? { method: icsMethod, filename: "invite.ics", content: ics } : undefined,
      });
      status = "sent";
    }
  } catch (e) {
    status = "failed";
    error = String(e);
  }
  await db.emailLog.create({ data: { reservationId, kind, refId: opts.serviceBookingId ?? null, to: r.to, subject: r.subject, html: r.html, provider, status, error } });
  await db.reservationEvent.create({
    data: { reservationId, type: status === "failed" ? "email_failed" : "email_sent", detail: `${kind} → ${r.to} (${provider}${status === "simulated" ? ", simulado" : ""})${error ? " · " + error : ""}` },
  });
  return { status, provider, subject: r.subject };
}
