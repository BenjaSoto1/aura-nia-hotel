// Flujo guiado para modificar o cancelar una reserva (botones + texto simple). Funciona igual en WhatsApp,
// Instagram, Messenger, la web y el teléfono, en modo IA y guiado: usa las herramientas de tools/manage.ts.
import { now } from "../clock";
import { hotelDateISO, parseDateRange } from "../dates";
import { loadHotelPack, roomName } from "../hotel-pack";
import { usd } from "../money";
import { cancelReservation, cancellationTerms, describeReservation, findManageable, manageableReservations, modifyReservation } from "../tools/manage";
import { priceStay } from "../tools/quote";
import type { ToolContext, ToolResult } from "../tools/context";
import type { InboundMessage, Part } from "../types";
import { formatRange } from "../dates";
import { getState, setState } from "./state";

const CODE_RE = /\b(AUR|KR)[-\s]?(\d{5})\b/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;

/** ¿El texto pide gestionar una reserva existente? (no confundir con preguntar por la política) */
export function wantsToManage(t: string): "cancel" | "modify" | null {
  const s = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(politica|policy|condiciones|terms|cuanto cuesta cancelar|se puede cancelar\?)/.test(s)) return null;
  if (/(cancel|anul)/.test(s) && /(reserva|booking|reservation|estadia|stay|mi |my |aur-|kr-)/.test(s)) return "cancel";
  if (/(modific|cambiar|cambio|mover|reprogram|posponer|adelantar|change|resched|move)/.test(s) && /(reserva|booking|reservation|fecha|date|habitacion|room|huesped|guest|estadia|stay|aur-|kr-)/.test(s)) return "modify";
  if (/(mi reserva|mis reservas|my booking|my reservation|gestionar)/.test(s)) return "modify";
  return null;
}

