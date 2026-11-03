import Link from "next/link";
import { db } from "@/lib/db";
import { hotelToday } from "@/lib/admin/metrics";
import { formatDayMonth, parseISODate, toISODate } from "@/lib/dates";
import { loadHotelPack, service } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatTile } from "@/components/admin/charts";
import { StatusBadge } from "@/components/panel/badges";

export const dynamic = "force-dynamic";

export default async function Servicios({ searchParams }: { searchParams: Promise<{ when?: string; svc?: string }> }) {
  const sp = await searchParams;
  const pack = loadHotelPack();
  const { today } = await hotelToday();
  const todayISO = toISODate(today);
  const when = sp.when === "past" ? "past" : sp.when === "all" ? "all" : "upcoming";

  const all = await db.serviceBooking.findMany({ include: { reservation: { include: { guest: true } } }, orderBy: { datetime: "asc" } });
  const day = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "");
  const list = all
    .filter((s) => !sp.svc || s.serviceCode === sp.svc)
    .filter((s) => (when === "all" ? true : when === "past" ? day(s.datetime) < todayISO : day(s.datetime) >= todayISO || !day(s.datetime)));
  if (when === "past") list.reverse();

  const byDay = new Map<string, typeof list>();
  for (const s of list) {
    const k = day(s.datetime) || "sin-fecha";
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const revenue = all.reduce((sum, s) => sum + Math.round((service(s.serviceCode)?.precio_usd ?? 0) * 100), 0);
  const link = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ when, svc: sp.svc, ...params }).filter(([, v]) => v) as [string, string][]);
    return `/panel/servicios?${q}`;
  };
  const pill = (active: boolean) => `rounded-full px-3 py-1 text-[12px] font-semibold ${active ? "bg-oscuro text-white" : "bg-white text-tinta hover:bg-arena"}`;

  return (
    <div>
      <PageHeader title="Servicios" subtitle="Restaurante, spa, navegación y traslados reservados por los huéspedes (por Nía o por recepción)." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {pack.servicios.map((s) => {
          const n = all.filter((b) => b.serviceCode === s.codigo).length;
          return <StatTile key={s.codigo} label={s.nombre} value={String(n)} hint={s.precio_usd ? `${usd(s.precio_usd * 100)} c/u` : s.horario ?? ""} />;
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <Link href={link({ when: "upcoming" })} className={pill(when === "upcoming")}>
          Próximos
        </Link>
        <Link href={link({ when: "past" })} className={pill(when === "past")}>
          Pasados
        </Link>
        <Link href={link({ when: "all" })} className={pill(when === "all")}>
          Todos
        </Link>
        <span className="mx-2 h-5 w-px bg-arena-200" />
        <Link href={link({ svc: undefined })} className={pill(!sp.svc)}>
          Todos los servicios
        </Link>
        {pack.servicios.map((s) => (
          <Link key={s.codigo} href={link({ svc: s.codigo })} className={pill(sp.svc === s.codigo)}>
            {s.nombre.split(" · ")[0]}
          </Link>
        ))}
        <span className="ml-auto text-[12px] text-gris">Ingresos por servicios con precio: {usd(revenue)}</span>
      </div>

      <div className="mt-4 space-y-4">
        {list.length === 0 && <div className="rounded-2xl border border-arena-200 bg-white p-8 text-center text-gris">No hay servicios en esta vista.</div>}
        {[...byDay.entries()].map(([d, items]) => (
          <section key={d} className="rounded-2xl border border-arena-200 bg-white p-4">
            <h2 className="text-[14px] font-semibold">
              {d === "sin-fecha" ? "Sin fecha" : formatDayMonth(parseISODate(d))}
              {d === todayISO && <span className="ml-2 rounded-full bg-oscuro px-2 py-0.5 text-[11px] text-white">Hoy</span>}
            </h2>
            <ul className="mt-2 divide-y divide-arena-200/70 text-[13px]">
              {items.map((s) => {
                const svc = service(s.serviceCode);
                return (
                  <li key={s.id} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 py-2">
                    <span className="tabular-nums text-tinta">{s.datetime.slice(10).replace(/^\s*·?\s*/, "") || "—"}</span>
                    <div>
                      <div className="font-semibold">{svc?.nombre ?? s.serviceCode}</div>
                      <div className="text-[12px] text-gris">
                        {s.reservation.guest.fullName} ·{" "}
                        <Link href={`/panel/reservas/${s.reservationId}`} className="hover:text-laguna">
                          {s.reservation.code}
                        </Link>
                        {s.reservation.roomNumber ? ` · Hab. ${s.reservation.roomNumber}` : ""}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {svc?.precio_usd ? <span className="tabular-nums text-tinta">{usd(svc.precio_usd * 100)}</span> : null}
                      <StatusBadge status={s.reservation.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
