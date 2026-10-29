import * as React from "react";
import { Column, Img, Link, Row, Section, Text } from "@react-email/components";
import { Actions, Btn, C, CodeChip, Experiences, Hero, Intro, SectionTitle, Shell, StayGrid, Summary, serif, t, type EmailData } from "./shared";

export function confirmationSubject(d: EmailData, range: string) {
  return d.lang === "en"
    ? `Booking confirmed · Your stay at ${d.hotel.name} · ${range} · ${d.code}`
    : `Reserva confirmada · Tu estadía en ${d.hotel.name} · ${range} · ${d.code}`;
}

export default function ReservationConfirmed({ d }: { d: EmailData }) {
  return (
    <Shell d={d} preview={t(d, `Tu ${d.roomName} está lista para el ${d.arrivalLong}. Reserva ${d.code}.`, `Your ${d.roomName} is ready for ${d.arrivalLong}. Booking ${d.code}.`)}>
      <Hero d={d} />
      <Intro
        eyebrow={t(d, "Reserva confirmada", "Booking confirmed")}
        title={t(d, "Te esperamos,", "We're expecting you,")}
        italic={`${d.firstName}.`}
        body={t(d, `Tu ${d.roomName} está lista para el ${d.arrivalLong}. Aquí tienes todo lo que acordamos.`, `Your ${d.roomName} is ready for ${d.arrivalLong}. Here's everything we agreed.`)}
        chip={<CodeChip d={d} />}
      />
      <StayGrid d={d} />
      <Experiences d={d} />
      <Summary d={d} title={t(d, "Resumen", "Summary")} />
      <Actions note={`${d.rateName} · ${d.cancellation}`}>
        <Btn href={d.manageLink ?? d.whatsappLink}>{t(d, "Ver o modificar mi reserva", "View or change my booking")}</Btn>
        <Btn href={d.gcalLink} primary={false}>
          {t(d, "Añadir al calendario", "Add to calendar")}
        </Btn>
      </Actions>

      <Section style={{ padding: "28px 36px 0" }}>
        <SectionTitle>{t(d, "Lo que sigue", "What's next")}</SectionTitle>
        <Text style={{ fontSize: 14, lineHeight: "22px", color: C.text, margin: "10px 0 0" }}>
          {t(
            d,
            `24 h antes de tu llegada ${d.agentName} te escribirá por WhatsApp para el check-in digital: foto de tu documento, firma y número de habitación, en menos de dos minutos. También adjuntamos el evento (.ics) para tu calendario.`,
            `24 h before arrival ${d.agentName} will message you on WhatsApp for your digital check-in: ID photo, signature and room number in under two minutes. We've also attached the event (.ics) for your calendar.`,
          )}
        </Text>
      </Section>

      {d.services.length > 0 && (
        <Section style={{ padding: "28px 36px 0" }}>
          <SectionTitle>{t(d, "Para tu estadía", "For your stay")}</SectionTitle>
          <Row style={{ marginTop: 12 }}>
            {d.services.slice(0, 2).map((s, i) => (
              <Column key={i} style={{ width: "50%", verticalAlign: "top", paddingRight: i === 0 ? 8 : 0, paddingLeft: i === 1 ? 8 : 0 }}>
                <Section style={{ border: `1px solid ${C.line}`, backgroundColor: "#ffffff" }}>
                  {s.image ? <Img src={s.image} alt={s.name} width="236" height="110" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} /> : null}
                  <Section style={{ padding: "10px 12px 14px" }}>
                    <Text style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, margin: 0, lineHeight: "22px" }}>{s.name}</Text>
                    <Text style={{ fontSize: 12, margin: "4px 0 8px", color: C.muted, lineHeight: "17px" }}>
                      {s.description}
                      {s.price ? ` · ${s.price}` : ""}
                    </Text>
                    <Link href={s.link} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.terraDark, textDecoration: "none" }}>
                      {t(d, `Pedírselo a ${d.agentName} →`, `Ask ${d.agentName} →`)}
                    </Link>
                  </Section>
                </Section>
              </Column>
            ))}
          </Row>
        </Section>
      )}
    </Shell>
  );
}
