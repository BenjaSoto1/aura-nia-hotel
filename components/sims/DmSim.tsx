"use client";
import { useEffect, useRef, useState } from "react";
import { RichPart, RichText, openLink } from "../Parts";
import { broadcast, useChat } from "../useChat";
import { EmptyHint, Typing } from "./WhatsAppSim";
import { NiaMonogram } from "../brand";

const DEFAULTS = { instagram: "@viajera.caribe", messenger: "Ana Rivera" };

export function DmSim({ variant, hotelName, coverImage }: { variant: "instagram" | "messenger"; hotelName: string; coverImage?: string }) {
  const [user, setUser] = useState(DEFAULTS[variant]);
  const [text, setText] = useState("");
  const { messages, send, sending, mode, language } = useChat(variant, user);
  const scroller = useRef<HTMLDivElement>(null);
  const handled = useRef(new Set<string>());
  const ig = variant === "instagram";

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    // Si el agente pasó la conversación a WhatsApp, abrimos ese chat en el simulador.
    for (const m of messages) {
      if (handled.current.has(m.id)) continue;
      handled.current.add(m.id);
      for (const p of m.parts) {
        if (p.type === "link" && p.url.startsWith("/canal/whatsapp") && Date.now() - new Date(m.createdAt).getTime() < 15000) {
          const phone = new URL(p.url, window.location.origin).searchParams.get("u");
          if (phone) broadcast({ type: "wa-open", phone });
        }
      }
    }
  }, [messages]);

  const submit = async (t = text.trim()) => {
    if (!t) return;
    setText("");
    await send({ text: t, displayName: user });
  };

  const handle = ig ? `${hotelName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.hotel` : `${hotelName} · Nía`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-black/5 px-3 py-2.5">
        <span className="text-xl">‹</span>
        <div className={`grid h-9 w-9 place-items-center rounded-full p-[2px] ${ig ? "ig-ring" : ""}`}>
          <NiaMonogram size={ig ? 32 : 36} className={ig ? "border-2 !border-white" : ""} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight">{handle}</div>
          <div className="text-[11px] text-gris">{mode === "staff" ? "Atendido por el equipo" : ig ? "Hotel · Responde al instante" : "Normalmente responde al instante"}</div>
        </div>
        <button
          onClick={() => send({ buttonId: "handoff_wa", buttonTitle: "Continuar en WhatsApp", displayName: user })}
          title="Pasar a WhatsApp"
          className="rounded-full bg-[#25d366] px-2.5 py-1 text-[11px] font-semibold text-white"
        >
          WhatsApp
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 bg-[#fafafa] px-3 py-1 text-[11px]">
        <span className="text-gris">Usuario:</span>
        <input value={user} onChange={(e) => setUser(e.target.value)} className="w-32 rounded bg-transparent font-semibold text-oscuro outline-none focus:bg-white" />
      </div>

      <div ref={scroller} className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {ig && (
          <div className="mx-auto mb-3 w-44 overflow-hidden rounded-2xl border border-black/5 shadow-sm">
            <div className="relative h-56 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
              <div className="absolute left-2 top-2 flex items-center gap-1.5 text-[10px] font-semibold text-white">
                <NiaMonogram size={20} />
                {handle} · historia
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <div className="font-serif text-[15px] leading-tight">Noviembre frente al mar</div>
                <div className="text-[10px] opacity-90">−12% pagando por adelantado · pet friendly 🐾</div>
              </div>
            </div>
            <button onClick={() => submit("¡Hola! Vi su historia de noviembre 😍 ¿Tienen disponibilidad?")} className="w-full py-1.5 text-[11px] font-semibold text-[#3797f0] hover:bg-black/[0.02]">
              Responder a la historia
            </button>
          </div>
        )}
        {!ig && messages.length === 0 && <EmptyHint text='Prueba: "¿Aceptan perros de 12 kg?"' />}
        {messages.map((m) => {
          const mine = m.direction === "in";
          const texts = m.parts.filter((p) => p.type === "text");
          const rich = m.parts.filter((p) => p.type !== "text");
          if (m.author === "system") return <div key={m.id} className="text-center text-[11px] text-gris">{texts.map((p) => (p.type === "text" ? p.text : "")).join(" ")}</div>;
          return (
            <div key={m.id} className={`flex flex-col gap-1.5 ${mine ? "items-end" : "items-start"}`}>
              {texts.map((p, i) =>
                p.type === "text" ? (
                  <div
                    key={i}
                    className={`max-w-[80%] rounded-[20px] px-3.5 py-2 text-[14px] leading-snug ${
                      mine ? (ig ? "ig-gradient text-white" : "bg-ms-blue text-white") : "border border-[#E3C7B3] bg-white text-black"
                    }`}
                  >
                    {m.author === "staff" && <div className="text-[10px] font-semibold text-bruma">Equipo de recepción</div>}
                    <RichText text={p.text} />
                  </div>
                ) : null,
              )}
              {rich.map((p, i) => (
                <div key={i} className={p.type === "buttons" ? "w-full" : "w-[85%]"}>
                  <RichPart part={p} variant={variant} lang={language} disabled={sending} onButton={(id, title) => (id.startsWith("http") ? openLink(id) : send({ buttonId: id, buttonTitle: title, displayName: user }))} />
                </div>
              ))}
            </div>
          );
        })}
        {sending && (
          <div className="w-fit rounded-[20px] bg-[#efefef] px-3.5 py-2.5">
            <Typing />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center rounded-full border border-black/10 px-3">
          <span className={`mr-2 grid h-7 w-7 place-items-center rounded-full text-sm text-white ${ig ? "bg-[#3797f0]" : "bg-ms-blue"}`}>📷</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={ig ? "Mensaje…" : "Aa"}
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] outline-none"
          />
        </div>
        <button onClick={() => submit()} className={`text-[14px] font-semibold ${ig ? "text-[#3797f0]" : "text-ms-blue"}`}>
          {ig ? "Enviar" : "➤"}
        </button>
      </div>
    </div>
  );
}
