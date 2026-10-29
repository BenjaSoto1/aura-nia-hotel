"use client";
import { useEffect, useRef, useState } from "react";
import { RichPart, RichText } from "../Parts";
import { useBus, useChat, type ChatMessage } from "../useChat";
import { NiaMonogram } from "../brand";

const DEFAULT_PHONE = "+17875550123";

function pretty(p: string) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p);
  return m ? `+1 ${m[1]} ${m[2]} ${m[3]}` : p;
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export function WhatsAppSim({ hotelName, initialPhone, full = false }: { hotelName: string; initialPhone?: string; full?: boolean }) {
  const [phone, setPhone] = useState(initialPhone || DEFAULT_PHONE);
  const [known, setKnown] = useState<string[]>([DEFAULT_PHONE, ...(initialPhone && initialPhone !== DEFAULT_PHONE ? [initialPhone] : [])]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const { messages, send, sending, mode, language } = useChat("whatsapp", phone);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localImages, setLocalImages] = useState<string[]>([]);

  useBus((ev) => {
    if (ev.type === "wa-open" && ev.phone) setPhone(ev.phone);
  });

  useEffect(() => {
    const load = () =>
      fetch("/api/channels/whatsapp/users")
        .then((r) => r.json())
        .then((d) => setKnown([...new Set([DEFAULT_PHONE, phone, ...d.users.map((u: { id: string }) => u.id)])]))
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [phone]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await send({ text: t });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    // La imagen solo se muestra localmente: al servidor viaja únicamente "se envió una imagen".
    setLocalImages((l) => [...l, URL.createObjectURL(f)]);
    await send({ attachment: { kind: "image" } });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${full ? "h-full" : ""}`}>
      {/* Cabecera */}
      <div className="flex shrink-0 items-center gap-2.5 bg-oscuro px-3 py-2.5 text-fondo">
        <NiaMonogram size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] font-semibold leading-tight">
            Nía · {hotelName}
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-wa-green text-[9px] text-white">✓</span>
          </div>
          <div className="text-[11px] text-white/75">{mode === "staff" ? "Atendido por recepción" : "WhatsApp Business · cuenta de empresa"}</div>
        </div>
        <span className="text-lg opacity-80">📞</span>
      </div>
      {/* Selector de huésped */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-black/5 bg-[#f0f2f5] px-3 py-1.5 text-[11px] text-tinta">
        <span className="text-gris">Hablas como:</span>
        {editing ? (
          <input
            autoFocus
            defaultValue={phone}
            onBlur={(e) => {
              const v = e.target.value.replace(/[^\d+]/g, "");
              if (v.length >= 8) setPhone(v.startsWith("+") ? v : `+${v.length === 10 ? "1" + v : v}`);
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="w-32 rounded border border-black/10 bg-white px-1.5 py-0.5"
          />
        ) : (
          <select value={phone} onChange={(e) => (e.target.value === "__new" ? setEditing(true) : setPhone(e.target.value))} className="rounded bg-transparent font-semibold text-oscuro">
            {[...new Set([phone, ...known])].map((p) => (
              <option key={p} value={p}>
                {pretty(p)}
              </option>
            ))}
            <option value="__new">+ Otro número…</option>
          </select>
        )}
      </div>
      {/* Mensajes */}
      <div ref={scroller} className="wa-wallpaper scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-3">
        <div className="mx-auto mb-2 w-fit rounded-md bg-[#fff5c4] px-2.5 py-1 text-center text-[10.5px] text-[#54656f] shadow-sm">
          🔒 Los mensajes con {hotelName} están protegidos. Demo simulado.
        </div>
        {messages.length === 0 && <EmptyHint text='Escribe "Hola" o "Quiero 2 noches del 14 al 16 de noviembre"' />}
        {messages.map((m, i) => (
          <WaMessage key={m.id} m={m} lang={language} disabled={sending} onButton={(id, title) => send({ buttonId: id, buttonTitle: title })} imageUrl={m.direction === "in" && isPhoto(m) ? localImages[photoIndex(messages, i)] : undefined} />
        ))}
        {sending && (
          <div className="w-fit rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
            <Typing />
          </div>
        )}
      </div>
      {/* Compositor */}
      <div className="flex shrink-0 items-center gap-1.5 bg-[#f0f2f5] px-2 py-2">
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-white px-3 shadow-sm">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Mensaje"
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] outline-none"
          />
          <button title="Adjuntar foto" onClick={() => fileRef.current?.click()} className="px-1 text-lg text-gris hover:text-oscuro">
            📎
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <button onClick={submit} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#00a884] text-white shadow">
          ➤
        </button>
      </div>
    </div>
  );
}

const isPhoto = (m: ChatMessage) => m.parts.some((p) => p.type === "text" && p.text.startsWith("📷"));
const photoIndex = (all: ChatMessage[], i: number) => all.slice(0, i + 1).filter((m) => m.direction === "in" && isPhoto(m)).length - 1;

function WaMessage({ m, onButton, disabled, imageUrl, lang }: { m: ChatMessage; onButton: (id: string, title: string) => void; disabled: boolean; imageUrl?: string; lang: "es" | "en" }) {
  const mine = m.direction === "in";
  const textParts = m.parts.filter((p) => p.type === "text");
  const rich = m.parts.filter((p) => p.type !== "text");
  if (m.author === "system") {
    return <div className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-gris shadow-sm">{textParts.map((p) => (p.type === "text" ? p.text : "")).join(" ")}</div>;
  }
  return (
    <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      {textParts.length > 0 && (
        <div className={`relative max-w-[85%] rounded-lg px-2.5 pb-1 pt-1.5 text-[14px] leading-snug text-[#111b21] shadow-sm ${mine ? "rounded-tr-none bg-wa-out" : "rounded-tl-none border border-[#E3C7B3] bg-white"}`}>
          {m.template && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8696a0]">{lang === "en" ? "Approved template (simulated)" : "Plantilla aprobada (simulada)"}</div>}
          {m.author === "staff" && <div className="mb-0.5 text-[11px] font-semibold text-bruma">{lang === "en" ? "Front desk team" : "Equipo de recepción"}</div>}
          {imageUrl && <img src={imageUrl} alt="Documento enviado" className="mb-1 max-h-40 rounded-md object-cover blur-[2px]" />}
          {textParts.map((p, i) => (p.type === "text" ? <div key={i}><RichText text={p.text} /></div> : null))}
          <div className="mt-0.5 text-right text-[10px] text-[#667781]">
            {time(m.createdAt)} {mine && <span className="text-[#53bdeb]">✓✓</span>}
          </div>
        </div>
      )}
      {rich.map((p, i) => (
        <div key={i} className="w-[85%]">
          <RichPart part={p} variant="whatsapp" lang={lang} onButton={onButton} disabled={disabled} />
        </div>
      ))}
    </div>
  );
}

export function Typing() {
  return (
    <span className="flex gap-1">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gris" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gris" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gris" />
    </span>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return <div className="mx-auto mt-8 max-w-[80%] rounded-lg bg-white/70 px-3 py-2 text-center text-[12px] text-gris">{text}</div>;
}
