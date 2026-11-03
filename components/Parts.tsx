"use client";
import type { Part } from "@/lib/types";
import { broadcast } from "./useChat";

export type Variant = "whatsapp" | "instagram" | "messenger" | "web";

const money = (cents: number) =>
  new Intl.NumberFormat("es-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

/** Negritas estilo WhatsApp (*texto*) y saltos de línea. */
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(/(\*[^*]+\*)/g).map((seg, j) =>
            seg.startsWith("*") && seg.endsWith("*") && seg.length > 2 ? <strong key={j}>{seg.slice(1, -1)}</strong> : <span key={j}>{seg}</span>,
          )}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export function openLink(url: string) {
  // Enlaces al simulador de WhatsApp: en la consola cambiamos el marco en vez de navegar.
  if (url.startsWith("/canal/whatsapp")) {
    const phone = new URL(url, window.location.origin).searchParams.get("u");
    if (phone) broadcast({ type: "wa-open", phone });
    if (window.location.pathname === "/") return;
  }
  window.open(url, "_blank", "noopener");
}

interface Props {
  part: Part;
  variant: Variant;
  onButton?: (id: string, title: string) => void;
  disabled?: boolean;
  lang?: "es" | "en";
}

const L = {
  es: { night: "noche", nights: "noches", taxes: "imp. incl.", choose: "Elegir", secure: "Pago seguro", secureSub: "Pasarela de pago · enlace seguro, sin datos en el chat", pay: "Pagar", confirmed: "Reserva confirmada" },
  en: { night: "night", nights: "nights", taxes: "taxes incl.", choose: "Choose", secure: "Secure payment", secureSub: "Payment gateway · secure link, no card data in chat", pay: "Pay", confirmed: "Booking confirmed" },
};

