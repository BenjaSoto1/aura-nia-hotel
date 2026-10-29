"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuraWordmark, NiaMonogram } from "./brand";

interface Status {
  agent: { mode: string; model: string };
  stripe: string;
  google: string;
  email: string;
  voice: string;
  whatsapp: string;
  timeTravel: boolean;
  now: string;
}

function Chip({ label, value, real }: { label: string; value: string; real: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${real ? "border-bruma/30 bg-[#e8eeea] text-bruma" : "border-arena-200 bg-white text-gris"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${real ? "bg-bruma" : "bg-[#c9b99f]"}`} />
      {label}: {value}
    </span>
  );
}

export function useStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/status").then((r) => r.json()).then(setS).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);
  return s;
}

export function IntegrationChips() {
  const s = useStatus();
  if (!s) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip label="Cerebro" value={s.agent.mode === "ai" ? "Claude" : "guiado"} real={s.agent.mode === "ai"} />
      <Chip label="Voz" value={s.voice === "elevenlabs" ? "ElevenLabs" : "navegador"} real={s.voice === "elevenlabs"} />
      <Chip label="Stripe" value={s.stripe === "real" ? "test" : "simulado"} real={s.stripe === "real"} />
      <Chip label="Google" value={s.google} real={s.google === "real"} />
      <Chip label="Correo" value={s.email} real={s.email !== "simulated"} />
      <Chip label="Meta" value="simulado" real={false} />
    </div>
  );
}

export function TimeTravel({ reservationId, compact = false }: { reservationId?: string; compact?: boolean }) {
  const s = useStatus();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!s?.timeTravel) return null;
  const go = async (action: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/dev/time-travel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reservationId }) });
      const d = await r.json().catch(() => ({ error: `Error ${r.status} del servidor` }));
      if (d.error) setMsg(d.error);
      else if (action === "reset") setMsg("Reloj real restablecido");
      else setMsg(`Reloj movido${d.code ? ` (${d.code})` : ""} · ${d.processed ?? 0} recordatorio(s) enviados`);
    } catch {
      setMsg("No se pudo contactar al servidor");
    } finally {
      setBusy(false);
    }
  };
  const btn = "rounded-full border border-arena-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-oscuro hover:border-laguna hover:text-laguna disabled:opacity-50";
  const clock = new Date(s.now).toLocaleString("es-ES", { timeZone: "America/Puerto_Rico", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold text-gris">🕰 Hotel: {clock}</span>
      <button disabled={busy} onClick={() => go("precheckin")} className={btn}>
        ⏩ 24 h antes del check-in
      </button>
      <button disabled={busy} onClick={() => go("checkout_day")} className={btn}>
        ⏩ Día de salida
      </button>
      {!compact && (
        <button disabled={busy} onClick={() => go("plus1h")} className={btn}>
          +1 h
        </button>
      )}
      <button disabled={busy} onClick={() => go("reset")} className={btn} title="Volver al reloj real">
        ↺
      </button>
      {msg && <span className="text-[11px] text-laguna">{msg}</span>}
    </div>
  );
}

export function TopNav({ hotelName, active }: { hotelName: string; active?: "consola" | "panel" | "conversaciones" | "web" }) {
  const item = (href: string, label: string, key: string) => (
    <Link href={href} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${active === key ? "bg-oscuro text-white" : "text-tinta hover:bg-arena"}`}>
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-arena-200 bg-fondo/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3 px-4 py-2.5 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <NiaMonogram size={32} />
          <AuraWordmark name={hotelName} className="text-[24px] leading-none" />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-gris sm:inline">· Nía omnicanal</span>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {item("/", "Consola", "consola")}
          {item("/canal/web", "Sitio web", "web")}
          {item("/panel", "Reservas", "panel")}
          {item("/panel/conversaciones", "Conversaciones", "conversaciones")}
        </nav>
        <div className="ml-auto hidden md:block">
          <IntegrationChips />
        </div>
      </div>
    </header>
  );
}
