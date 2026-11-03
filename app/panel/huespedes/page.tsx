import Link from "next/link";
import { db } from "@/lib/db";
import { BOOKED } from "@/lib/admin/metrics";
import { formatDayMonth } from "@/lib/dates";
import { usd } from "@/lib/money";
import { PageHeader } from "@/components/admin/AdminShell";
import { CHANNEL_ICON, CHANNEL_NAME } from "@/components/panel/badges";

export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default async function Huespedes({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const guests = await db.guest.findMany({ include: { reservations: true, identities: true } });
  const q = sp.q ? norm(sp.q.trim()) : "";
  const rows = guests
    .filter((g) => !q || [g.fullName, g.email, g.phone].some((v) => v && norm(v).includes(q)))
    .map((g) => {
      const booked = g.reservations.filter((r) => BOOKED.includes(r.status));
      const last = [...g.reservations].sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime())[0];
      return {
        g,
        stays: booked.length,
        spend: booked.reduce((s, r) => s + r.totalCents, 0),
        last,
        channels: [...new Set(g.identities.map((i) => i.channel))],
      };
    })
    .sort((a, b) => (sp.sort === "name" ? (a.g.fullName ?? "").localeCompare(b.g.fullName ?? "") : b.spend - a.spend || b.stays - a.stays));

  return (
    <div>
      <PageHeader title="Huéspedes" subtitle={`${rows.length} perfil(es) · un huésped se reconoce en todos los canales por su teléfono o correo`}>
        <form method="get" className="flex gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Buscar nombre, correo o teléfono" className="w-72 rounded-lg border border-arena-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-oscuro" />
          <select name="sort" defaultValue={sp.sort ?? ""} className="rounded-lg border border-arena-200 bg-white px-3 py-2 text-[13px]">
            <option value="">Mayor gasto</option>
            <option value="name">Nombre</option>
          </select>
          <button className="rounded-lg bg-oscuro px-4 py-2 text-[13px] font-semibold text-white">Buscar</button>
        </form>
      </PageHeader>

      <div className="overflow-x-auto rounded-2xl border border-arena-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-arena-200 text-[11px] uppercase tracking-wider text-gris">
            <tr>
              <th className="px-4 py-3">Huésped</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Canales</th>
              <th className="px-4 py-3">Idioma</th>
              <th className="px-4 py-3 text-right">Estadías</th>
              <th className="px-4 py-3 text-right">Gasto</th>
              <th className="px-4 py-3">Última reserva</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gris">
                  Sin huéspedes que coincidan.
                </td>
              </tr>
            )}
            {rows.map(({ g, stays, spend, last, channels }) => (
              <tr key={g.id} className="border-b border-arena-200/60 last:border-0 hover:bg-fondo">
                <td className="px-4 py-3">
                  <Link href={`/panel/huespedes/${g.id}`} className="font-semibold text-oscuro hover:text-laguna">
                    {g.fullName ?? "Sin nombre"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[12.5px] text-tinta">
                  {g.email}
                  <div className="text-gris">{g.phone}</div>
                </td>
                <td className="px-4 py-3 text-[13px]" title={channels.map((c) => CHANNEL_NAME[c] ?? c).join(", ")}>
                  {channels.map((c) => CHANNEL_ICON[c] ?? "•").join(" ") || "—"}
                </td>
                <td className="px-4 py-3 text-[12.5px] uppercase text-tinta">{g.language}</td>
                <td className="px-4 py-3 text-right tabular-nums">{stays}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{usd(spend)}</td>
                <td className="px-4 py-3 text-[12.5px] text-tinta">
                  {last ? (
                    <Link href={`/panel/reservas/${last.id}`} className="hover:text-laguna">
                      {last.code} · {formatDayMonth(last.checkIn)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
