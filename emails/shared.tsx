import * as React from "react";
import { Body, Column, Container, Head, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";

/**
 * Sistema de correo de Aura (diseño "Correo de confirmación"): carta del hotel, una columna de 560 px,
 * cabecera carbón con wordmark, datos en rejilla, CTA principal carbón y bloque de Nía hacia WhatsApp.
 * El remitente es el hotel; Nía aparece dentro del correo.
 */
export interface EmailData {
  lang: "es" | "en";
  hotel: {
    name: string;
    tagline?: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    colors: { primario: string; oscuro: string; arena: string; acento: string; fondo: string; bruma?: string; cal?: string };
  };
  agentName: string;
  guestName: string;
  firstName: string;
  code: string;
  roomName: string;
  roomImage: string;
  arrivalLong: string;
  arrivalShort?: string;
  departureShort?: string;
  checkInLong: string;
  checkOutLong: string;
  nights: number;
  adults: number;
  pets: number;
  rateName: string;
  cancellation: string;
  paymentStatus: string;
  lines: { label: string; amount: string; negative?: boolean }[];
  total: string;
  checkInTime: string;
  checkOutTime: string;
  services: { name: string; description: string; image?: string; link: string; price?: string }[];
  experiences?: { name: string; when: string; image?: string }[];
  gcalLink: string;
  whatsappLink: string;
  manageLink?: string;
  precheckinUrl?: string;
  roomNumber?: string | null;
  payments?: { label: string; amount: string }[];
  paidTotal?: string;
  balance?: string;
  balanceCents?: number;
}

export const C = {
  ink: "#16202B",
  night: "#0F1720",
  ivory: "#F6F0E4",
  lime: "#FBF8F1",
  sand: "#E3DAC8",
  line: "#DDD0B8",
  terra: "#B8623F",
  terraDark: "#8F4528",
  peach: "#D9A27F",
  mist: "#5E7468",
  text: "#4A5560",
  muted: "#6B6A60",
  footer: "#B9BEC0",
};

export const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
export const sans = "'DM Sans', Helvetica, Arial, sans-serif";

export function t(d: EmailData, es: string, en: string) {
  return d.lang === "en" ? en : es;
}

const eyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, margin: 0 };

export function Shell({ d, preview, children }: { d: EmailData; preview: string; children: React.ReactNode }) {
  return (
    <Html lang={d.lang}>
      <Head>
        {/* Clientes que aceptan fuentes web (Apple Mail, iOS) usan las del hotel; Gmail cae a Georgia / Helvetica. */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.sand, margin: 0, padding: "24px 0", fontFamily: sans, color: C.ink }}>
        <Container style={{ maxWidth: 560, width: "100%", margin: "0 auto", backgroundColor: C.lime }}>
          <Section style={{ backgroundColor: C.ink, padding: "32px 24px", textAlign: "center" }}>
            <Wordmark name={d.hotel.name} size={44} color={C.ivory} />
            {d.hotel.tagline ? (
              <Text style={{ fontSize: 10, letterSpacing: "0.34em", textTransform: "uppercase", color: C.peach, margin: "10px 0 0" }}>{d.hotel.tagline}</Text>
            ) : null}
          </Section>
          {children}
          <NiaBlock d={d} />
          <Footer d={d} />
        </Container>
      </Body>
    </Html>
  );
}

export function Wordmark({ name, size, color }: { name: string; size: number; color: string }) {
  const aura = name.trim().toLowerCase() === "aura";
  return (
    <Text style={{ fontFamily: serif, fontWeight: 500, fontSize: size, letterSpacing: "0.03em", lineHeight: 1, color, margin: 0 }}>
      {aura ? (
        <>
          Au<em style={{ fontWeight: 400 }}>ra</em>
        </>
      ) : (
        name
      )}
    </Text>
  );
}

export function Hero({ d, label }: { d: EmailData; label?: string }) {
  return (
    <Section style={{ backgroundColor: "#C9B58F" }}>
      <Img src={d.roomImage} alt={label ?? d.roomName} width="560" height="200" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
    </Section>
  );
}

/** Encabezado centrado: eyebrow terracota, título serif con remate en itálica y bajada. */
export function Intro({ eyebrow: eb, title, italic, body, chip }: { eyebrow: string; title: string; italic?: string; body?: string; chip?: React.ReactNode }) {
  return (
    <Section style={{ padding: "40px 36px 8px", textAlign: "center" }}>
      <Text style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: C.terra, fontWeight: 700, margin: 0 }}>{eb}</Text>
      <Text style={{ fontFamily: serif, fontWeight: 500, fontSize: 38, lineHeight: "42px", margin: "12px 0 0", color: C.ink }}>
        {title}
        {italic ? (
          <>
            {" "}
            <em>{italic}</em>
          </>
        ) : null}
      </Text>
      {body ? <Text style={{ fontSize: 15, lineHeight: "23px", color: C.text, margin: "14px 0 0" }}>{body}</Text> : null}
      {chip}
    </Section>
  );
}

