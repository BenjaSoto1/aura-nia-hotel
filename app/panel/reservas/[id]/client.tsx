"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminActionsProps {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  roomTypeCode: string;
  guests: number;
  balanceCents: number;
  hasPhone: boolean;
  rooms: { code: string; name: string; max: number }[];
  services: { code: string; name: string; price?: string }[];
}

/** Barra de recepción: acciones rápidas + formularios para modificar la estadía y sumar servicios. */
export function ReservationActions(p: AdminActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<"modify" | "service" | null>(null);
  const active = ["confirmed", "pending_payment", "precheckin_done", "in_house"].includes(p.status);

  const act = async (action: string, extra: Record<string, unknown> = {}, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/panel/reservations/${p.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const d = await r.json();
    const ok = d.ok !== false && !d.error;
    const text =
      d.error ??
      d.message ??
      d.data?.policyApplied ??
      (d.status === "failed" ? "No se pudo enviar: el detalle está en la línea de tiempo" : d.subject ? `${d.status === "sent" ? `Enviado por ${d.provider}` : "Guardado (correo simulado)"}: ${d.subject}` : "Listo");
    setMsg({ ok, text });
    setBusy(false);
    if (ok) setPanel(null);
    router.refresh();
  };

  const btn = "rounded-full border border-arena-200 bg-white px-3 py-1.5 text-[12px] font-semibold hover:border-oscuro disabled:opacity-50";
  const field = "rounded-lg border border-arena-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-oscuro";
  const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {active && (
          <button disabled={busy} onClick={() => setPanel(panel === "modify" ? null : "modify")} className={`${btn} ${panel === "modify" ? "border-oscuro" : ""}`}>
            ✎ Modificar estadía
          </button>
        )}
        {active && (
          <button disabled={busy} onClick={() => setPanel(panel === "service" ? null : "service")} className={`${btn} ${panel === "service" ? "border-oscuro" : ""}`}>
            ✦ Agregar servicio
          </button>
        )}
        {["confirmed", "precheckin_done"].includes(p.status) && (
          <button disabled={busy} onClick={() => act("checkin")} className={btn}>
            ⇥ Registrar check-in
          </button>
        )}
        {["confirmed", "precheckin_done", "in_house"].includes(p.status) && (
          <button
            disabled={busy}
            onClick={() =>
              p.balanceCents > 0
                ? act("checkout", { collect: true }, `Saldo pendiente ${money(p.balanceCents)}. ¿Registrar el cobro en recepción y cerrar la estadía?`)
                : act("checkout", {}, "¿Cerrar la estadía y enviar el comprobante?")
            }
            className={btn}
          >
            ⇤ Checkout{p.balanceCents > 0 ? ` · cobrar ${money(p.balanceCents)}` : ""}
          </button>
        )}
        {(p.status === "pending_payment" || (active && p.balanceCents > 0)) && p.hasPhone && (
          <button disabled={busy} onClick={() => act("paylink")} className={btn}>
            💳 Enviar enlace de pago
          </button>
        )}
        <button disabled={busy} onClick={() => act("resend")} className={btn}>
          ✉ Reenviar confirmación
        </button>
        {active && (
          <button disabled={busy} onClick={() => act("cancel", {}, "¿Cancelar esta reserva? Se aplicará la política de cancelación y se enviará el correo.")} className={`${btn} text-laguna-600`}>
            Cancelar reserva
          </button>
        )}
      </div>

      {panel === "modify" && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border border-arena-200 bg-cal p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act("modify", Object.fromEntries(f.entries()));
          }}
        >
          <label className="flex flex-col text-[11px] text-gris">
            Llegada
            <input type="date" name="checkIn" defaultValue={p.checkIn} className={field} />
          </label>
          <label className="flex flex-col text-[11px] text-gris">
            Salida
            <input type="date" name="checkOut" defaultValue={p.checkOut} className={field} />
          </label>
          <label className="flex flex-col text-[11px] text-gris">
            Habitación
            <select name="roomTypeCode" defaultValue={p.roomTypeCode} className={field}>
              {p.rooms.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} (hasta {r.max})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[11px] text-gris">
            Huéspedes
            <select name="guests" defaultValue={String(p.guests)} className={field}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button disabled={busy} className="rounded-lg bg-oscuro px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            Aplicar cambio
          </button>
          <span className="w-full text-[11px] text-gris">Recalcula precio y disponibilidad, actualiza calendario y recordatorios, y envía el correo de reserva modificada. Recepción puede cambiar también con menos de 48 h.</span>
        </form>
      )}

      {panel === "service" && (
        <form
          className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl border border-arena-200 bg-cal p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const dt = String(f.get("datetime") ?? "").replace("T", " ");
            act("service", { serviceCode: f.get("serviceCode"), datetime: dt });
          }}
        >
          <label className="flex flex-col text-[11px] text-gris">
            Servicio
            <select name="serviceCode" className={field}>
              {p.services.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                  {s.price ? ` · ${s.price}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[11px] text-gris">
            Fecha y hora
            <input type="datetime-local" name="datetime" required defaultValue={`${p.checkIn}T19:00`} className={field} />
          </label>
          <button disabled={busy} className="rounded-lg bg-oscuro px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            Agregar al folio
          </button>
        </form>
      )}

      {msg && (
        <div className={`mt-2 text-[12.5px] ${msg.ok ? "text-bruma" : "text-laguna-600"}`}>
          {msg.ok ? "✓ " : "⚠ "}
          {msg.text}
        </div>
      )}
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
