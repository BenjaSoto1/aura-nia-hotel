import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BOOKED } from "@/lib/admin/metrics";
import { formatRange, nightsBetween } from "@/lib/dates";
import { rateName, roomName } from "@/lib/hotel-pack";
import { usd } from "@/lib/money";
import { partsToPlainText } from "@/lib/conversations";
import type { Part } from "@/lib/types";
import { StatTile } from "@/components/admin/charts";
import { ChannelTag, StatusBadge } from "@/components/panel/badges";

export const dynamic = "force-dynamic";

export default async function Huesped({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await db.guest.findUnique({
    where: { id },
    include: { reservations: { orderBy: { checkIn: "desc" }, include: { emails: { orderBy: { createdAt: "desc" } } } }, identities: true },
  });
  if (!g) notFound();
  const convs = await db.conversation.findMany({
    where: { OR: [{ guestId: g.id }, ...g.identities.map((i) => ({ channel: i.channel, channelUserId: i.channelUserId }))] },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const booked = g.reservations.filter((r) => BOOKED.includes(r.status));
  const spend = booked.reduce((s, r) => s + r.totalCents, 0);
  const nights = booked.reduce((s, r) => s + nightsBetween(r.checkIn, r.checkOut), 0);
  const emails = g.reservations.flatMap((r) => r.emails.map((e) => ({ ...e, code: r.code }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const time = (d: Date) => d.toLocaleString("es-ES", { timeZone: "America/Puerto_Rico", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <Link href="/panel/huespedes" className="text-sm text-gris hover:text-laguna">
        ← Huéspedes
      </Link>
      <h1 className="mt-2 font-serif text-[34px] leading-tight">{g.fullName ?? "Huésped sin nombre"}</h1>
      <div className="mt-1 text-[13px] text-tinta">
        {g.email} · {g.phone} · idioma <span className="uppercase">{g.language}</span> · perfil creado el {time(g.createdAt)}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {g.identities.map((i) => (
          <span key={i.id} className="inline-flex items-center gap-1.5">
            <ChannelTag channel={i.channel} />
            <span className="text-[11px] text-gris">{i.channelUserId}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Estadías vendidas" value={String(booked.length)} hint={`${g.reservations.length} reservas en total`} />
        <StatTile label="Gasto total" value={usd(spend)} />
        <StatTile label="Noches" value={String(nights)} />
        <StatTile label="Conversaciones" value={String(convs.length)} hint="en todos los canales" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-arena-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold">Reservas</h2>
          <table className="mt-3 w-full text-left text-[13px]">
            <tbody>
              {g.reservations.map((r) => (
                <tr key={r.id} className="border-t border-arena-200/70">
                  <td className="py-2.5 pr-3">
                    <Link href={`/panel/reservas/${r.id}`} className="font-semibold text-laguna hover:underline">
                      {r.code}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    {formatRange(r.checkIn, r.checkOut)}
                    <div className="text-[11.5px] text-gris">
                      {roomName(r.roomTypeCode, "es")} · {rateName(r.ratePlanCode, "es")}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">{usd(r.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-arena-200 bg-white p-5">
            <h2 className="text-[15px] font-semibold">Conversaciones</h2>
            <ul className="mt-3 space-y-2.5 text-[13px]">
              {convs.length === 0 && <li className="text-gris">Sin conversaciones</li>}
              {convs.map((c) => (
                <li key={c.id}>
                  <Link href={`/panel/conversaciones?c=${c.id}`} className="block hover:text-laguna">
                    <div className="flex items-center gap-2">
                      <ChannelTag channel={c.channel} />
                      <span className="text-[11.5px] text-gris">{time(c.updatedAt)}</span>
                      {c.needsHuman && <span className="rounded-full bg-laguna px-1.5 text-[10px] font-bold text-white">PERSONA</span>}
                    </div>
                    <div className="mt-0.5 truncate text-[12.5px] text-tinta">{c.messages[0] ? partsToPlainText(JSON.parse(c.messages[0].partsJson) as Part[]) : ""}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-arena-200 bg-white p-5">
            <h2 className="text-[15px] font-semibold">Correos enviados</h2>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {emails.length === 0 && <li className="text-gris">Sin correos</li>}
              {emails.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2">
                  <a href={`/api/panel/email/${e.id}`} target="_blank" className="truncate hover:text-laguna">
                    {e.subject}
                  </a>
                  <span className={`shrink-0 ${e.status === "failed" ? "text-laguna-600" : "text-gris"}`}>{e.status === "sent" ? "enviado" : e.status === "failed" ? "falló" : "simulado"}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
