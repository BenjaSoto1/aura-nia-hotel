import { filtersFromParams, searchReservations } from "@/lib/admin/reservations";
import { nightsBetween, toISODate } from "@/lib/dates";
import { rateName, roomName } from "@/lib/hotel-pack";

export const dynamic = "force-dynamic";

/** Exporta las reservas (con los mismos filtros de la tabla) a CSV para Excel / Google Sheets. */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const list = await searchReservations(filtersFromParams(sp));
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["codigo", "estado", "huesped", "correo", "telefono", "idioma", "llegada", "salida", "noches", "personas", "mascotas", "habitacion", "tarifa", "modalidad_pago", "total_usd", "pagado_usd", "canal", "creada"];
  const rows = list.map((r) => {
    const paid = r.payments.filter((p) => p.status === "paid" && p.kind !== "preauth").reduce((s, p) => s + p.amountCents, 0);
    return [
      r.code,
      r.status,
      r.guest.fullName,
      r.guest.email,
      r.guest.phone,
      r.guest.language,
      toISODate(r.checkIn),
      toISODate(r.checkOut),
      nightsBetween(r.checkIn, r.checkOut),
      r.adults,
      r.pets,
      roomName(r.roomTypeCode, "es"),
      rateName(r.ratePlanCode, "es"),
      r.paymentMode,
      (r.totalCents / 100).toFixed(2),
      (paid / 100).toFixed(2),
      r.createdVia,
      r.createdAt.toISOString(),
    ];
  });
  // BOM para que Excel lea bien las tildes.
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="reservas-aura-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
