export type Channel = "whatsapp" | "instagram" | "messenger" | "web" | "phone";
export const CHANNELS: Channel[] = ["whatsapp", "instagram", "messenger", "web", "phone"];

export interface InboundMessage {
  channel: Channel;
  channelUserId: string; // teléfono, @usuario o id de sesión
  text?: string; // ya enmascarado
  buttonId?: string; // respuesta a un botón
  buttonTitle?: string;
  attachment?: { kind: "image"; dataUrl: string };
  displayName?: string;
}

export type RateCardItem = {
  roomTypeCode: string;
  ratePlanCode: string;
  label: string;
  totalCents: number;
  nights: number;
  quoteId?: string;
  image?: string;
  detail?: string;
};

export type Part =
  | { type: "text"; text: string }
  | { type: "rate_cards"; items: RateCardItem[] }
  | { type: "buttons"; items: { id: string; title: string }[] }
  | { type: "payment_link"; url: string; amountCents: number; label?: string }
  | { type: "link"; url: string; title: string }
  | { type: "image"; url: string; alt: string }
  /** Carrusel de tarjetas con foto (habitaciones, experiencias). Botón con id (respuesta) o url (enlace). */
  | { type: "cards"; items: { title: string; subtitle?: string; image?: string; buttons?: { id?: string; url?: string; title: string }[] }[] }
  | { type: "reservation_summary"; reservationCode: string; lines?: string[] };

export interface OutboundMessage {
  channel: Channel;
  channelUserId: string;
  parts: Part[];
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  web: "Web por voz",
  phone: "Teléfono",
};

export const isVoice = (c: Channel) => c === "web" || c === "phone";
