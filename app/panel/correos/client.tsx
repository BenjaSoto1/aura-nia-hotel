"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResendButton({ emailId }: { emailId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const resend = async () => {
    setState("busy");
    const r = await fetch(`/api/panel/email/${emailId}`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setState(r.ok && d.status !== "failed" ? "ok" : "err");
    router.refresh();
  };
  return (
    <button
      onClick={resend}
      disabled={state === "busy"}
      className="rounded-full border border-arena-200 px-3 py-1 text-[12px] font-semibold text-tinta hover:border-oscuro disabled:opacity-50"
    >
      {state === "busy" ? "Enviando…" : state === "ok" ? "Reenviado ✓" : state === "err" ? "Falló · reintentar" : "Reenviar"}
    </button>
  );
}
