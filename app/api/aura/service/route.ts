import { NextResponse } from "next/server";
import { z } from "zod";
import { now } from "@/lib/clock";
import { hotelDateISO, toISODate } from "@/lib/dates";
import { loadHotelPack } from "@/lib/hotel-pack";
import { findManageable, manageableReservations } from "@/lib/tools/manage";
import { bookService, designExtraToService, serviceName } from "@/lib/tools/services";
import type { ToolContext } from "@/lib/tools/context";

export const dynamic = "force-dynamic";

/**
 * Experiencias del sitio de Aura (Nía Mode): "Reservar mesa", "Agregar a mi estadía" (atardecer) y "Reservar ritual".
 * Si el huésped de esta sesión ya tiene una reserva, el servicio se reserva de verdad en su folio y le llega
 * un correo de confirmación con invitación de calendario. Si no, responde needsStay: queda en "Tu estadía"
 * y se confirma junto con la habitación (mismo correo de confirmación).
 */
const Body = z.object({
  sessionId: z.string().min(3).max(80),
  code: z.string().max(20).optional(),
  lang: z.enum(["es", "en"]).default("es"),
  kind: z.enum(["dinner", "sunset", "spa"]),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sun: z.enum(["sail", "sand", "bar"]).optional(),
  ritual: z.enum(["piedras", "masaje", "tina", "yoga"]).optional(),
  slot: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const b = parsed.data;
  const en = b.lang === "en";
  const ctx: ToolContext = { channel: "web", channelUserId: b.sessionId, lang: b.lang };
  const today = hotelDateISO(await now(), loadHotelPack().hotel.zona_horaria);

  // Reserva del huésped de esta sesión: la que indica el sitio o la próxima vigente.
  let res = null;
  if (b.code) {
    const m = await findManageable(b.code, undefined, ctx);
    if ("res" in m) res = m.res;
  }
  if (!res) res = (await manageableReservations(ctx)).find((r) => toISODate(r.checkOut) >= today) ?? null;

  const x = designExtraToService(b, res ?? { checkIn: new Date(`${today}T00:00:00Z`), checkOut: new Date(`${today}T00:00:00Z`) }, today);
  const name = serviceName(x.serviceCode, b.lang);
  if (!res) {
    return NextResponse.json({
      ok: false,
      needsStay: true,
      say: en
        ? `Noted: ${name}, ${x.datetime.slice(11)}. It's part of your stay and is confirmed together with your room, in the same confirmation email.`
        : `Anotado: ${name}, ${x.datetime.slice(11)}. Queda en tu estadía y se confirma junto con tu habitación, en el mismo correo de confirmación.`,
    });
  }

  const r = await bookService({ reservationCode: res.code, ...x }, ctx);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, say: r.error });
  const d = r.data!;
  const mail = d.emailSentTo
    ? en ? ` I sent the confirmation to ${d.emailSentTo}.` : ` Te envié la confirmación a ${d.emailSentTo}.`
    : d.note ? ` ${d.note}` : "";
  return NextResponse.json({
    ok: true,
    code: res.code,
    service: d.service,
    when: d.when,
    emailSentTo: d.emailSentTo,
    say: (en ? `Booked: ${d.service}, ${d.when}. ${d.charged}.` : `Reservado: ${d.service}, ${d.when}. ${d.charged}.`) + mail,
  });
}