export function CodeChip({ d }: { d: EmailData }) {
  return (
    <Text style={{ display: "inline-block", margin: "20px 0 0", border: `1px solid ${C.line}`, padding: "8px 18px", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: C.text }}>
      {t(d, "Reserva", "Booking")} <b style={{ color: C.ink }}>{d.code}</b>
    </Text>
  );
}

/** Rejilla de llegada / salida / habitación / huéspedes. */
export function StayGrid({ d }: { d: EmailData }) {
  const cell = (label: string, value: React.ReactNode, sub?: string, big = false, left = false) => (
    <Column style={{ width: "50%", verticalAlign: "top", padding: left ? "16px 16px 16px 0" : "16px 0 16px 20px", borderLeft: left ? undefined : `1px solid ${C.line}` }}>
      <Text style={eyebrow}>{label}</Text>
      <Text style={big ? { fontFamily: serif, fontSize: 26, fontWeight: 500, margin: "2px 0 0", lineHeight: "30px" } : { fontSize: 15, fontWeight: 500, margin: "2px 0 0" }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 12, color: C.muted, margin: 0 }}>{sub}</Text> : null}
    </Column>
  );
  const guests = `${d.adults} ${t(d, d.adults === 1 ? "adulto" : "adultos", d.adults === 1 ? "adult" : "adults")} · ${d.nights} ${t(d, d.nights === 1 ? "noche" : "noches", d.nights === 1 ? "night" : "nights")}${
    d.pets ? ` · ${d.pets} 🐾` : ""
  }`;
  return (
    <Section style={{ padding: "28px 36px 0" }}>
      <Section style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <Row>
          {cell(t(d, "Llegada", "Arrival"), d.arrivalShort ?? d.checkInLong, t(d, `desde las ${d.checkInTime}`, `from ${d.checkInTime}`), true, true)}
          {cell(t(d, "Salida", "Departure"), d.departureShort ?? d.checkOutLong, t(d, `hasta las ${d.checkOutTime}`, `until ${d.checkOutTime}`), true)}
        </Row>
        <Row style={{ borderTop: `1px solid ${C.line}` }}>
          {cell(t(d, "Habitación", "Room"), `${d.roomName}${d.roomNumber ? ` · ${d.roomNumber}` : ""}`, undefined, false, true)}
          {cell(t(d, "Huéspedes", "Guests"), guests)}
        </Row>
      </Section>
    </Section>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...eyebrow, fontWeight: 700 }}>{children}</Text>;
}

export function Experiences({ d }: { d: EmailData }) {
  if (!d.experiences?.length) return null;
  return (
    <Section style={{ padding: "28px 36px 0" }}>
      <SectionTitle>{t(d, "Tu experiencia", "Your experience")}</SectionTitle>
      {d.experiences.map((e, i) => (
        <Row key={i} style={{ marginTop: 12 }}>
          <Column style={{ width: 64, verticalAlign: "middle" }}>
            {e.image ? (
              <Img src={e.image} alt={e.name} width="64" height="64" style={{ width: 64, height: 64, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 64, height: 64, background: `linear-gradient(150deg,${C.peach},${C.terra})` }} />
            )}
          </Column>
          <Column style={{ paddingLeft: 14, verticalAlign: "middle" }}>
            <Text style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: 0, lineHeight: "26px" }}>{e.name}</Text>
            <Text style={{ fontSize: 13, color: C.muted, margin: 0 }}>{e.when}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

/** Resumen: líneas del folio, total y (si hay) pagos y saldo. */
export function Summary({ d, title, showPayments = false }: { d: EmailData; title: string; showPayments?: boolean }) {
  const row = (label: React.ReactNode, amount: React.ReactNode, style: React.CSSProperties = {}) => (
    <Row>
      <Column style={{ fontSize: 14, padding: "4px 0", color: C.text, ...style }}>{label}</Column>
      <Column align="right" style={{ fontSize: 14, padding: "4px 0", ...style }}>
        {amount}
      </Column>
    </Row>
  );
  const paid = d.payments ?? [];
  return (
    <Section style={{ padding: "28px 36px 0" }}>
      <SectionTitle>{title}</SectionTitle>
      <Section style={{ marginTop: 12 }}>
        {d.lines.map((l, i) => (
          <React.Fragment key={i}>{row(l.label, l.amount, l.negative ? { color: C.mist } : {})}</React.Fragment>
        ))}
        <Row style={{ borderTop: `1px solid ${C.line}` }}>
          <Column style={{ fontSize: 16, fontWeight: 700, padding: "10px 0 4px" }}>{t(d, "Total con impuestos", "Total incl. taxes")}</Column>
          <Column align="right" style={{ fontSize: 16, fontWeight: 700, padding: "10px 0 4px" }}>
            {d.total}
          </Column>
        </Row>
        {showPayments && paid.map((p, i) => <React.Fragment key={`p${i}`}>{row(p.label, `− ${p.amount}`, { color: C.mist })}</React.Fragment>)}
        {showPayments && d.balance ? row(t(d, "Saldo pendiente", "Balance due"), <b>{d.balance}</b>) : null}
        {!showPayments ? row(t(d, "Pago", "Payment"), <span style={{ color: C.mist, fontWeight: 600 }}>{d.paymentStatus}</span>) : null}
      </Section>
    </Section>
  );
}

export function Btn({ href, children, primary = true }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textAlign: "center",
        padding: primary ? "16px" : "15px",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 600,
        textDecoration: "none",
        backgroundColor: primary ? C.ink : "transparent",
        color: primary ? C.ivory : C.ink,
        border: primary ? `1px solid ${C.ink}` : `1px solid ${C.ink}`,
        marginTop: 10,
      }}
    >
      {children}
    </Link>
  );
}

