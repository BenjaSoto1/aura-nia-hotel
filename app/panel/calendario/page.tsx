import Link from "next/link";
import { db } from "@/lib/db";
import { hotelToday, OCCUPYING } from "@/lib/admin/metrics";
import { addDays, formatDayMonth, nightsBetween, parseISODate, toISODate } from "@/lib/dates";
import { loadHotelPack } from "@/lib/hotel-pack";
import { PageHeader } from "@/components/admin/AdminShell";
import { AutoRefresh } from "@/components/panel/AutoRefresh";

export const dynamic = "force-dynamic";

const DAYS = 21;
const WEEKDAY = ["D", "L", "M", "M", "J", "V", "S"];
// Color de la barra por estado (texto siempre en tinta o blanco según el fondo).
const BAR: Record<string, string> = {
  pending_payment: "bg-[#F3E2C6] text-oscuro",
  confirmed: "bg-laguna text-white",
  precheckin_done: "bg-bruma text-white",
  in_house: "bg-oscuro text-white",
  checked_out: "bg-[#DEDDD8] text-tinta",
};

export default async function Calendario({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const sp = await searchParams;
  const pack = loadHotelPack();
  const { today, at } = await hotelToday();
  const start = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? parseISODate(sp.from) : addDays(today, -2);
  const end = addDays(start, DAYS);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));

  const [types, reservations] = await Promise.all([
    db.roomType.findMany(),
    db.reservation.findMany({
      where: { checkIn: { lt: end }, checkOut: { gt: start }, status: { in: [...OCCUPYING, "pending_payment", "checked_out"] } },
      include: { guest: true },
      orderBy: { checkIn: "asc" },
    }),
  ]);
  const live = (r: (typeof reservations)[number]) => OCCUPYING.includes(r.status) || (r.status === "pending_payment" && r.holdExpiresAt && r.holdExpiresAt > at);

  const cols = `180px repeat(${DAYS}, minmax(34px, 1fr))`;
  const nav = (d: Date) => `/panel/calendario?from=${toISODate(d)}`;

  return (
    <div>
      <AutoRefresh ms={10000} />
      <PageHeader title="Calendario" subtitle={`${formatDayMonth(start)} – ${formatDayMonth(addDays(end, -1))} · disponibilidad por noche y estadías por tipo de habitación`}>
        <div className="flex items-center gap-1 text-[12px] font-semibold">
          <Link href={nav(addDays(start, -7))} className="rounded-full border border-arena-200 bg-white px-3 py-1.5 hover:border-oscuro">
            ← 7 días
          </Link>
          <Link href="/panel/calendario" className="rounded-full border border-arena-200 bg-white px-3 py-1.5 hover:border-oscuro">
            Hoy
          </Link>
          <Link href={nav(addDays(start, 7))} className="rounded-full border border-arena-200 bg-white px-3 py-1.5 hover:border-oscuro">
            7 días →
          </Link>
        </div>
      </PageHeader>

      <div className="overflow-x-auto rounded-2xl border border-arena-200 bg-white p-3 scroll-thin">
        <div className="min-w-[900px]">
          {/* Encabezado de días */}
          <div className="grid gap-[2px] pb-2 text-center text-[11px]" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((d) => {
              const isToday = toISODate(d) === toISODate(today);
              return (
                <div key={d.toISOString()} className={`rounded-md py-1 ${isToday ? "bg-oscuro text-white" : "text-gris"}`}>
                  <div>{WEEKDAY[d.getUTCDay()]}</div>
                  <div className="font-semibold">{d.getUTCDate()}</div>
                </div>
              );
            })}
          </div>

          {pack.habitaciones.map((h) => {
            const inv = types.find((t) => t.code === h.codigo)?.inventory ?? h.inventario;
            const mine = reservations.filter((r) => r.roomTypeCode === h.codigo);
            return (
              <div key={h.codigo} className="border-t border-arena-200 py-2">
                {/* Disponibilidad por noche */}
                <div className="grid items-center gap-[2px]" style={{ gridTemplateColumns: cols }}>
                  <div className="pr-2">
                    <div className="text-[13px] font-semibold text-oscuro">{h.nombre_es}</div>
                    <div className="text-[11px] text-gris">{inv} habitaciones · libres por noche</div>
                  </div>
                  {days.map((d) => {
                    const sold = mine.filter((r) => live(r) && r.checkIn <= d && r.checkOut > d).length;
                    const free = inv - sold;
                    return (
                      <div
                        key={d.toISOString()}
                        title={`${formatDayMonth(d)}: ${sold} vendidas, ${free} libres`}
                        className={`rounded-md py-1 text-center text-[12px] font-semibold tabular-nums ${free <= 0 ? "bg-laguna-600 text-white" : free <= Math.ceil(inv * 0.25) ? "bg-laguna-50 text-laguna-600" : "bg-fondo text-tinta"}`}
                      >
                        {free}
                      </div>
                    );
                  })}
                </div>
                {/* Estadías (barras) */}
                <div className="mt-1.5 space-y-[3px]">
                  {mine.length === 0 && (
                    <div className="grid" style={{ gridTemplateColumns: cols }}>
                      <div />
                      <div className="col-span-full text-[11px] text-gris" style={{ gridColumn: `2 / span ${DAYS}` }}>
                        Sin estadías en este rango
                      </div>
                    </div>
                  )}
                  {mine.map((r) => {
                    const from = Math.max(0, nightsBetween(start, r.checkIn));
                    const to = Math.min(DAYS, nightsBetween(start, r.checkOut));
                    if (to <= from) return null;
                    return (
                      <div key={r.id} className="grid items-center gap-[2px]" style={{ gridTemplateColumns: cols }}>
                        <div className="truncate pr-2 text-[11px] text-gris">{r.roomNumber ? `Hab. ${r.roomNumber}` : ""}</div>
                        <Link
                          href={`/panel/reservas/${r.id}`}
                          title={`${r.code} · ${r.guest.fullName} · ${formatDayMonth(r.checkIn)} – ${formatDayMonth(r.checkOut)}`}
                          className={`truncate rounded-md px-2 py-1 text-[11.5px] font-semibold hover:opacity-85 ${BAR[r.status] ?? "bg-arena text-tinta"}`}
                          style={{ gridColumn: `${from + 2} / ${to + 2}` }}
                        >
                          {r.guest.fullName} · {r.code}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-tinta">
        {[
          ["bg-[#F3E2C6]", "Pendiente de pago"],
          ["bg-laguna", "Confirmada"],
          ["bg-bruma", "Pre-check-in listo"],
          ["bg-oscuro", "En casa"],
          ["bg-[#DEDDD8]", "Checkout"],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-5 rounded ${c}`} /> {l}
          </span>
        ))}
        <span className="ml-auto text-gris">Números = habitaciones libres esa noche</span>
      </div>
    </div>
  );
}
