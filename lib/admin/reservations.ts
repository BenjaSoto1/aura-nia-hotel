// Búsqueda y filtros de reservas para el panel (y la exportación CSV con los mismos filtros).
import { db } from "../db";
import { loadHotelPack } from "../hotel-pack";

export interface ReservationFilters {
  q?: string;
  status?: string;
  channel?: string;
  rate?: string;
  room?: string;
  from?: string; // llegada desde (AAAA-MM-DD)
  to?: string; // llegada hasta
  sort?: "created" | "arrival" | "total";
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function searchReservations(f: ReservationFilters) {
  const all = await db.reservation.findMany({
    where: {
      ...(f.status ? { status: f.status } : {}),
      ...(f.channel ? { createdVia: f.channel } : {}),
      ...(f.rate ? { ratePlanCode: f.rate } : {}),
      ...(f.room ? { roomTypeCode: f.room } : {}),
      ...(f.from || f.to
        ? { checkIn: { ...(f.from ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}), ...(f.to ? { lte: new Date(`${f.to}T00:00:00Z`) } : {}) } }
        : {}),
    },
    include: { guest: true, payments: { orderBy: { createdAt: "desc" } }, folioLines: true },
    take: 1000,
  });
  // Búsqueda libre en memoria: igual en SQLite y Postgres, sin distinguir mayúsculas ni tildes.
  const q = f.q ? norm(f.q.trim()) : "";
  const list = q
    ? all.filter((r) => [r.code, r.guest.fullName, r.guest.email, r.guest.phone].some((v) => v && norm(v).includes(q)))
    : all;
  const sort = f.sort ?? "created";
  list.sort((a, b) =>
    sort === "arrival" ? a.checkIn.getTime() - b.checkIn.getTime() : sort === "total" ? b.totalCents - a.totalCents : b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return list;
}

export function filterOptions() {
  const pack = loadHotelPack();
  return {
    statuses: [
      ["pending_payment", "Pendiente de pago"],
      ["confirmed", "Confirmada"],
      ["precheckin_done", "Pre-check-in listo"],
      ["in_house", "En casa"],
      ["checked_out", "Checkout"],
      ["cancelled", "Cancelada"],
      ["expired", "Vencida"],
    ],
    channels: [
      ["whatsapp", "WhatsApp"],
      ["web", "Web"],
      ["phone", "Teléfono"],
      ["instagram", "Instagram"],
      ["messenger", "Messenger"],
    ],
    rates: pack.tarifas.map((t) => [t.codigo, t.nombre]),
    rooms: pack.habitaciones.map((h) => [h.codigo, h.nombre_es]),
  };
}

export function filtersFromParams(sp: Record<string, string | undefined>): ReservationFilters {
  const pick = (k: string) => (sp[k] && sp[k]!.trim() ? sp[k]!.trim() : undefined);
  const sort = pick("sort");
  return {
    q: pick("q"),
    status: pick("status"),
    channel: pick("channel"),
    rate: pick("rate"),
    room: pick("room"),
    from: pick("from"),
    to: pick("to"),
    sort: sort === "arrival" || sort === "total" ? sort : "created",
  };
}
