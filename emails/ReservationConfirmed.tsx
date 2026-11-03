import * as React from "react";
import { Img, Link, Section, Text } from "@react-email/components";
import { Actions, Btn, C, CodeChip, Experiences, Hero, Intro, Notice, SectionTitle, Shell, StayGrid, Summary, serif, t, type EmailData } from "./shared";

export function confirmationSubject(d: EmailData, range: string) {
  return d.lang === "en"
    ? `Booking confirmed · Your stay at ${d.hotel.name} · ${range} · ${d.code}`
    : `Reserva confirmada · Tu estadía en ${d.hotel.name} · ${range} · ${d.code}`;
}

export function modificationSubject(d: EmailData, range: string) {
  return d.lang === "en"
    ? `Booking updated · Your stay at ${d.hotel.name} · ${range} · ${d.code}`
    : `Reserva modificada · Tu estadía en ${d.hotel.name} · ${range} · ${d.code}`;
}

/** Confirmación de reserva. Con `modified`, el mismo correo informa los cambios aplicados. */
export default function ReservationConfirmed({ d, modified = false }: { d: EmailData; modified?: boolean }) {
  return (
    <Shell
      d={d}
      preview={
        modified
          ? t(d, `Actualizamos tu reserva ${d.code}: ${d.arrivalShort} – ${d.departureShort}.`, `We updated booking ${d.code}: ${d.arrivalShort} – ${d.departureShort}.`)
          : t(d, `Tu ${d.roomName} está lista para el ${d.arrivalLong}. Reserva ${d.code}.`, `Your ${d.roomName} is ready for ${d.arrivalLong}. Booking ${d.code}.`)
      }
    >
      <Hero d={d} />
      <Intro
        eyebrow={modified ? t(d, "Reserva modificada", "Booking updated") : t(d, "Reserva confirmada", "Booking confirmed")}
        title={modified ? t(d, "Listo, actualizamos tu estadía,", "All set, we updated your stay,") : t(d, "Te esperamos,", "We're expecting you,")}
        italic={`${d.firstName}.`}
        body={
          modified
            ? t(d, `Estos son los nuevos detalles de tu reserva. Te esperamos el ${d.arrivalLong}.`, `Here are your new booking details. We'll see you on ${d.arrivalLong}.`)
            : t(d, `Tu ${d.roomName} está lista para el ${d.arrivalLong}. Aquí tienes todo lo que acordamos.`, `Your ${d.roomName} is ready for ${d.arrivalLong}. Here's everything we agreed.`)
        }
        chip={<CodeChip d={d} />}
      />
      {modified && d.notice ? <Notice title={t(d, "Qué cambió", "What changed")} text={d.notice} /> : null}
      <StayGrid d={d} />
      <Experiences d={d} />
      <Summary d={d} title={t(d, "Resumen", "Summary")} />
      <Actions note={`${d.rateName} · ${d.cancellation}`}>
        <Btn href={d.manageLink ?? d.whatsappLink}>{t(d, "Modificar o cancelar mi reserva", "Change or cancel my booking")}</Btn>
        <Btn href={d.gcalLink} primary={false}>
          {t(d, "Añadir al calendario", "Add to calendar")}
        </Btn>
      </Actions>

      <Section style={{ padding: "28px 36px 0" }}>
        <SectionTitle>{t(d, "Lo que sigue", "What's next")}</SectionTitle>
        <Text style={{ fontSize: 14, lineHeight: "22px", color: C.text, margin: "10px 0 0" }}>
          {t(
            d,
            `24 h antes de tu llegada ${d.agentName} te escribirá por WhatsApp para el check-in digital: foto de tu documento, firma y número de habitación, en menos de dos minutos. Si necesitas cambiar fechas, habitación o cancelar, escríbele a ${d.agentName} por cualquier canal.`,
            `24 h before arrival ${d.agentName} will message you on WhatsApp for your digital check-in: ID photo, signature and room number in under two minutes. To change dates, room or cancel, message ${d.agentName} on any channel.`,
          )}
        </Text>
      </Section>

      {d.services.length > 0 && (
        <Section style={{ padding: "28px 36px 0" }}>
          <SectionTitle>{t(d, "Para tu estadía", "For your stay")}</SectionTitle>
          {/* El borde y el fondo van en la celda: así ambas tarjetas tienen siempre la misma altura. */}
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 12, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
            <tbody>
              <tr>
                {d.services.slice(0, 2).map((s, i) => (
                  <React.Fragment key={i}>
                    {i === 1 ? <td style={{ width: 16, fontSize: 0, lineHeight: 0 }}>&nbsp;</td> : null}
                    <td valign="top" style={{ width: 236, verticalAlign: "top", border: `1px solid ${C.line}`, backgroundColor: "#ffffff", padding: 0 }}>
                      {s.image ? <Img src={s.image} alt={s.name} width="236" height="110" style={{ width: "100%", maxWidth: 236, height: "auto", display: "block", border: 0 }} /> : null}
                      <div style={{ padding: "12px 14px 16px" }}>
                        <Text style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, margin: 0, lineHeight: "23px", color: C.ink }}>{s.name}</Text>
                        <Text style={{ fontSize: 12, margin: "6px 0 10px", color: C.muted, lineHeight: "17px" }}>
                          {s.description}
                          {s.price ? ` · ${s.price}` : ""}
                        </Text>
                        <Link href={s.link} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.terraDark, textDecoration: "none" }}>
                          {t(d, `Pedírselo a ${d.agentName} →`, `Ask ${d.agentName} →`)}
                        </Link>
                      </div>
                    </td>
                  </React.Fragment>
                ))}
                {d.services.length === 1 ? <td style={{ width: 252 }}>&nbsp;</td> : null}
              </tr>
            </tbody>
          </table>
        </Section>
      )}
    </Shell>
  );
}