/** Elementos ricos (fuera de la burbuja de texto): tarjetas, botones, pagos, enlaces. */
export function RichPart({ part, variant, onButton, disabled, lang = "es" }: Props) {
  const l = L[lang];
  const accent =
    variant === "whatsapp" ? "text-[#008069]" : variant === "messenger" ? "text-ms-blue" : variant === "instagram" ? "text-[#3797f0]" : "text-laguna";

  switch (part.type) {
    case "rate_cards":
      if (variant === "web") {
        return (
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 scroll-thin">
            {part.items.map((it) => (
              <div key={`${it.roomTypeCode}-${it.ratePlanCode}`} className="w-60 shrink-0 snap-start border border-arena-200 bg-white">
                <div className="img-slot h-[84px]" style={{ background: "linear-gradient(120deg,#A9BDB2,#C9B58F,#B8623F)" }}>
                  {it.image && <img src={it.image} alt={it.label} />}
                </div>
                <div className="px-3.5 py-3">
                  <div className="font-serif text-[20px] font-semibold leading-tight text-oscuro">{it.label}</div>
                  {it.detail && <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-gris">{it.detail}</div>}
                  <div className="mt-2.5 flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] text-gris">
                      {it.nights} {it.nights === 1 ? l.night : l.nights} · {l.taxes}
                    </span>
                    <span className="text-[17px] font-bold text-oscuro">{money(it.totalCents)}</span>
                  </div>
                  {it.quoteId && onButton && (
                    <button
                      disabled={disabled}
                      onClick={() => onButton(`pick:${it.quoteId}`, it.label)}
                      className="mt-3 w-full bg-oscuro py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-fondo hover:bg-noche disabled:opacity-50"
                    >
                      {lang === "en" ? "Book" : "Reservar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scroll-thin">
          {part.items.map((it) => (
            <div key={`${it.roomTypeCode}-${it.ratePlanCode}`} className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
              {it.image && <img src={it.image} alt={it.label} className="h-24 w-full object-cover" />}
              <div className="p-2.5">
                <div className="text-[13px] font-semibold leading-tight text-oscuro">{it.label}</div>
                {it.detail && <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-gris">{it.detail}</div>}
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="text-[17px] font-bold text-oscuro">{money(it.totalCents)}</div>
                    <div className="text-[10px] text-gris">
                      {it.nights} {it.nights === 1 ? l.night : l.nights} · {l.taxes}
                    </div>
                  </div>
                </div>
                {it.quoteId && onButton && (
                  <button
                    disabled={disabled}
                    onClick={() => onButton(`pick:${it.quoteId}`, it.label)}
                    className={`mt-2 w-full rounded-lg border border-current/20 py-1.5 text-[13px] font-semibold ${accent} hover:bg-black/[0.03] disabled:opacity-50`}
                  >
                    {l.choose}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    case "buttons":
      if (variant === "instagram" || variant === "messenger") {
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            {part.items.map((b) => (
              <button
                key={b.id}
                disabled={disabled}
                onClick={() => onButton?.(b.id, b.title)}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${variant === "messenger" ? "border-ms-blue text-ms-blue" : "border-[#3797f0] text-[#3797f0]"}`}
              >
                {b.title}
              </button>
            ))}
          </div>
        );
      }
      return (
        <div className={variant === "whatsapp" ? "flex flex-col gap-1" : "flex flex-wrap gap-2"}>
          {part.items.map((b) => (
            <button
              key={b.id}
              disabled={disabled}
              onClick={() => onButton?.(b.id, b.title)}
              className={
                variant === "whatsapp"
                  ? "w-full rounded-lg bg-white py-2 text-center text-[14px] font-medium text-[#008069] shadow-sm hover:bg-[#f5f6f6] disabled:opacity-50"
                  : "rounded-full border border-laguna px-3.5 py-[7px] text-[13px] font-medium text-laguna-600 transition-colors hover:bg-laguna-50 disabled:opacity-50"
              }
            >
              {b.title}
            </button>
          ))}
        </div>
      );
    case "payment_link":
      return (
        <div className={`overflow-hidden border bg-white ${variant === "web" ? "border-arena-200" : "rounded-xl border-[#E3C7B3] shadow-sm"}`}>
          <div className="flex items-center gap-3 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-laguna-50 text-laguna">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-oscuro">{part.label ?? l.secure}</div>
              <div className="text-[11px] text-gris">{l.secureSub}</div>
            </div>
            <div className="text-[15px] font-bold text-oscuro">{money(part.amountCents)}</div>
          </div>
          <button
            onClick={() => openLink(part.url)}
            className={`block w-full bg-laguna py-2.5 text-center text-white hover:bg-laguna-600 ${variant === "web" ? "text-[12px] font-semibold uppercase tracking-[0.1em]" : "text-sm font-semibold"}`}
          >
            {l.pay} {money(part.amountCents)}
          </button>
        </div>
      );
    case "link":
      return (
        <button onClick={() => openLink(part.url)} className={`w-full rounded-lg bg-white px-3 py-2 text-left text-[13px] font-semibold shadow-sm ${accent} hover:bg-black/[0.02]`}>
          🔗 {part.title}
        </button>
      );
    case "image":
      return <img src={part.url} alt={part.alt} className="max-h-48 rounded-lg object-cover" />;
    case "cards":
      return (
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scroll-thin">
          {part.items.map((c, i) => (
            <div key={i} className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
              {c.image && <img src={c.image} alt={c.title} className="h-28 w-full object-cover" />}
              <div className="p-2.5">
                <div className="text-[13px] font-semibold leading-tight text-oscuro">{c.title}</div>
                {c.subtitle && <div className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] leading-snug text-gris">{c.subtitle}</div>}
                {c.buttons?.map((b, j) => (
                  <button
                    key={j}
                    disabled={disabled}
                    onClick={() => (b.url ? openLink(b.url) : b.id && onButton?.(b.id, b.title))}
                    className={`mt-2 w-full rounded-lg border border-current/20 py-1.5 text-[13px] font-semibold ${accent} hover:bg-black/[0.03] disabled:opacity-50`}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "reservation_summary":
      return (
        <div className="rounded-xl border border-laguna/20 bg-laguna-50 p-3 text-oscuro">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-laguna">{l.confirmed}</div>
          <div className="font-serif text-lg">{part.reservationCode}</div>
          {part.lines?.map((l, i) => (
            <div key={i} className="text-[12px] text-tinta">
              {l}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
