import * as React from "react";
import { Actions, Btn, CodeChip, Hero, Intro, Notice, Shell, StayGrid, t, type EmailData } from "./shared";

export function cancellationSubject(d: EmailData, range: string) {
  return d.lang === "en"
    ? `Booking cancelled · ${d.hotel.name} · ${range} · ${d.code}`
    : `Reserva cancelada · ${d.hotel.name} · ${range} · ${d.code}`;
}

export default function ReservationCancelled({ d }: { d: EmailData }) {
  return (
    <Shell d={d} preview={t(d, `Cancelamos tu reserva ${d.code}. Ojalá nos veamos pronto.`, `We cancelled booking ${d.code}. We hope to see you soon.`)}>
      <Hero d={d} />
      <Intro
        eyebrow={t(d, "Reserva cancelada", "Booking cancelled")}
        title={t(d, "Cancelamos tu reserva,", "We cancelled your booking,")}
        italic={`${d.firstName}.`}
        body={t(d, "Lamentamos no verte esta vez. Aquí tienes el detalle de lo que cancelamos.", "We're sorry we won't see you this time. Here are the details of what we cancelled.")}
        chip={<CodeChip d={d} />}
      />
      {d.notice ? <Notice title={t(d, "Política aplicada", "Policy applied")} text={d.notice} /> : null}
      <StayGrid d={d} />
      <Actions note={t(d, `Si fue un error, escríbele a ${d.agentName} y te ayudamos a reservar de nuevo.`, `If this was a mistake, message ${d.agentName} and we'll help you book again.`)}>
        <Btn href={d.bookAgainLink ?? d.whatsappLink}>{t(d, "Reservar otra fecha", "Book another date")}</Btn>
      </Actions>
    </Shell>
  );
}
