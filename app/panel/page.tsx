import Link from "next/link";
import { dashboardMetrics, parsePeriod } from "@/lib/admin/metrics";
import { formatDayMonth, formatRange, parseISODate } from "@/lib/dates";
import { roomName, service } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { PageHeader } from "@/components/admin/AdminShell";
import { BarList, Card, ColumnChart, Delta, OccupancyHeatmap, StatTile, TableView } from "@/components/admin/charts";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { CHANNEL_NAME, ChannelTag, StatusBadge } from "@/components/panel/badges";
import { TimeTravel } from "@/components/StatusBar";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  created: "Reserva creada",
  confirmed: "Confirmada",
  paid: "Pago recibido",
  modified: "Modificada",
  cancelled: "Cancelada",
  expired: "Hold vencido",
  email_sent: "Correo enviado",
  email_failed: "Correo falló",
  checkin_done: "Check-in digital",
  checked_out: "Checkout",
  service_booked: "Servicio reservado",
  reminder_sent: "Recordatorio enviado",
  review: "Reseña",
  guarantee_authorized: "Garantía autorizada",
  guarantee_released: "Garantía liberada",
  calendar_created: "Evento de calendario",
  calendar_updated: "Calendario actualizado",
  calendar_deleted: "Evento eliminado",
  reminders_scheduled: "Recordatorios programados",
  payment_link_sent: "Enlace de pago enviado",
  checkin_desk: "Check-in en recepción",
  checkin_link: "Enlace de pre-check-in",
  identity_verified: "Identidad verificada",
  terms_signed: "Condiciones firmadas",
};

