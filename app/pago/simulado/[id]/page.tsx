import { notFound } from "next/navigation";
import { AuraWordmark } from "@/components/brand";
import { db } from "@/lib/db";
import { loadHotelPack, roomName } from "@/lib/hotel-pack";
import { formatRange } from "@/lib/dates";
import { usd } from "@/lib/money";
import { PayButton } from "./PayButton";

export const dynamic = "force-dynamic";

const T = {
  es: {
    kind: { prepayment: "Prepago de la reserva", balance: "Saldo de la estadía", preauth: "Garantía (retención, no se cobra)" } as Record<string, string>,
    booking: "Reserva",
    simulated: "Pago simulado: la pasarela de pago está en modo de prueba. Este botón confirma el pago igual que lo haría la pasarela real.",
    email: "Correo",
    card: "Tarjeta",
    fake: "Tarjeta de prueba ficticia (no se envía a ningún lado).",
    authorize: "Autorizar",
    pay: "Pagar",
    sim: "(simulado)",
    used: "Este enlace ya fue usado",
    secure: "🔒 Procesado de forma segura · Nunca compartas tu tarjeta por chat",
    processing: "Procesando…",
  },
  en: {
    kind: { prepayment: "Booking prepayment", balance: "Stay balance", preauth: "Guarantee (hold, not charged)" } as Record<string, string>,
    booking: "Booking",
    simulated: "Simulated payment: the payment gateway is in test mode. This button confirms the payment exactly like the real gateway would.",
    email: "Email",
    card: "Card",
    fake: "Fictitious test card (it is not sent anywhere).",
    authorize: "Authorize",
    pay: "Pay",
    sim: "(simulated)",
    used: "This link was already used",
    secure: "🔒 Securely processed · Never share your card in a chat",
    processing: "Processing…",
  },
};

export default async function SimulatedCheckout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pay = await db.payment.findUnique({ where: { id }, include: { reservation: { include: { guest: true } } } });
  if (!pay) notFound();
  const pack = loadHotelPack();
  const r = pay.reservation;
  const lang = r.guest.language === "en" ? "en" : "es";
  const t = T[lang];
  return (
    <div lang={lang} className="grid min-h-screen bg-[#f6f9fc] md:grid-cols-2">
      <div className="flex flex-col justify-center bg-oscuro px-8 py-12 text-white md:px-16">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <AuraWordmark name={pack.hotel.nombre} className="text-[26px] text-fondo" />
        </div>
        <div className="mt-8 text-sm text-white/60">{t.kind[pay.kind]}</div>
        <div className="mt-1 font-serif text-5xl">{usd(pay.amountCents, lang)}</div>
        <div className="mt-8 space-y-1 text-sm text-white/80">
          <div>
            {t.booking} <strong>{r.code}</strong>
          </div>
          <div>
            {roomName(r.roomTypeCode, lang)} · {formatRange(r.checkIn, r.checkOut, lang)}
          </div>
          <div>{r.guest.fullName}</div>
        </div>
      </div>
      <div className="flex flex-col justify-center px-8 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 rounded-lg border border-[#f5c26b] bg-[#fff8e6] px-3 py-2 text-[12px] text-[#7a5a12]">{t.simulated}</div>
          <label className="text-[13px] font-semibold text-[#30313d]">{t.email}</label>
          <div className="mt-1 rounded-md border border-[#e0e0e0] bg-white px-3 py-2.5 text-sm text-[#30313d]">{r.guest.email}</div>
          <label className="mt-4 block text-[13px] font-semibold text-[#30313d]">{t.card}</label>
          <div className="mt-1 rounded-md border border-[#e0e0e0] bg-[#fafafa] px-3 py-2.5 font-mono text-sm text-gris">4242 4242 4242 4242 · 12/34 · 123</div>
          <div className="mt-1 text-[11px] text-gris">{t.fake}</div>
          {pay.status === "link_sent" ? (
            <PayButton
              paymentId={pay.id}
              code={r.code}
              processing={t.processing}
              label={`${pay.kind === "preauth" ? t.authorize : t.pay} ${usd(pay.amountCents, lang)} ${t.sim}`}
            />
          ) : (
            <div className="mt-6 rounded-md bg-laguna-50 px-3 py-3 text-center text-sm font-semibold text-laguna">
              {t.used} ({pay.status}).
            </div>
          )}
          <div className="mt-6 text-center text-[11px] text-gris">{t.secure}</div>
        </div>
      </div>
    </div>
  );
}
