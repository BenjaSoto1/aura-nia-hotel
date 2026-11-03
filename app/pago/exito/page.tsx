"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const T = {
  es: {
    cancelled: "Pago cancelado",
    cancelledSub: "Puedes volver al chat y pedir un nuevo enlace cuando quieras.",
    received: "¡Pago recibido!",
    booking: "Reserva",
    closed: "cerrada. Te enviamos el comprobante a",
    confirmed: "confirmada. Te enviamos la confirmación a",
    close: "Ya puedes cerrar esta pestaña y volver a la conversación.",
    waiting: "Confirmando tu pago…",
    waitingSub: (code: string) => `Esperamos la confirmación de la pasarela de pago. La reserva ${code} se confirma apenas llega.`,
    slow: "¿Tarda? Revisa que npm run stripe:listen esté corriendo.",
  },
  en: {
    cancelled: "Payment cancelled",
    cancelledSub: "You can go back to the chat and ask for a new link anytime.",
    received: "Payment received!",
    booking: "Booking",
    closed: "is closed. We sent the receipt to",
    confirmed: "is confirmed. We sent the confirmation to",
    close: "You can close this tab and go back to the conversation.",
    waiting: "Confirming your payment…",
    waitingSub: (code: string) => `We're waiting for the payment gateway's confirmation. Booking ${code} is confirmed as soon as it arrives.`,
    slow: "Taking long? Check that npm run stripe:listen is running.",
  },
};

function Inner() {
  const sp = useSearchParams();
  const code = sp.get("code");
  const cancelled = sp.get("cancelled");
  const [status, setStatus] = useState<{ status: string; email?: string; language?: string } | null>(null);

  useEffect(() => {
    if (!code) return;
    const load = () => fetch(`/api/reservation-status?code=${code}`).then((r) => r.json()).then(setStatus).catch(() => {});
    load();
    if (cancelled) return;
    const id = setInterval(load, 1500);
    return () => clearInterval(id);
  }, [code, cancelled]);

  const t = T[status?.language === "en" ? "en" : "es"];
  const done = status && ["confirmed", "precheckin_done", "in_house", "checked_out"].includes(status.status);
  return (
    <div className="grid min-h-screen place-items-center bg-fondo px-6">
      <div className="w-full max-w-md rounded-3xl border border-arena-200 bg-white p-8 text-center shadow-sm">
        {cancelled ? (
          <>
            <div className="text-4xl">↩︎</div>
            <h1 className="mt-3 font-serif text-2xl">{t.cancelled}</h1>
            <p className="mt-2 text-sm text-tinta">{t.cancelledSub}</p>
          </>
        ) : done ? (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-laguna text-2xl text-white">✓</div>
            <h1 className="mt-3 font-serif text-2xl">{t.received}</h1>
            <p className="mt-2 text-sm text-tinta">
              {t.booking} <strong>{code}</strong> {status?.status === "checked_out" ? t.closed : t.confirmed} {status?.email}.
            </p>
            <p className="mt-4 text-[12px] text-gris">{t.close}</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex justify-center gap-1.5 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-2.5 w-2.5 rounded-full bg-laguna" />
              ))}
            </div>
            <h1 className="font-serif text-2xl">{t.waiting}</h1>
            <p className="mt-2 text-sm text-tinta">{t.waitingSub(code ?? "")}</p>
            <p className="mt-3 text-[11px] text-gris">{t.slow}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
