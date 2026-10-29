import { randomBytes } from "node:crypto";
import { db } from "../db";
import { checkinUrl, logEvent } from "../lifecycle";
import { fail, ok, type ToolContext, type ToolResult } from "./context";

export async function ensureCheckinToken(reservationId: string) {
  const res = await db.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (res.checkinToken) return res.checkinToken;
  const token = randomBytes(12).toString("base64url");
  await db.reservation.update({ where: { id: reservationId }, data: { checkinToken: token } });
  await logEvent(reservationId, "checkin_link", "Enlace de pre-check-in generado");
  return token;
}

export async function startCheckin(input: { reservationCode: string }, ctx: ToolContext): Promise<ToolResult> {
  const en = ctx.lang === "en";
  const res = await db.reservation.findUnique({ where: { code: String(input.reservationCode).toUpperCase() } });
  if (!res) return fail(en ? "Reservation not found." : "No encontré esa reserva.");
  if (res.status === "precheckin_done") return ok({ reservationCode: res.code, status: "already_done", roomNumber: res.roomNumber });
  if (res.status !== "confirmed") return fail(en ? "Check-in is available for confirmed bookings only." : "El check-in está disponible solo para reservas confirmadas.");
  const token = await ensureCheckinToken(res.id);
  const url = checkinUrl(token);
  return ok(
    { reservationCode: res.code, url, howTo: "También puede hacerlo en el chat: botón 'Empezar check-in' y enviar foto del documento." },
    [
      { type: "link", url, title: en ? "Start pre-check-in" : "Hacer pre-check-in" },
      { type: "buttons", items: [{ id: `checkin_start:${res.code}`, title: en ? "Check in here in the chat" : "Hacerlo aquí en el chat" }] },
    ],
  );
}
