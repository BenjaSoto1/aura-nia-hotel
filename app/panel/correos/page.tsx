import Link from "next/link";
import { db } from "@/lib/db";
import { emailProvider } from "@/lib/config";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatTile } from "@/components/admin/charts";
import { ResendButton } from "./client";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = {
  confirmation: "Confirmación",
  modification: "Modificación",
  cancellation: "Cancelación",
  precheckin: "Pre-check-in",
  receipt: "Comprobante",
  service: "Servicio",
};
const STATUS: Record<string, [string, string]> = {
  sent: ["Enviado", "text-bruma"],
  simulated: ["Simulado", "text-gris"],
  failed: ["Falló", "text-laguna-600"],
};

export default async function Correos({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
  const sp = await searchParams;
  const [all, provider] = await Promise.all([
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { reservation: { select: { id: true, code: true } } } }),
    emailProvider(),
  ]);
  const list = all.filter((e) => (!sp.status || e.status === sp.status) && (!sp.kind || e.kind === sp.kind));
  const count = (s: string) => all.filter((e) => e.status === s).length;
  const time = (d: Date) => d.toLocaleString("es-ES", { timeZone: "America/Puerto_Rico", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const link = (k: string, v?: string) => {
    const q = new URLSearchParams(Object.entries({ status: sp.status, kind: sp.kind, [k]: v }).filter(([, x]) => x) as [string, string][]);
    return `/panel/correos?${q}`;
  };
  const pill = (active: boolean) => `rounded-full px-3 py-1 text-[12px] font-semibold ${active ? "bg-oscuro text-white" : "bg-white text-tinta hover:bg-arena"}`;

  return (
    <div>
      <PageHeader title="Correos" subtitle={`Proveedor actual: ${provider === "smtp" ? "Gmail (SMTP)" : provider === "gmail" ? "API de Gmail" : "simulado (no se envía)"}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total" value={String(all.length)} />
        <StatTile label="Enviados" value={String(count("sent"))} />
        <StatTile label="Simulados" value={String(count("simulated"))} />
        <StatTile label="Fallidos" value={String(count("failed"))} hint={count("failed") ? "revisa el error y reenvía" : "sin errores"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <Link href={link("status", undefined)} className={pill(!sp.status)}>
          Todos
        </Link>
        {Object.entries(STATUS).map(([k, [l]]) => (
          <Link key={k} href={link("status", k)} className={pill(sp.status === k)}>
            {l}
          </Link>
        ))}
        <span className="mx-2 h-5 w-px bg-arena-200" />
        <Link href={link("kind", undefined)} className={pill(!sp.kind)}>
          Todos los tipos
        </Link>
        {Object.entries(KIND).map(([k, l]) => (
          <Link key={k} href={link("kind", k)} className={pill(sp.kind === k)}>
            {l}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-arena-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="border-b border-arena-200 text-[11px] uppercase tracking-wider text-gris">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Para</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gris">
                  Sin correos en esta vista.
                </td>
              </tr>
            )}
            {list.map((e) => {
              const [label, cls] = STATUS[e.status] ?? [e.status, "text-tinta"];
              return (
                <tr key={e.id} className="border-b border-arena-200/60 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-gris">{time(e.createdAt)}</td>
                  <td className="px-4 py-3">{KIND[e.kind] ?? e.kind}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/panel/email/${e.id}`} target="_blank" className="font-semibold hover:text-laguna">
                      {e.subject}
                    </a>
                    {e.reservation && (
                      <div className="text-[12px] text-gris">
                        <Link href={`/panel/reservas/${e.reservation.id}`} className="hover:text-laguna">
                          {e.reservation.code}
                        </Link>
                      </div>
                    )}
                    {e.error && <div className="mt-1 max-w-[420px] break-words text-[11.5px] text-laguna-600">{e.error.slice(0, 220)}</div>}
                  </td>
                  <td className="px-4 py-3 text-tinta">{e.to}</td>
                  <td className={`px-4 py-3 font-semibold ${cls}`}>
                    {label}
                    <div className="text-[11px] font-normal text-gris">{e.provider}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{e.reservation && <ResendButton emailId={e.id} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