export async function manageTurn(msg: InboundMessage, ctx: ToolContext): Promise<Part[] | null> {
  const en = ctx.lang === "en";
  const T = (es: string, e: string) => (en ? e : es);
  const b = msg.buttonId ?? "";
  const text = (msg.text ?? "").trim();
  const state = await getState(ctx);
  const clear = () => setState(ctx, { ...state, step: undefined, manage: undefined });

  // ---- vistas ----
  const open = async (code: string): Promise<Part[]> => {
    const f = await findManageable(code, undefined, ctx);
    if ("error" in f) return [{ type: "text", text: f.error }];
    const r = f.res;
    if (r.status === "precheckin_done") {
      return [
        { type: "text", text: `${describeReservation(r, ctx.lang)}\n\n${T("Tu check-in ya está hecho: cualquier cambio lo coordina recepción.", "Your check-in is done: the front desk will handle any change.")}` },
        { type: "buttons", items: [{ id: "menu:human", title: T("Hablar con recepción", "Talk to the front desk") }] },
      ];
    }
    return [
      { type: "text", text: `${describeReservation(r, ctx.lang)}\n\n${T("¿Qué quieres hacer?", "What would you like to do?")}` },
      {
        type: "buttons",
        items: [
          { id: `manage:dates:${r.code}`, title: T("Cambiar fechas", "Change dates") },
          { id: `manage:room:${r.code}`, title: T("Cambiar habitación", "Change room") },
          { id: `manage:guests:${r.code}`, title: T("Cambiar huéspedes", "Change guests") },
          { id: `manage:cancel:${r.code}`, title: T("Cancelar reserva", "Cancel booking") },
        ],
      },
    ];
  };

  const cancelPrompt = async (code: string): Promise<Part[]> => {
    const f = await findManageable(code, undefined, ctx);
    if ("error" in f) return [{ type: "text", text: f.error }];
    const terms = await cancellationTerms(f.res, ctx.lang);
    return [
      { type: "text", text: `${T("¿Seguro que quieres cancelar esta reserva?", "Are you sure you want to cancel this booking?")}\n\n${describeReservation(f.res, ctx.lang)}\n\n${terms.text}` },
      {
        type: "buttons",
        items: [
          { id: `manage:cancelyes:${f.res.code}`, title: T("Sí, cancelar", "Yes, cancel") },
          { id: `manage:open:${f.res.code}`, title: T("No, mantenerla", "No, keep it") },
        ],
      },
    ];
  };

  const afterModify = (code: string, r: ToolResult): Part[] => {
    if (!r.ok) {
      return [
        { type: "text", text: r.error ?? T("No pude aplicar el cambio.", "I couldn't apply the change.") },
        { type: "buttons", items: [{ id: `manage:open:${code}`, title: T("Probar otro cambio", "Try another change") }, { id: "menu:human", title: T("Hablar con una persona", "Talk to a person") }] },
      ];
    }
    const d = r.data as { changes: string[]; paymentNote: string | null; emailSentTo: string | null };
    const lines = [
      T(`Listo ✅ Actualicé tu reserva ${code}:`, `Done ✅ I updated booking ${code}:`),
      ...d.changes.map((c) => `• ${c}`),
      ...(d.paymentNote ? [d.paymentNote] : []),
      ...(d.emailSentTo ? [T(`Te envié el correo con los nuevos detalles a ${d.emailSentTo}.`, `I sent the updated details to ${d.emailSentTo}.`)] : []),
    ];
    return [{ type: "text", text: lines.join("\n") }, ...(r.parts ?? []), { type: "buttons", items: [{ id: `manage:open:${code}`, title: T("Ver mi reserva", "View my booking") }] }];
  };

  const start = async (intent: "cancel" | "modify"): Promise<Part[]> => {
    const list = await manageableReservations(ctx);
    if (!list.length) {
      await setState(ctx, { ...state, step: "manage_lookup", manage: { intent } });
      return [
        {
          type: "text",
          text: T(
            "Claro. Escríbeme el código de tu reserva (por ejemplo AUR-48213) y el correo con que reservaste.",
            "Sure. Send me your booking code (e.g. AUR-48213) and the email you booked with.",
          ),
        },
      ];
    }
    if (list.length === 1) return intent === "cancel" ? cancelPrompt(list[0].code) : open(list[0].code);
    return [
      { type: "text", text: T("Tienes estas reservas. ¿Cuál quieres gestionar?", "You have these bookings. Which one?") },
      {
        type: "buttons",
        items: list.slice(0, 4).map((r) => ({
          id: `manage:${intent === "cancel" ? "cancel" : "open"}:${r.code}`,
          title: `${r.code} · ${formatRange(r.checkIn, r.checkOut, ctx.lang)}`,
        })),
      },
    ];
  };

  // ---- botones ----
  if (b === "manage:start" || b === "manage:start:cancel") {
    await clear();
    return start(b.endsWith(":cancel") ? "cancel" : "modify");
  }
  if (b.startsWith("manage:open:")) {
    await clear();
    return open(b.split(":")[2]);
  }
  if (b.startsWith("manage:dates:")) {
    const code = b.split(":")[2];
    await setState(ctx, { ...state, step: "manage_dates", manage: { code } });
    return [{ type: "text", text: T('¿Cuáles son tus nuevas fechas? Por ejemplo: "del 2 al 5 de noviembre".', 'What are your new dates? E.g. "November 2 to 5".') }];
  }
  if (b.startsWith("manage:room:")) {
    const code = b.split(":")[2];
    const f = await findManageable(code, undefined, ctx);
    if ("error" in f) return [{ type: "text", text: f.error }];
    const rooms = loadHotelPack().habitaciones.filter((h) => h.codigo !== f.res.roomTypeCode);
    return [
      { type: "text", text: T(`Ahora tienes ${roomName(f.res.roomTypeCode, "es")}. ¿A cuál quieres cambiar?`, `You currently have the ${roomName(f.res.roomTypeCode, "en")}. Which one would you like?`) },
      {
        type: "buttons",
        items: rooms.map((h) => ({
          id: `manage:setroom:${code}:${h.codigo}`,
          title: `${roomName(h.codigo, ctx.lang)} · ${usd(priceStay(h.codigo, f.res.ratePlanCode, 1, 0, ctx.lang).nightlyCents, ctx.lang)}${T("/noche", "/night")}`,
        })),
      },
    ];
  }
  if (b.startsWith("manage:setroom:")) {
    const [, , code, roomTypeCode] = b.split(":");
    await clear();
    return afterModify(code, await modifyReservation({ reservationCode: code, roomTypeCode }, ctx));
  }
  if (b.startsWith("manage:guests:")) {
    const code = b.split(":")[2];
    return [
      { type: "text", text: T("¿Cuántas personas se hospedan?", "How many guests?") },
      { type: "buttons", items: [1, 2, 3, 4].map((n) => ({ id: `manage:setguests:${code}:${n}`, title: String(n) })) },
    ];
  }
  if (b.startsWith("manage:setguests:")) {
    const [, , code, n] = b.split(":");
    await clear();
    return afterModify(code, await modifyReservation({ reservationCode: code, guests: Number(n) }, ctx));
  }
  if (b.startsWith("manage:cancel:")) {
    await clear();
    return cancelPrompt(b.split(":")[2]);
  }
  if (b.startsWith("manage:cancelyes:")) {
    const code = b.split(":")[2];
    await clear();
    const r = await cancelReservation({ reservationCode: code }, ctx);
    if (!r.ok) return [{ type: "text", text: r.error ?? T("No pude cancelar la reserva.", "I couldn't cancel the booking.") }];
    const d = r.data as { policyApplied: string; emailSentTo: string | null };
    return [
      {
        type: "text",
        text: [
          T(`Listo, cancelé tu reserva ${code}.`, `Done, I cancelled booking ${code}.`),
          d.policyApplied,
          ...(d.emailSentTo ? [T(`Te envié la confirmación de la cancelación a ${d.emailSentTo}.`, `I sent the cancellation confirmation to ${d.emailSentTo}.`)] : []),
          T("Ojalá nos veamos pronto en Aura.", "We hope to see you soon at Aura."),
        ].join("\n"),
      },
      { type: "buttons", items: [{ id: "menu:book", title: T("Reservar otra fecha", "Book another date") }] },
    ];
  }

  // ---- pasos con texto ----
  if (state.step === "manage_lookup" && text) {
    const code = text.match(CODE_RE) ? `${text.match(CODE_RE)![1].toUpperCase()}-${text.match(CODE_RE)![2]}` : state.manage?.code;
    const email = text.match(EMAIL_RE)?.[0]?.replace(/[.,;]$/, "") ?? state.manage?.email;
    if (code && email) {
      const f = await findManageable(code, email, ctx);
      if ("error" in f) {
        await setState(ctx, { ...state, manage: { ...state.manage, code: undefined, email: undefined } });
        return [{ type: "text", text: `${f.error} ${T("Revisa el código y el correo e inténtalo de nuevo.", "Check the code and email and try again.")}` }];
      }
      await clear();
      return state.manage?.intent === "cancel" ? cancelPrompt(code) : open(code);
    }
    if (code || email) {
      await setState(ctx, { ...state, manage: { ...state.manage, code, email } });
      return [{ type: "text", text: code ? T("Gracias. ¿Y el correo con que reservaste?", "Thanks. And the email you booked with?") : T("Gracias. ¿Y el código de la reserva (AUR-…)?", "Thanks. And the booking code (AUR-…)?") }];
    }
    await clear();
    return null; // no era un dato de reserva: que siga la conversación normal
  }
  if (state.step === "manage_dates" && text) {
    const code = state.manage?.code as string;
    const today = hotelDateISO(await now(), loadHotelPack().hotel.zona_horaria);
    const range = parseDateRange(text, today);
    if (!range) return [{ type: "text", text: T('No entendí las fechas. Prueba con algo como "del 2 al 5 de noviembre".', 'I didn\'t get the dates. Try something like "November 2 to 5".') }];
    await clear();
    return afterModify(code, await modifyReservation({ reservationCode: code, checkIn: range.checkIn, checkOut: range.checkOut }, ctx));
  }

  return null;
}