export function Actions({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <Section style={{ padding: "22px 36px 0" }}>
      {children}
      {note ? <Text style={{ fontSize: 12, color: C.muted, textAlign: "center", margin: "12px 0 0" }}>{note}</Text> : null}
    </Section>
  );
}

/** Bloque de Nía: continuidad hacia WhatsApp, en tonos del hotel. */
export function NiaBlock({ d }: { d: EmailData }) {
  return (
    <Section style={{ padding: "32px 36px 0" }}>
      <Section style={{ backgroundColor: C.ivory, border: "1px solid #E3C7B3", padding: 20 }}>
        <Row>
          <Column style={{ width: 44, verticalAlign: "top" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.night,
                border: "1px solid #7A5A46",
                color: C.ivory,
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 26,
                lineHeight: "44px",
                textAlign: "center",
              }}
            >
              N
            </div>
          </Column>
          <Column style={{ paddingLeft: 14, verticalAlign: "top" }}>
            <Text style={{ fontSize: 14, color: C.ink, margin: 0, lineHeight: "21px" }}>
              {t(
                d,
                `¿Algo antes de tu llegada? Transporte, cena, una celebración: escríbeme y lo coordino. — ${d.agentName}`,
                `Anything before you arrive? Transfers, dinner, a celebration: message me and I'll arrange it. — ${d.agentName}`,
              )}
            </Text>
            <Link href={d.whatsappLink} style={{ display: "inline-block", marginTop: 8, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: C.terraDark, textDecoration: "none" }}>
              {t(d, `Escribir a ${d.agentName} por WhatsApp →`, `Message ${d.agentName} on WhatsApp →`)}
            </Link>
          </Column>
        </Row>
      </Section>
    </Section>
  );
}

export function Footer({ d }: { d: EmailData }) {
  return (
    <Section style={{ marginTop: 36, backgroundColor: C.night, padding: "28px 24px", textAlign: "center" }}>
      <Wordmark name={d.hotel.name} size={24} color={C.ivory} />
      <Text style={{ fontSize: 12, lineHeight: "20px", color: C.footer, margin: "8px 0 0" }}>
        {d.hotel.address}
        <br />
        <Link href={`mailto:${d.hotel.email}`} style={{ color: C.footer }}>
          {d.hotel.email}
        </Link>{" "}
        · {d.hotel.phone}
      </Text>
      <Text style={{ fontSize: 11, lineHeight: "17px", color: C.footer, margin: "16px 0 0", paddingTop: 12, borderTop: "1px solid #26323F" }}>
        {t(
          d,
          "Usamos tus datos solo para gestionar tu estadía. Nunca te pediremos datos de tarjeta por chat ni por correo; los pagos se procesan de forma segura con Stripe.",
          "We only use your data to manage your stay. We will never ask for card details by chat or email; payments are processed securely by Stripe.",
        )}
        <br />
        {t(d, `Hotel ficticio para fines de demostración · ${d.agentName}, con tecnología de Flowy AI`, `Fictional hotel for demo purposes · ${d.agentName}, powered by Flowy AI`)}
      </Text>
    </Section>
  );
}
