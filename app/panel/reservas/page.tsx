import Link from "next/link";
import { filterOptions, filtersFromParams, searchReservations } from "@/lib/admin/reservations";
import { formatRange, nightsBetween } from "@/lib/dates";
import { rateName, roomName } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { PageHeader } from "@/components/admin/AdminShell";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ChannelTag, PayBadge, StatusBadge } from "@/components/panel/badges";

export const dynamic = "force-dynamic";

export default async function Reservas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f = filtersFromParams(sp);
  const list = await searchReservations(f);
  const opt = filterOptions();
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const totals = {
    count: list.length,
    value: list.filter((r) => !["cancelled", "expired"].includes(r.status)).reduce((s, r) => s + r.totalCents, 0),
    nights: list.filter((r) => !["cancelled", "expired"].includes(r.status)).reduce((s, r) => s + nightsBetween(r.checkIn, r.checkOut), 0),
  };
  const field = "rounded-lg border border-arena-200 bg-white px-3 py-2 text-[13px] text-oscuro outline-none focus:border-oscuro";
  const select = (name: string, label: string, options: string[][], value?: string) => (
    <select name={name} defaultValue={value ?? ""} className={field} aria-label={label}>
      <option value="">{label}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <AutoRefresh ms={8000} />
      <PageHeader title="Reservas" subtitle={`${totals.count} resultado(s) · ${usd(totals.value)} en reservas activas · ${totals.nights} noches`}>
        <a href={`/api/panel/export?${qs}`} className="rounded-full border border-oscuro px-4 py-2 text-[12px] font-semibold text-oscuro hover:bg-oscuro hover:text-white">
          ⬇ Exportar CSV
        </a>
      </PageHeader>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-arena-200 bg-cal p-3">
        <input name="q" defaultValue={f.q} placeholder="Buscar código, nombre, correo o teléfono" className={`${field} min-w-[260px] flex-1`} />
        {select("status", "Todos los estados", opt.statuses, f.status)}
        {select("channel", "Todos los canales", opt.channels, f.channel)}
        {select("rate", "Todas las tarifas", opt.rates, f.rate)}
        {select("room", "Todas las habitaciones", opt.rooms, f.room)}
        <label className="flex flex-col text-[11px] text-gris">
          Llegada desde
          <input type="date" name="from" defaultValue={f.from} className={field} />
        </label>
        <label className="flex flex-col text-[11px] text-gris">
          hasta
          <input type="date" name="to" defaultValue={f.to} className={field} />
        </label>
        {select("sort", "Más recientes", [["arrival", "Por llegada"], ["total", "Mayor total"]], f.sort === "created" ? "" : f.sort)}
        <button className="rounded-lg bg-oscuro px-4 py-2 text-[13px] font-semibold text-white">Filtrar</button>
        {qs && qs !== "sort=created" && (
          <Link href="/panel/reservas" className="px-2 py-2 text-[12px] text-gris hover:text-oscuro">
            Limpiar
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-arena-200 bg-white">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-arena-200 text-[11px] uppercase tracking-wider text-gris">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Huésped</th>
              <th className="px-4 py-3">Estadía</th>
              <th className="px-4 py-3">Habitación · tarifa</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Creada</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gris">
                  No hay reservas con estos filtros.
                </td>
              </tr>
            )}
            {list.map((r) => {
              const lastPay = r.payments.find((p) => p.kind !== "preauth");
              const n = nightsBetween(r.checkIn, r.checkOut);
              return (
                <tr key={r.id} className="border-b border-arena-200/60 last:border-0 hover:bg-fondo">
                  <td className="px-4 py-3">
                    <Link href={`/panel/reservas/${r.id}`} className="font-semibold text-laguna hover:underline">
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/panel/huespedes/${r.guestId}`} className="font-semibold hover:text-laguna">
                      {r.guest.fullName}
                    </Link>
                    <div className="text-[12px] text-gris">{r.guest.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatRange(r.checkIn, r.checkOut)}
                    <div className="text-[12px] text-gris">
                      {n} {n === 1 ? "noche" : "noches"} · {r.adults} pers.{r.pets ? " · 🐾" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {roomName(r.roomTypeCode, "es")}
                    <div className="text-[12px] text-gris">
                      {rateName(r.ratePlanCode, "es")}
                      {r.roomNumber ? ` · Hab. ${r.roomNumber}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ChannelTag channel={r.createdVia} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">{lastPay ? <PayBadge status={lastPay.status} /> : <span className="text-[12px] text-gris">{r.paymentMode === "pay_at_hotel" ? "En el hotel" : "—"}</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{usd(r.totalCents)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-gris">{r.createdAt.toLocaleDateString("es-ES", { timeZone: "America/Puerto_Rico", day: "numeric", month: "long" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
