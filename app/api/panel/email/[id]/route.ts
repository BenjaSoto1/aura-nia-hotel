import { db } from "@/lib/db";
import { renderReservationEmail, sendReservationEmail, type EmailKind } from "@/lib/tools/email";

export const dynamic = "force-dynamic";

/**
 * HTML de un correo guardado (/api/panel/email/<emailLogId>) o vista previa sin enviar
 * (/api/panel/email/preview?reservation=<id>&kind=confirmation|precheckin|receipt).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let html: string | undefined;
  if (id === "preview") {
    const u = new URL(req.url);
    const reservationId = u.searchParams.get("reservation");
    const kind = (u.searchParams.get("kind") ?? "confirmation") as EmailKind;
    if (reservationId) html = (await renderReservationEmail(reservationId, kind)).html;
  } else {
    html = (await db.emailLog.findUnique({ where: { id } }))?.html;
  }
  if (!html) return new Response("No encontrado", { status: 404 });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Reenvía un correo guardado (mismo tipo, con los datos actuales de la reserva). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = await db.emailLog.findUnique({ where: { id } });
  if (!log?.reservationId) return Response.json({ error: "Correo sin reserva asociada" }, { status: 404 });
  const r = await sendReservationEmail(log.reservationId, log.kind as EmailKind, { serviceBookingId: log.refId ?? undefined });
  return Response.json(r);
}
