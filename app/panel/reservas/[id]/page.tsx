import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatRange, toISODate } from "@/lib/dates";
import { loadHotelPack, rateName, roomName, service } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { folioSummary } from "@/lib/lifecycle";
import { TimeTravel } from "@/components/StatusBar";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ChannelTag, PayBadge, StatusBadge } from "@/components/panel/badges";
import { ReservationActions, EmailViewer } from "./client";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  modified: "Reserva modificada",
  calendar_updated: "Calendario actualizado",
  checkin_desk: "Check-in en recepción",
  payment_link_expired: "Enlace de pago vencido",
  reminder_failed: "Recordatorio falló",
  guarantee_release_failed: "No se pudo liberar la garantía",
  created: "Reserva creada",
  payment_link_sent: "Enlace de pago enviado",
  paid: "Pago recibido",
  confirmed: "Reserva confirmada",
  email_sent: "Correo enviado",
  email_failed: "Correo falló",
  calendar_created: "Evento de calendario creado",
  calendar_deleted: "Evento de calendario eliminado",
  calendar_failed: "Calendario falló",
  reminders_scheduled: "Recordatorios programados",
  reminder_sent: "Recordatorio enviado",
  checkin_link: "Enlace de pre-check-in",
  checkin_consent: "Consentimiento biométrico",
  identity_verified: "Identidad verificada (simulado)",
  terms_signed: "Condiciones firmadas",
  guarantee_authorized: "Garantía autorizada",
  guarantee_released: "Garantía liberada",
  checkin_done: "Pre-check-in completo",
  service_booked: "Servicio reservado",
  checked_out: "Checkout",
  cancelled: "Cancelada",
  expired: "Hold vencido",
  review: "Reseña",
};

function eventDetail(type: string, detail: string | null) {
  if (!detail) return null;
  if (type === "calendar_created") {
    try {
      const d = JSON.parse(detail);
      if (d.simulated) return `Evento de calendario (simulado): ${d.summary} · recordatorios: popup 24 h, email 24 h, popup 1 h`;
      return `Google Calendar: ${d.link ?? d.id}`;
    } catch {
      return detail;
    }
  }
  return detail;
}

