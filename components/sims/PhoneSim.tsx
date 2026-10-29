"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { spokenFrom, useVoiceAgent } from "../voice/useVoiceAgent";
import { useProactive, voiceContext } from "../voice/shared";
import { broadcast, useChat, type ChatMessage } from "../useChat";
import { NiaMonogram } from "../brand";

const DEFAULT_CALLER = "+17875550199";

export function PhoneSim(props: { hotelName: string; hotelPhone: string }) {
  return (
    <ConversationProvider>
      <Inner {...props} />
    </ConversationProvider>
  );
}

function Inner({ hotelName, hotelPhone }: { hotelName: string; hotelPhone: string }) {
  const [caller, setCaller] = useState(DEFAULT_CALLER);
  const [callId, setCallId] = useState<string | null>(null); // channelUserId = número del que llama
  const [phase, setPhase] = useState<"dial" | "ringing" | "live" | "ended">("dial");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const chat = useChat("phone", callId, 900);
  const voice = useVoiceAgent({ channel: "phone", userId: callId, sendToCore: chat.send });
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, voice.interim]);

  useProactive(
    chat.messages,
    useCallback((m: ChatMessage) => voice.announce(m.parts.filter((p) => p.type === "text").map((p) => (p.type === "text" ? p.text : "")).join(" ")), [voice]),
  );

  const call = async () => {
    const digits = caller.replace(/[^\d+]/g, "");
    const num = digits.startsWith("+") ? digits : `+${digits.length === 10 ? "1" + digits : digits}`;
    setCaller(num);
    setCallId(num);
    setSeconds(0);
    setPhase("ringing");
    broadcast({ type: "wa-open", phone: num }); // el WhatsApp simulado muestra el chat de este número
    await new Promise((r) => setTimeout(r, 1800));
    setPhase("live");
    if (voice.engine === "elevenlabs") voice.start(await voiceContext("phone", num));
    else {
      // Voz del navegador: el agente saluda primero
      const r = await chat.send({ text: "Hola" });
      voice.start(undefined, r ? spokenFrom(r.parts, "phone", "es") : undefined);
    }
  };

  const hang = () => {
    voice.stop();
    setPhase("ended");
    setTimeout(() => setPhase("dial"), 1500);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (phase === "dial") {
    return (
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-[#16202B] to-[#0B1118] px-6 pt-10 text-white">
        <div className="text-[12px] uppercase tracking-[0.2em] text-white/50">Teléfono</div>
        <NiaMonogram size={80} halo className="mt-6" />
        <div className="mt-3 font-serif text-2xl">{hotelName}</div>
        <div className="text-sm text-white/60">{hotelPhone}</div>
        <label className="mt-10 w-full text-[12px] text-white/60">Tu número (para enviarte el enlace por WhatsApp)</label>
        <input value={caller} onChange={(e) => setCaller(e.target.value)} className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-center text-lg tracking-wide outline-none focus:bg-white/15" />
        <div className="mt-3 text-center text-[11px] text-white/45">
          {voice.engine === "elevenlabs" ? "Agente de voz ElevenLabs (mismo cerebro que los demás canales)" : "Voz del navegador (Chrome). Configura ELEVENLABS_AGENT_ID para la voz real."}
        </div>
        <button onClick={call} className="mt-auto mb-12 grid h-16 w-16 place-items-center rounded-full bg-[#34c759] text-2xl shadow-lg hover:brightness-110">
          📞
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#16202B] to-[#0B1118] text-white">
      <div className="flex flex-col items-center pt-6">
        <NiaMonogram size={64} halo />
        <div className="mt-2 font-serif text-xl">{hotelName}</div>
        <div className="text-[13px] text-white/60">
          {phase === "ringing" ? `Llamando a ${hotelName}…` : phase === "ended" ? "Llamada finalizada" : `${mm}:${ss} · ${voice.status === "speaking" ? "Nía habla" : voice.status === "thinking" ? "…" : "En llamada"}`}
        </div>
      </div>
      <div ref={scroller} className="scroll-thin mx-3 mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-2xl bg-white/5 p-3 text-[12.5px]">
        <div className="text-center text-[10px] uppercase tracking-widest text-white/40">Transcripción en vivo</div>
        {chat.messages.map((m) =>
          m.parts
            .filter((p) => p.type === "text")
            .map((p, i) => (
              <div key={m.id + i} className={m.direction === "in" ? "text-right text-white" : "text-[#E8CDB4]"}>
                <span className="text-[10px] uppercase text-white/40">{m.direction === "in" ? "Tú" : "Nía"} · </span>
                {p.type === "text" ? p.text : ""}
              </div>
            )),
        )}
        {chat.messages.some((m) => m.parts.some((p) => p.type === "rate_cards")) && <div className="text-center text-[11px] text-white/40">(opciones de tarifas enviadas al sistema)</div>}
        {voice.interim && <div className="text-right italic text-white/60">{voice.interim}</div>}
        {voice.error && <div className="text-center text-[11px] text-durazno">{voice.error}</div>}
      </div>
      <div className="flex items-center justify-around px-8 py-6">
        <button
          onClick={() => {
            setMuted(!muted);
            voice.setMuted(!muted);
          }}
          className={`grid h-14 w-14 place-items-center rounded-full text-xl ${muted ? "bg-white text-black" : "bg-white/15"}`}
          title="Silenciar"
        >
          {muted ? "🔇" : "🎙"}
        </button>
        <button onClick={hang} className="grid h-16 w-16 place-items-center rounded-full bg-[#ff3b30] text-2xl shadow-lg" title="Colgar">
          ✆
        </button>
        <button onClick={() => broadcast({ type: "wa-open", phone: caller })} className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-xl" title="Ver WhatsApp de este número">
          💬
        </button>
      </div>
    </div>
  );
}
