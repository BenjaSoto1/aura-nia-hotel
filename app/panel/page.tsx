import Link from "next/link";
import { db } from "@/lib/db";
import { now } from "@/lib/clock";
import { formatRange, hotelDateISO, parseISODate } from "@/lib/dates";
import { loadHotelPack, rateName, roomName } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { TopNav, TimeTravel } from "@/components/StatusBar";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ChannelTag, PayBadge, StatusBadge } from "@/components/panel/badges";

export const dynamic = "force-dynamic";

export default async function Panel({ searchParams }: { searchParams: Promise<{ status?: string; channel?: string; google?: string }> }) {
  const sp = await searchParams;
  const pack = loadHotelPack();
  const at = await now();
  const today = parseISODate(hotelDateISO(at, pack.hotel.zona_horaria));
  const where = { ...(sp.status ? { status: sp.status } : {}), ...(sp.channel ? { createdVia: sp.channel } : {}) };
  const [list, all, needsHuman] = await Promise.all([
    db.reservation.findMany({ where, include: { guest: true, payments: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.reservation.findMany({ select: { status: true, checkIn: true, createdAt: true, totalCents: true } }),
    db.conversation.count({ where: { needsHuman: true } }),
  ]);
  const arrivalsToday = all.filter((r) => r.checkIn.getTime() === today.getTime() && !["cancelled", "expired"].includes(r.status)).length;
  const pending = all.filter((r) => r.status === "pending_payment").length;
  const confirmedValue = all.filter((r) => ["confirmed", "precheckin_done", "in_house", "checked_out"].includes(r.status)).reduce((s, r) => s + r.totalCents, 0);

  const filter = (key: "status" | "channel", value: string | undefined, label: string) => {
    const params = new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.channel ? { channel: sp.channel } : {}) });
    if (value) params.set(key, value);
    else params.delete(key);
    const active = (sp[key] ?? undefined) === value;
    return (
      <Link key={label} href={`/panel?${params}`} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${active ? "bg-oscuro text-white" : "bg-white text-tinta hover:bg-arena"}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <AutoRefresh />
      <TopNav hotelName={pack.hotel.nombre} active="panel" />
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        {sp.google === "ok" && <div className="mb-4 rounded-xl bg-laguna-50 px-4 py-3 text-sm font-semibold text-laguna">Google conectado ✓ Calendar y Gmail ya están en modo real.</div>}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-3xl">Reservas</h1>
          <TimeTravel />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Llegadas hoy", String(arrivalsToday)],
            ["Pagos pendientes", String(pending)],
            ["Valor confirmado", usd(confirmedValue)],
            ["Piden una persona", String(needsHuman)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-arena-200 bg-white p-4">
              <div className="text-[12px] font-semibold text-gris">{l}</div>
              <div className="mt-1 font-serif text-3xl">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {filter("status", undefined, "Todas")}
          {filter("status", "pending_payment", "Pendientes")}
          {filter("status", "confirmed", "Confirmadas")}
          {filter("status", "precheckin_done", "Pre-check-in")}
          {filter("status", "checked_out", "Checkout")}
          {filter("status", "cancelled", "Canceladas")}
          <span className="mx-2 w-px bg-arena-200" />
          {filter("channel", undefined, "Todos los canales")}
          {["whatsapp", "instagram", "messenger", "web", "phone"].map((c) => filter("channel", c, c === "web" ? "Web" : c === "phone" ? "Teléfono" : c[0].toUpperCase() + c.slice(1)))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-arena-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-arena-200 text-[11px] uppercase tracking-wider text-gris">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Huésped</th>
                <th className="px-4 py-3">Fechas</th>
                <th className="px-4 py-3">Habitación · tarifa</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Calendario</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gris">
                    Aún no hay reservas. Abre la{" "}
                    <Link href="/" className="font-semibold text-laguna">
                      consola omnicanal
                    </Link>{" "}
                    y reserva desde cualquier canal.
                  </td>
                </tr>
              )}
              {list.map((r) => {
                const lastPay = r.payments.find((p) => p.kind !== "preauth");
                return (
                  <tr key={r.id} className="border-b border-arena-200/60 last:border-0 hover:bg-fondo">
                    <td className="px-4 py-3">
                      <Link href={`/panel/reservas/${r.id}`} className="font-semibold text-laguna hover:underline">
                        {r.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.guest.fullName}</div>
                      <div className="text-[12px] text-gris">{r.guest.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatRange(r.checkIn, r.checkOut)}</td>
                    <td className="px-4 py-3">
                      {roomName(r.roomTypeCode, "es")}
                      <div className="text-[12px] text-gris">
                        {rateName(r.ratePlanCode, "es")}
                        {r.pets ? " · 🐾" : ""}
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
                    <td className="px-4 py-3 text-right font-semibold">{usd(r.totalCents)}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {r.calendarLink ? (
                        <a href={r.calendarLink} target="_blank" className="font-semibold text-laguna hover:underline">
                          Abrir ↗
                        </a>
                      ) : r.calendarEventId ? (
                        <span className="text-gris">Simulado</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
