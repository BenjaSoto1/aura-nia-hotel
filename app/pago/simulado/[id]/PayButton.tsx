"use client";
import { useState } from "react";

export function PayButton({ paymentId, code, label, processing }: { paymentId: string; code: string; label: string; processing: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pay = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/pay/simulated/${paymentId}`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error ?? "Error");
      setBusy(false);
      return;
    }
    window.location.href = `/pago/exito?code=${code}&pid=${paymentId}`;
  };
  return (
    <>
      <button onClick={pay} disabled={busy} className="mt-6 w-full rounded-md bg-[#635bff] py-3 text-[15px] font-semibold text-white shadow hover:bg-[#5146f0] disabled:opacity-60">
        {busy ? processing : label}
      </button>
      {err && <div className="mt-2 text-sm text-coral">{err}</div>}
    </>
  );
}
