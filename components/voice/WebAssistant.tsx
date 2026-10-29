"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { RichPart, RichText } from "../Parts";
import { useChat } from "../useChat";
import { NiaMonogram, NiaWordmark } from "../brand";
import { useVoiceAgent } from "./useVoiceAgent";
import { STATUS_LABEL, VoiceOrb, useProactive, voiceContext } from "./shared";
import type { ChatMessage } from "../useChat";

/** Evento global para abrir a Nía desde la página (p. ej. la barra de reserva). */
export const NIA_OPEN_EVENT = "nia:open";
export type NiaOpenDetail = { text?: string; buttonId?: string; buttonTitle?: string; voice?: boolean };

export function openNia(detail: NiaOpenDetail = {}) {
  window.dispatchEvent(new CustomEvent<NiaOpenDetail>(NIA_OPEN_EVENT, { detail }));
}

function useWebSessionId() {
  const [id, setId] = useState<string | null>(null);
  const fresh = () => `web-${Math.random().toString(36).slice(2, 8)}`;
  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem("aura-web-id");
      if (!v) {
        v = fresh();
        localStorage.setItem("aura-web-id", v);
      }
    } catch {
      v = fresh();
    }
    setId(v);
  }, []);
  const reset = () => {
    const v = fresh();
    try {
      localStorage.setItem("aura-web-id", v);
    } catch {
      /* noop */
    }
    setId(v);
  };
  return { id, reset };
}

export function WebAssistant(props: { agentName: string; hotelName?: string; embedded?: boolean }) {
  return (
    <ConversationProvider>
      <Inner {...props} />
    </ConversationProvider>
  );
}

const QUICK = {
  es: [
    { id: "menu:book", title: "Reservar habitación" },
    { id: "menu:rooms", title: "Ver habitaciones" },
    { id: "menu:policies", title: "Preguntar sobre el hotel" },
    { id: "menu:mine", title: "Mi reserva" },
  ],
  en: [
    { id: "menu:book", title: "Book a room" },
    { id: "menu:rooms", title: "See rooms" },
    { id: "menu:policies", title: "Ask about the hotel" },
    { id: "menu:mine", title: "My booking" },
  ],
};

