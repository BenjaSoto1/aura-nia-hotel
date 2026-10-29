"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReservationActions({ id, canCancel }: { id: string; canCancel: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const act = async (action: string) => {
    if (action === "cancel" && !confirm("¿Cancelar esta reserva? Se aplicará la política de cancelación.")) return;
    setBusy(true);
    const r = await fetch(`/api/panel/reservations/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json();
    setMsg(d.error ?? d.data?.policyApplied ?? (d.status === "failed" ? "No se pudo enviar: el detalle está en la línea de tiempo" : d.subject ? `${d.status === "sent" ? `Enviado por ${d.provider}` : "Guardado (correo simulado)"}: ${d.subject}` : "Listo"));
    setBusy(false);
    router.refresh();
  };
  const btn = "rounded-full border border-arena-200 bg-white px-3 py-1.5 text-[12px] font-semibold hover:border-laguna hover:text-laguna disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={busy} onClick={() => act("resend")} className={btn}>
        Reenviar confirmación
      </button>
      {canCancel && (
        <button disabled={busy} onClick={() => act("cancel")} className={`${btn} text-coral`}>
          Cancelar reserva
        </button>
      )}
      {msg && <span className="text-[12px] text-tinta">{msg}</span>}
    </div>
  );
}

interface EmailRow {
  id: string;
  subject: string;
  to: string;
  provider: string;
  status: string;
  kind: string;
  createdAt: string;
}

export function EmailViewer({ reservationId, emails }: { reservationId: string; emails: EmailRow[] }) {
  const [src, setSrc] = useState<string | null>(emails.length ? `/api/panel/email/${emails[emails.length - 1].id}` : null);
  return (
    <div>
      <div className="mt-3 space-y-1.5">
        {emails.map((e) => (
          <button key={e.id} onClick={() => setSrc(`/api/panel/email/${e.id}`)} className="block w-full rounded-lg border border-arena-200 px-3 py-2 text-left hover:border-laguna">
            <div className="truncate text-[13px] font-semibold">{e.subject}</div>
            <div className="text-[11px] text-gris">
              {e.to} · {e.provider === "simulated" ? "simulado (no enviado)" : `${e.provider} · ${e.status}`} · {e.createdAt}
            </div>
          </button>
        ))}
        {emails.length === 0 && <div className="text-sm text-gris">Sin correos todavía.</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-semibold text-gris">Vista previa:</span>
        {[
          ["confirmation", "Confirmación"],
          ["precheckin", "Pre-check-in"],
          ["receipt", "Comprobante"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setSrc(`/api/panel/email/preview?reservation=${reservationId}&kind=${k}`)} className="rounded-full bg-arena px-2.5 py-0.5 text-[11px] font-semibold hover:bg-arena-200">
            {l}
          </button>
        ))}
      </div>
      {src && (
        <div className="mt-3 overflow-hidden rounded-xl border border-arena-200">
          <div className="flex items-center justify-between bg-arena px-3 py-1.5 text-[11px] text-tinta">
            Vista del correo HTML
            <a href={src} target="_blank" className="font-semibold text-laguna">
              Abrir ↗
            </a>
          </div>
          <iframe key={src} src={src} className="h-[640px] w-full bg-white" title="Correo" />
        </div>
      )}
    </div>
  );
}
