import { db } from "@/lib/db";
import { renderReservationEmail, type EmailKind } from "@/lib/tools/email";

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