function Inner({ agentName, hotelName = "Aura", embedded = false }: { agentName: string; hotelName?: string; embedded?: boolean }) {
  const { id: userId, reset } = useWebSessionId();
  const [open, setOpen] = useState(embedded);
  const [teaser, setTeaser] = useState(false);
  const [text, setText] = useState("");
  const chat = useChat("web", userId, 800);
  const voice = useVoiceAgent({ channel: "web", userId, sendToCore: chat.send, lang: chat.language });
  const scroller = useRef<HTMLDivElement>(null);
  const pending = useRef<NiaOpenDetail | null>(null);
  const running = voice.status !== "idle" && voice.status !== "error";
  const en = chat.language === "en";
  const staff = chat.mode === "staff";
  const firstStaffId = chat.messages.find((m) => m.author === "staff")?.id;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, voice.interim, chat.sending]);

  // Saludo flotante junto al lanzador, como en el diseño.
  useEffect(() => {
    if (embedded) return;
    const t = setTimeout(() => setTeaser(true), 1200);
    return () => clearTimeout(t);
  }, [embedded]);

  // Abrir desde la página (barra de reserva, botones "Reservar").
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<NiaOpenDetail>).detail ?? {};
      setOpen(true);
      setTeaser(false);
      if (d.voice) startVoice.current?.();
      else if (d.text || d.buttonId) pending.current = d;
    };
    window.addEventListener(NIA_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(NIA_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!userId || !pending.current) return;
    const { voice: _voice, ...d } = pending.current;
    pending.current = null;
    void chat.send(d);
  });

  // En móvil el widget ocupa toda la pantalla: bloqueamos el scroll del sitio debajo.
  useEffect(() => {
    if (embedded || !open) return;
    const mq = window.matchMedia("(max-width: 639px)");
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, embedded]);

  useProactive(
    chat.messages,
    useCallback(
      (m: ChatMessage) => {
        const t = m.parts.filter((p) => p.type === "text").map((p) => (p.type === "text" ? p.text : "")).join(" ");
        voice.announce(t);
      },
      [voice],
    ),
  );

  const toggleVoice = async () => {
    if (running) return voice.stop();
    voice.start(userId ? await voiceContext("web", userId) : undefined);
  };
  const startVoice = useRef<(() => void) | null>(null);
  startVoice.current = () => {
    if (!running) void toggleVoice();
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    // En plena conversación de voz, lo escrito (p. ej. el correo) se lo lleva el agente de voz.
    if (running && voice.sendText(t)) return;
    await chat.send({ text: t });
  };

  const press = (id: string, title: string) => (running ? voice.choose(id, title) : chat.send({ buttonId: id, buttonTitle: title }));

  const panel = (
    <div
      className={`flex flex-col overflow-hidden bg-cal ${
        embedded
          ? "h-full"
          : "fixed inset-0 z-50 sm:static sm:h-[min(640px,calc(100vh-3rem))] sm:w-[400px] sm:rounded-[18px] sm:border sm:border-arena-200 sm:shadow-[0_30px_70px_rgba(22,32,43,.25)]"
      }`}
      role="dialog"
      aria-label={`${agentName} · concierge digital`}
    >
      {/* Cabecera */}
      <div className="flex shrink-0 items-center gap-3 bg-oscuro px-4 pb-3.5 pt-[max(14px,env(safe-area-inset-top))] text-fondo sm:px-5 sm:py-4">
        {!embedded && (
          <button onClick={() => setOpen(false)} className="-ml-1 px-1 text-lg text-fondo/80 sm:hidden" aria-label="Volver">
            ←
          </button>
        )}
        <NiaMonogram size={40} />
        <div className="min-w-0 flex-1">
          <NiaWordmark className="text-[26px]" />
          <div className="truncate text-[12px] text-[#B9BEC0]">
            {staff ? (en ? "Front desk joined" : "Recepción en la conversación") : `${hotelName} · ${en ? "Digital concierge" : "Concierge digital"}`}
            {running && ` · ${STATUS_LABEL[voice.status]}`}
          </div>
        </div>
        <button title={en ? "New conversation" : "Nueva conversación"} onClick={reset} className="rounded-full px-1.5 text-fondo/60 hover:text-fondo">
          ↺
        </button>
        {!embedded && (
          <button onClick={() => setOpen(false)} className="hidden rounded-full px-1.5 text-xl leading-none text-fondo/60 hover:text-fondo sm:block" aria-label="Cerrar">
            ×
          </button>
        )}
        <span className="h-2 w-2 rounded-full bg-[#7FD38F]" title="En línea" />
      </div>

      {/* Conversación */}
      <div ref={scroller} className="scroll-thin min-h-0 flex-1 space-y-3.5 overflow-y-auto bg-fondo px-4 py-5 sm:px-5">
        {chat.messages.length === 0 && (
          <div className="nia-in space-y-3.5">
            <div className="nia-bubble max-w-[86%] px-4 py-3 text-[15px] leading-snug text-oscuro">
              {en ? `Hi, I'm ${agentName}. How can I help you plan your stay?` : `Hola, soy ${agentName}. ¿Cómo puedo ayudarte a planificar tu estadía?`}
            </div>
            <div className="flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-1">
              {QUICK[chat.language].map((q) => (
                <button
                  key={q.id}
                  disabled={chat.sending}
                  onClick={() => press(q.id, q.title)}
                  className="rounded-full border border-laguna px-3.5 py-[7px] text-left text-[13px] font-medium text-laguna-600 transition-colors hover:bg-laguna-50 disabled:opacity-50 max-sm:flex max-sm:min-h-11 max-sm:items-center max-sm:rounded-xl max-sm:text-[14px]"
                >
                  {q.title}
                </button>
              ))}
            </div>
            <p className="px-1 text-[11.5px] leading-snug text-gris">
              {en
                ? "You can also talk to me with the microphone. Never share card details: payment is always a secure button."
                : "También puedes hablarme con el micrófono. Nunca compartas datos de tarjeta: el pago siempre es un botón seguro."}
            </p>
          </div>
        )}

        {chat.messages.map((m) => {
          const mine = m.direction === "in";
          if (m.author === "system") {
            return (
              <div key={m.id} className="text-center text-[11.5px] text-gris">
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ")}
              </div>
            );
          }
          return (
            <div key={m.id} className={`nia-in flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}>
              {m.id === firstStaffId && <StaffCard en={en} />}
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  <div key={i} className={`max-w-[86%] px-4 py-3 text-[15px] leading-snug ${mine ? "guest-bubble" : "nia-bubble text-oscuro"}`}>
                    <RichText text={p.text} />
                  </div>
                ) : (
                  <div key={i} className={p.type === "buttons" ? "max-w-[92%]" : "w-full max-w-[92%]"}>
                    <RichPart part={p} variant="web" lang={chat.language} onButton={press} disabled={chat.sending} />
                  </div>
                ),
              )}
            </div>
          );
        })}

        {voice.interim && <div className="guest-bubble ml-auto max-w-[86%] px-4 py-3 text-[15px] italic opacity-70">{voice.interim}</div>}

        {(chat.sending || voice.status === "thinking") && (
          <div className="flex items-center gap-2.5 text-[13px] text-gris">
            <span className="flex gap-1">
              <i className="cm-dot h-1.5 w-1.5 rounded-full bg-laguna" />
              <i className="cm-dot h-1.5 w-1.5 rounded-full bg-laguna" />
              <i className="cm-dot h-1.5 w-1.5 rounded-full bg-laguna" />
            </span>
            {en ? `${agentName} is checking…` : `${agentName} está revisando…`}
          </div>
        )}
      </div>

      {voice.error && <div className="bg-laguna-50 px-4 py-2 text-[12px] text-laguna-600">{voice.error}</div>}

      {/* Voz en curso */}
      {running && (
        <div className="flex items-center gap-3 border-t border-arena-200 bg-cal px-4 py-2.5">
          <VoiceOrb status={voice.status} size={44} />
          <div className="flex-1 text-[13px] text-oscuro">{STATUS_LABEL[voice.status]}</div>
          <button onClick={() => voice.stop()} className="rounded-full border border-oscuro px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
            {en ? "End" : "Terminar"}
          </button>
        </div>
      )}

      {/* Compositor */}
      <div className="flex shrink-0 items-center gap-2.5 border-t border-arena-200 bg-cal px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={toggleVoice}
          title={running ? (en ? "Stop voice" : "Detener voz") : en ? `Talk to ${agentName}` : `Hablar con ${agentName}`}
          aria-label={running ? "Detener voz" : `Hablar con ${agentName}`}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${running ? "border-laguna bg-laguna-50 text-laguna" : "border-arena-200 bg-white text-tinta hover:text-laguna"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={running ? (en ? "Type here (e.g. your email)…" : "Escribe aquí (p. ej. tu correo)…") : en ? `Write to ${agentName}…` : `Escribe a ${agentName}…`}
          className="min-w-0 flex-1 rounded-full border border-arena-200 bg-white px-4 py-2.5 text-[14px] text-oscuro outline-none placeholder:text-[#8A887C] focus:border-laguna"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || chat.sending}
          aria-label={en ? "Send" : "Enviar"}
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-laguna text-white transition-opacity disabled:opacity-60 max-sm:h-11 max-sm:w-11"
        >
          ↑
        </button>
      </div>
      <div className="bg-cal pb-2.5 text-center text-[11px] tracking-[0.04em] text-[#8A887C]">{en ? "Powered by Flowy AI" : "Con tecnología de Flowy AI"}</div>
    </div>
  );

  if (embedded) return panel;
  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        panel
      ) : (
        <div className="flex items-center gap-3">
          {teaser && (
            <button
              onClick={() => setOpen(true)}
              className="nia-in hidden max-w-[260px] border border-[#E3C7B3] bg-cal px-4 py-3 text-left text-[14px] text-oscuro shadow-[0_8px_28px_rgba(184,98,63,.18)] sm:block"
              style={{ borderRadius: "0 14px 14px 14px" }}
            >
              Hola, soy {agentName}. ¿Planeas una estadía?
            </button>
          )}
          <button onClick={() => setOpen(true)} aria-label={`Abrir ${agentName}`} className="rounded-full transition-transform hover:scale-105">
            <NiaMonogram size={64} halo className="max-sm:!h-14 max-sm:!w-14" />
          </button>
        </div>
      )}
    </div>
  );
}

function StaffCard({ en }: { en: boolean }) {
  return (
    <div className="flex w-full max-w-[92%] items-center gap-3 border border-arena-200 bg-white px-3.5 py-3">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-bruma font-semibold text-white">R</span>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-oscuro">{en ? "Front desk" : "Recepción"}</div>
        <div className="text-[12px] text-gris">{en ? "Joined the conversation" : "Se unió a la conversación"}</div>
      </div>
      <span className="h-2 w-2 rounded-full bg-[#7FD38F]" />
    </div>
  );
}
