import { db } from "../db";
import { loadHotelPack, service } from "../hotel-pack";
import { usd } from "../money";
import { logEvent } from "../lifecycle";
import { fail, ok, type ToolContext, type ToolResult } from "./context";

export async function bookService(
  input: { reservationCode: string; serviceCode: string; datetime: string; notes?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  if (["cancelled", "expired", "checked_out"].includes(res.status)) return fail(en ? "That reservation is not active." : "Esa reserva no está activa.");
  const svc = service(String(input.serviceCode).toUpperCase());
  if (!svc) return fail(en ? "Unknown service." : "Servicio desconocido. Opciones: " + loadHotelPack().servicios.map((s) => `${s.codigo} (${s.nombre})`).join(", "));
  const when = String(input.datetime || "").trim();
  if (!when) return fail(en ? "Please give a date and time." : "Indica fecha y hora.");
  await db.serviceBooking.create({ data: { reservationId: res.id, serviceCode: svc.codigo, datetime: when, notes: input.notes } });
  const name = en ? svc.nombre_en ?? svc.nombre : svc.nombre;
  if (svc.precio_usd) {
    await db.folioLine.create({ data: { reservationId: res.id, concept: "service", label: `${name} · ${when}`, amountCents: Math.round(svc.precio_usd * 100) } });
  }
  await logEvent(res.id, "service_booked", `${name} · ${when}${svc.precio_usd ? ` · ${usd(svc.precio_usd * 100)} al folio` : ""}`);
  return ok({
    reservationCode: res.code,
    service: name,
    datetime: when,
    charged: svc.precio_usd ? usd(svc.precio_usd * 100, ctx.lang) + (en ? " added to your room bill" : " sumado a tu cuenta") : en ? "no charge to book" : "sin costo de reserva",
    hours: svc.horario ?? null,
  });
}