export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await db.reservation.findUnique({
    where: { id },
    include: { guest: true, events: { orderBy: { createdAt: "asc" } }, emails: { orderBy: { createdAt: "asc" } }, reminders: { orderBy: { runAt: "asc" } }, services: true },
  });
  if (!res) notFound();
  const pack = loadHotelPack();
  const f = await folioSummary(res.id);
  // Conversaciones del huésped (canal donde reservó y los demás donde lo conocemos).
  const convs = await db.conversation.findMany({
    where: { OR: [{ guestId: res.guestId }, ...(res.createdViaUser ? [{ channel: res.createdVia, channelUserId: res.createdViaUser }] : [])] },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
  const tz = pack.hotel.zona_horaria;
  const dt = (d: Date) => d.toLocaleString("es-ES", { timeZone: tz, day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <AutoRefresh ms={8000} />
      <div>
        <Link href="/panel/reservas" className="text-sm text-gris hover:text-laguna">
          ← Reservas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl">{res.code}</h1>
          <StatusBadge status={res.status} />
          <ChannelTag channel={res.createdVia} />
          {res.roomNumber && <span className="rounded-full bg-oscuro px-2.5 py-0.5 text-[12px] font-semibold text-white">Hab. {res.roomNumber}</span>}
        </div>
        <div className="mt-1 text-tinta">
          <Link href={`/panel/huespedes/${res.guestId}`} className="font-semibold hover:text-laguna">
            {res.guest.fullName}
          </Link>{" "}
          · {res.guest.email} · {res.guest.phone}
        </div>
        {convs.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="text-gris">Conversaciones:</span>
            {convs.map((c) => (
              <Link key={c.id} href={`/panel/conversaciones?c=${c.id}`} className="inline-flex items-center gap-1 rounded-full border border-arena-200 bg-white px-2 py-0.5 font-semibold hover:border-oscuro">
                <ChannelTag channel={c.channel} /> {c.displayName ?? c.channelUserId}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-3">
          <ReservationActions
            id={res.id}
            status={res.status}
            checkIn={toISODate(res.checkIn)}
            checkOut={toISODate(res.checkOut)}
            roomTypeCode={res.roomTypeCode}
            guests={res.adults}
            balanceCents={f.balanceCents}
            hasPhone={Boolean(res.guest.phone)}
            rooms={pack.habitaciones.map((h) => ({ code: h.codigo, name: h.nombre_es, max: h.max_huespedes }))}
            services={pack.servicios.map((sv) => ({ code: sv.codigo, name: sv.nombre, price: sv.precio_usd ? usd(sv.precio_usd * 100) : undefined }))}
          />
          <TimeTravel reservationId={res.id} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Columna 1: datos, folio, pagos */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-arena-200 bg-white p-5">
              <h2 className="font-serif text-xl">Estadía</h2>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
                <dt className="text-gris">Fechas</dt>
                <dd>{formatRange(res.checkIn, res.checkOut)}</dd>
                <dt className="text-gris">Habitación</dt>
                <dd>{roomName(res.roomTypeCode, "es")}</dd>
                <dt className="text-gris">Tarifa</dt>
                <dd>{rateName(res.ratePlanCode, "es")}</dd>
                <dt className="text-gris">Huéspedes</dt>
                <dd>
                  {res.adults} · mascotas {res.pets}
                </dd>
                <dt className="text-gris">Calendario</dt>
                <dd>{res.calendarLink ? <a className="font-semibold text-laguna" href={res.calendarLink} target="_blank">Google Calendar ↗</a> : res.calendarEventId ? "Simulado" : "—"}</dd>
                {res.holdExpiresAt && res.status === "pending_payment" && (
                  <>
                    <dt className="text-gris">Hold vence</dt>
                    <dd>{dt(res.holdExpiresAt)}</dd>
                  </>
                )}
              </dl>
            </section>

            <section className="rounded-2xl border border-arena-200 bg-white p-5">
              <h2 className="font-serif text-xl">Folio</h2>
              <div className="mt-3 space-y-1 text-sm">
                {f.lines.map((l) => (
                  <div key={l.id} className="flex justify-between gap-3">
                    <span className="text-tinta">{l.label}</span>
                    <span className={l.amountCents < 0 ? "text-laguna" : ""}>{usd(l.amountCents)}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-arena-200 pt-2 font-semibold">
                  <span>Total</span>
                  <span>{usd(f.chargesCents)}</span>
                </div>
                <div className="flex justify-between text-tinta">
                  <span>Pagado</span>
                  <span>{usd(f.paidCents)}</span>
                </div>
                <div className="flex justify-between font-semibold text-laguna">
                  <span>Saldo</span>
                  <span>{usd(f.balanceCents)}</span>
                </div>
              </div>
              {res.services.length > 0 && (
                <div className="mt-4 border-t border-arena-200 pt-3 text-sm">
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-gris">Servicios</div>
                  {res.services.map((s) => (
                    <div key={s.id}>
                      {service(s.serviceCode)?.nombre} · {s.datetime}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-arena-200 bg-white p-5">
              <h2 className="font-serif text-xl">Pagos</h2>
              <div className="mt-3 space-y-2 text-sm">
                {f.payments.length === 0 && <div className="text-gris">Sin pagos todavía.</div>}
                {f.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{p.kind === "prepayment" ? "Prepago" : p.kind === "balance" ? "Saldo" : "Garantía"}</div>
                      <div className="text-[11px] text-gris">
                        {p.provider} · {p.externalId ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{usd(p.amountCents)}</div>
                      <PayBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Columna 2: línea de tiempo y recordatorios */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-arena-200 bg-white p-5">
              <h2 className="font-serif text-xl">Línea de tiempo</h2>
              <ol className="mt-3 space-y-3 border-l-2 border-arena-200 pl-4">
                {res.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-laguna" />
                    <div className="text-sm font-semibold">{EVENT_LABEL[e.type] ?? e.type}</div>
                    <div className="text-[11px] text-gris">{dt(e.createdAt)}</div>
                    {e.detail && <div className="mt-0.5 break-words text-[12px] text-tinta">{eventDetail(e.type, e.detail)}</div>}
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-2xl border border-arena-200 bg-white p-5">
              <h2 className="font-serif text-xl">Recordatorios</h2>
              <div className="mt-3 space-y-1.5 text-sm">
                {res.reminders.length === 0 && <div className="text-gris">Se programan al confirmar.</div>}
                {res.reminders.map((r) => (
                  <div key={r.id} className="flex justify-between gap-2">
                    <span>{{ precheckin: "Pre-check-in (24 h antes)", checkout_notice: "Aviso de salida (08:00)", review: "Encuesta (+24 h)", hold_expiry: "Vencimiento del hold" }[r.kind] ?? r.kind}</span>
                    <span className={r.sentAt ? "text-laguna" : "text-gris"}>{r.sentAt ? "✓ enviado" : dt(r.runAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Columna 3: correos */}
          <section className="rounded-2xl border border-arena-200 bg-white p-5">
            <h2 className="font-serif text-xl">Correos</h2>
            <EmailViewer
              reservationId={res.id}
              emails={res.emails.map((e) => ({ id: e.id, subject: e.subject, to: e.to, provider: e.provider, status: e.status, kind: e.kind, createdAt: dt(e.createdAt) }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
