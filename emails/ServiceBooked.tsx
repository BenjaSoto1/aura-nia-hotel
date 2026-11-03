import * as React from "react";
import { Column, Img, Row, Section, Text } from "@react-email/components";
import { Actions, Btn, C, CodeChip, Intro, Notice, serif, Shell, t, type EmailData } from "./shared";

export function serviceSubject(d: EmailData) {
  const s = d.service!;
  return d.lang === "en"
    ? `Confirmed · ${s.name} · ${s.dayLong}, ${s.time} · ${d.hotel.name}`
    : `Confirmado · ${s.name} · ${s.dayLong}, ${s.time} · ${d.hotel.name}`;
}

const label: React.CSSProperties = { fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, margin: 0 };

/** Confirmación de un servicio del hotel (mesa en Brasa, navegación, cena en la arena, ritual…) con invitación de calendario. */
export default function ServiceBooked({ d }: { d: EmailData }) {
  const s = d.service!;
  const cell = (k: string, v: string, sub?: string, left = false) => (
    <Column style={{ width: "50%", verticalAlign: "top", padding: left ? "16px 16px 16px 0" : "16px 0 16px 20px", borderLeft: left ? undefined : `1px solid ${C.line}` }}>
      <Text style={label}>{k}</Text>
      <Text style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, margin: "2px 0 0", lineHeight: "28px" }}>{v}</Text>
      {sub ? <Text style={{ fontSize: 12, color: C.muted, margin: 0 }}>{sub}</Text> : null}
    </Column>
  );
  return (
    <Shell d={d} preview={t(d, `${s.name}: ${s.dayLong} a las ${s.time}. Reserva ${d.code}.`, `${s.name}: ${s.dayLong} at ${s.time}. Booking ${d.code}.`)}>
      {s.image ? (
        <Section style={{ backgroundColor: "#C9B58F" }}>
          <Img src={s.image} alt={s.name} width="560" height="200" style={{ width: "100%", maxWidth: 560, height: "auto", display: "block", border: 0 }} />
        </Section>
      ) : null}
      <Intro
        eyebrow={t(d, "Experiencia confirmada", "Experience confirmed")}
        title={s.name + ","}
        italic={t(d, `te esperamos, ${d.firstName}.`, `we'll see you there, ${d.firstName}.`)}
        body={s.description}
        chip={<CodeChip d={d} />}
      />
      <Section style={{ padding: "28px 36px 0" }}>
        <Section style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
          <Row>
            {cell(t(d, "Día", "Day"), s.dayLong, undefined, true)}
            {cell(t(d, "Hora", "Time"), s.time, s.duration ? t(d, `Duración ${s.duration}`, `Duration ${s.duration}`) : undefined)}
          </Row>
          <Row style={{ borderTop: `1px solid ${C.line}` }}>
            {cell(t(d, "Cargo", "Charge"), s.price ?? t(d, "Sin costo", "No charge"), s.price ? t(d, "Se suma a la cuenta de tu habitación", "Added to your room bill") : t(d, "Solo reservamos tu lugar", "We just hold your spot"), true)}
            {cell(t(d, "Tu estadía", "Your stay"), `${d.arrivalShort ?? d.checkInLong} – ${d.departureShort ?? d.checkOutLong}`, d.roomName)}
          </Row>
        </Section>
      </Section>
      {s.notes ? <Notice title={t(d, "Detalle", "Details")} text={s.notes} /> : null}
      <Actions note={t(d, `¿Quieres cambiar la hora o cancelarlo? Escríbele a ${d.agentName} y lo ajustamos.`, `Want to change the time or cancel? Message ${d.agentName} and we'll adjust it.`)}>
        {s.gcalLink ? <Btn href={s.gcalLink}>{t(d, "Agregar a Google Calendar", "Add to Google Calendar")}</Btn> : null}
        <Btn href={d.manageLink ?? d.chatLink ?? d.whatsappLink} primary={false}>
          {t(d, `Escribir a ${d.agentName}`, `Message ${d.agentName}`)}
        </Btn>
      </Actions>
    </Shell>
  );
}