export default async function Resumen({ searchParams }: { searchParams: Promise<{ p?: string; google?: string }> }) {
  const sp = await searchParams;
  const period = parsePeriod(sp.p);
  const m = await dashboardMetrics(period);
  const k = m.kpis;
  const time = (d: Date) => {
    const tz = "America/Puerto_Rico";
    const day = d.toLocaleDateString("es-ES", { timeZone: tz, day: "numeric", month: "long" });
    return `${day} · ${d.toLocaleTimeString("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`;
  };
  const pctTxt = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div>
      <AutoRefresh ms={10000} />
      {sp.google === "ok" && <div className="mb-4 rounded-xl bg-laguna-50 px-4 py-3 text-sm font-semibold text-laguna">Google conectado ✓ Calendar y Gmail ya están en modo real.</div>}
      <PageHeader title="Resumen" subtitle={`Hoy es ${formatDayMonth(m.today)} (hora del hotel). Datos de los últimos ${period} días.`}>
        <div className="flex rounded-full border border-arena-200 bg-white p-0.5 text-[12px] font-semibold">
          {[7, 30, 90].map((p) => (
            <Link key={p} href={`/panel?p=${p}`} className={`rounded-full px-3 py-1 ${period === p ? "bg-oscuro text-white" : "text-tinta hover:bg-arena"}`}>
              {p} días
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* Cifra principal + KPI */}
      <div className="grid gap-3 lg:grid-cols-[1.3fr_2fr]">
        <div className="rounded-2xl bg-oscuro p-6 text-white">
          <div className="text-[12px] text-white/70">Ingresos reservados · últimos {period} días</div>
          <div className="mt-2 text-[52px] font-semibold leading-none tracking-tight tabular-nums">{usd(k.revenue.value)}</div>
          <div className="mt-3 [&_span]:!text-white/80">
            <Delta value={k.revenue.delta} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-[12px]">
            <div>
              <div className="text-white/60">Cobrado en el período</div>
              <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{usd(k.collected.value)}</div>
            </div>
            <div>
              <div className="text-white/60">Ocupación próximos 30 días</div>
              <div className="mt-0.5 text-[18px] font-semibold tabular-nums">{pctTxt(k.occupancyNext.value)}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatTile label="Reservas vendidas" value={String(k.bookings.value)} delta={k.bookings.delta} />
          <StatTile label="Tarifa media por noche" value={k.adr.value ? usd(k.adr.value) : "—"} delta={k.adr.delta} />
          <StatTile label="Conversión conversación → reserva" value={pctTxt(k.conversion.value)} delta={k.conversion.delta} />
          <StatTile label="Conversaciones nuevas" value={String(k.conversion.conversations)} hint="iniciadas en el período" />
          <StatTile label="Cancelaciones" value={String(k.cancellations.value)} delta={k.cancellations.delta} goodWhenUp={false} />
          <StatTile label="Noches vendidas (30 días)" value={`${k.occupancyNext.soldNights}`} hint={`de ${k.occupancyNext.capacity} disponibles`} />
        </div>
      </div>

      {/* Operación de hoy */}
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OpsList title="Llegadas hoy" empty="Sin llegadas hoy" items={m.ops.arrivals.map((r) => ({ id: r.id, code: r.code, who: r.guest.fullName ?? "", extra: roomName(r.roomTypeCode, "es"), badge: <StatusBadge status={r.status} /> }))} />
        <OpsList title="Salidas hoy" empty="Sin salidas hoy" items={m.ops.departures.map((r) => ({ id: r.id, code: r.code, who: r.guest.fullName ?? "", extra: r.roomNumber ? `Hab. ${r.roomNumber}` : roomName(r.roomTypeCode, "es"), badge: <StatusBadge status={r.status} /> }))} />
        <OpsList
          title="Pagos pendientes"
          empty="Nada pendiente"
          items={m.ops.pendingPayments.map((r) => ({ id: r.id, code: r.code, who: r.guest.fullName ?? "", extra: `${usd(r.totalCents)}${r.holdExpiresAt ? ` · vence ${time(r.holdExpiresAt)}` : ""}` }))}
        />
        <section className="rounded-2xl border border-arena-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Piden una persona</h2>
            <span className="text-[12px] text-gris">{m.ops.needsHuman.length}</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[12.5px]">
            {m.ops.needsHuman.length === 0 && <li className="text-gris">Nadie esperando</li>}
            {m.ops.needsHuman.map((c) => (
              <li key={c.id}>
                <Link href={`/panel/conversaciones?c=${c.id}`} className="flex items-center justify-between gap-2 hover:text-laguna">
                  <span className="truncate">{c.displayName ?? c.channelUserId}</span>
                  <ChannelTag channel={c.channel} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Card title="Reservas vendidas por día" subtitle="Por fecha en que se hizo la reserva. Pasa el cursor sobre una columna para ver el detalle.">
          <ColumnChart
            data={m.daily.map((d) => ({
              key: d.date,
              label: String(parseISODate(d.date).getUTCDate()),
              value: d.count,
              tip: `${formatDayMonth(parseISODate(d.date))} · ${d.count} ${d.count === 1 ? "reserva" : "reservas"} · ${usd(d.revenue)}`,
            }))}
            everyNthLabel={period === 7 ? 1 : period === 30 ? 3 : 10}
            integer
          />
          <TableView head={["Día", "Reservas", "Ingreso"]} rows={m.daily.map((d) => [formatDayMonth(parseISODate(d.date)), d.count, usd(d.revenue)])} />
        </Card>
        <Card title="Ingresos por canal" subtitle={`Reservas vendidas en ${period} días`}>
          <BarList
            rows={m.byChannel.map((c) => ({ key: c.channel, label: CHANNEL_NAME[c.channel] ?? c.channel, value: c.revenue, display: usd(c.revenue), tip: `${c.count} reservas` }))}
          />
          <TableView head={["Canal", "Reservas", "Ingreso"]} rows={m.byChannel.map((c) => [CHANNEL_NAME[c.channel] ?? c.channel, c.count, usd(c.revenue)])} />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Card title="Ocupación de los próximos 30 días" subtitle="Habitaciones vendidas sobre inventario, por tipo y noche.">
          <OccupancyHeatmap rows={m.occupancyByType.map((t) => ({ ...t, name: t.name.replace(/^Habitación /, "") }))} dayLabel={(iso, i) => (i % 5 === 0 ? formatDayMonth(parseISODate(iso)).replace(/ de /, " ").slice(0, 6) : "")} />
          <TableView
            head={["Tipo", ...m.occupancyByType[0].cells.slice(0, 30).map((c) => c.date.slice(5))]}
            rows={m.occupancyByType.map((t) => [t.name, ...t.cells.map((c) => `${c.sold}/${c.inventory}`)])}
          />
        </Card>
        <div className="grid gap-3">
          <Card title="Por tarifa">
            <BarList rows={m.byRate.map((r) => ({ key: r.code, label: r.name.replace(/\s*\(.*\)/, ""), value: r.count, display: `${r.count} · ${usd(r.revenue)}` }))} />
          </Card>
          <Card title="Por habitación">
            <BarList rows={m.byRoom.map((r) => ({ key: r.code, label: r.name.replace("Habitación ", ""), value: r.count, display: `${r.count} · ${usd(r.revenue)}` }))} />
          </Card>
        </div>
      </div>

      {/* Próximos servicios + actividad */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Servicios de los próximos 7 días" action={<Link href="/panel/servicios" className="text-[12px] font-semibold text-laguna">Ver todos →</Link>}>
          <ul className="divide-y divide-arena-200/70 text-[13px]">
            {m.ops.upcomingServices.length === 0 && <li className="py-2 text-gris">Sin servicios agendados</li>}
            {m.ops.upcomingServices.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="font-semibold">{service(s.serviceCode)?.nombre ?? s.serviceCode}</div>
                  <div className="text-[12px] text-gris">
                    {s.reservation.guest.fullName} · <Link href={`/panel/reservas/${s.reservationId}`} className="hover:text-laguna">{s.reservation.code}</Link>
                  </div>
                </div>
                <div className="text-right text-[12px] tabular-nums text-tinta">{s.datetime.replace(/^(\d{4}-\d{2}-\d{2})/, (d) => formatDayMonth(parseISODate(d)))}</div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Actividad reciente">
          <ul className="space-y-2 text-[13px]">
            {m.ops.recentEvents.filter((e) => e.type in EVENT_LABEL).slice(0, 14).map((e) => (
              <li key={e.id} className="grid grid-cols-[150px_1fr] gap-3">
                <span className="text-[11.5px] text-gris tabular-nums">{time(e.createdAt)}</span>
                <span>
                  <span className="font-semibold">{EVENT_LABEL[e.type] ?? e.type}</span> ·{" "}
                  <Link href={`/panel/reservas/${e.reservation.id}`} className="text-laguna hover:underline">
                    {e.reservation.code}
                  </Link>{" "}
                  <span className="text-gris">{e.reservation.guest.fullName}</span>
                </span>
              </li>
            ))}
          </ul>
          {m.ops.failedEmails.length > 0 && (
            <div className="mt-4 rounded-xl bg-laguna-50 px-3 py-2 text-[12px] text-laguna-600">
              ⚠ {m.ops.failedEmails.length} correo(s) fallaron recientemente.{" "}
              <Link href="/panel/correos?status=failed" className="font-semibold underline">
                Revisar
              </Link>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-arena-200 bg-white px-5 py-3">
        <span className="text-[12px] text-gris">
          En casa ahora: <b className="text-oscuro">{m.ops.inHouse.length}</b> · Rango de llegadas visibles: {formatRange(m.today, new Date(m.today.getTime() + 30 * 864e5))}
        </span>
        <TimeTravel compact />
      </div>
    </div>
  );
}

function OpsList({ title, empty, items }: { title: string; empty: string; items: { id: string; code: string; who: string; extra: string; badge?: React.ReactNode }[] }) {
  return (
    <section className="rounded-2xl border border-arena-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        <span className="text-[12px] text-gris">{items.length}</span>
      </div>
      <ul className="mt-2 space-y-1.5 text-[12.5px]">
        {items.length === 0 && <li className="text-gris">{empty}</li>}
        {items.slice(0, 6).map((r) => (
          <li key={r.id}>
            <Link href={`/panel/reservas/${r.id}`} className="block hover:text-laguna">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{r.who || r.code}</span>
                {r.badge}
              </div>
              <div className="truncate text-[11.5px] text-gris">
                {r.code} · {r.extra}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
