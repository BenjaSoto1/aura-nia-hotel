import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { loadHotelPack, rate, roomName } from "@/lib/hotel-pack";
import { formatRange } from "@/lib/dates";
import { CheckinFlow } from "./CheckinFlow";

export const dynamic = "force-dynamic";

export default async function Checkin({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await db.reservation.findUnique({ where: { checkinToken: token }, include: { guest: true, payments: true } });
  if (!res) notFound();
  const pack = loadHotelPack();
  const lang = res.guest.language === "en" ? "en" : "es";
  return (
    <div lang={lang} className="min-h-screen bg-fondo">
      <div className="mx-auto max-w-md px-5 pb-12">
        <div className="relative -mx-5 h-44 bg-cover bg-center" style={{ backgroundImage: `url(${pack.habitaciones.find((h) => h.codigo === res.roomTypeCode)?.foto})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-oscuro/90 to-transparent" />
          <div className="absolute bottom-3 left-5 text-white">
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">Pre-check-in · {res.code}</div>
            <div className="font-serif text-2xl">{pack.hotel.nombre}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-arena-200 bg-white p-4 text-sm text-tinta">
          <div className="font-semibold text-oscuro">{res.guest.fullName}</div>
          {roomName(res.roomTypeCode, lang)} · {formatRange(res.checkIn, res.checkOut, lang)} · {res.adults} {lang === "en" ? "guests" : "personas"}{res.pets ? ` · ${res.pets} ${lang === "en" ? "pet" : "mascota"}` : ""}
        </div>
        <CheckinFlow
          token={token}
          initialStatus={res.status}
          initialRoom={res.roomNumber}
          needsGuarantee={res.paymentMode === "pay_at_hotel"}
          guaranteeUsd={rate(res.ratePlanCode).garantia_usd ?? 100}
          checkInTime={pack.politicas.check_in}
          petPolicy={lang === "en" ? pack.politicas.mascotas_en ?? pack.politicas.mascotas : pack.politicas.mascotas}
          lang={lang}
          initialGuarantee={res.payments.some((p) => p.kind === "preauth" && p.status === "authorized")}
        />
      </div>
    </div>
  );
}
