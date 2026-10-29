"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { VOICE_TOOL_NAMES } from "@/lib/tool-names";
import type { Part } from "@/lib/types";

export type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type Engine = "elevenlabs" | "browser";

interface Opts {
  channel: "web" | "phone";
  userId: string | null;
  /** Envía un turno al core (modo navegador) y devuelve las partes de respuesta. */
  sendToCore: (p: { text?: string; buttonId?: string; buttonTitle?: string }) => Promise<{ parts: Part[] } | null>;
  lang?: "es" | "en";
}

/** Texto a decir en voz alta a partir de las partes (sin URLs, emojis ni listas). */
export function spokenFrom(parts: Part[], channel: "web" | "phone", lang: "es" | "en") {
  const en = lang === "en";
  let s = parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ");
  s = s
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*•_]/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (parts.some((p) => p.type === "rate_cards") && !/pantalla|screen/.test(s)) s += en ? " I'm showing the options on screen." : " Te muestro las opciones en pantalla.";
  if (parts.some((p) => p.type === "payment_link") && channel === "web" && !/pantalla|screen/.test(s)) s += en ? " The payment button is on screen." : " El botón de pago está en pantalla.";
  return s;
}

export function useVoiceAgent({ channel, userId, sendToCore, lang = "es" }: Opts) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const userRef = useRef(userId);
  userRef.current = userId;
  const langRef = useRef(lang);
  langRef.current = lang;
  const sendRef = useRef(sendToCore);
  sendRef.current = sendToCore;

  useEffect(() => {
    fetch("/api/elevenlabs/session?probe=1")
      .then((r) => r.json())
      .then((d) => setEngine(d.provider === "elevenlabs" ? "elevenlabs" : "browser"))
      .catch(() => setEngine("browser"));
  }, []);

  // ---------- ElevenLabs: client tools que llaman al core ----------
  const clientTools = useMemo(() => {
    const tools: Record<string, (params: Record<string, unknown>) => Promise<string>> = {};
    for (const name of VOICE_TOOL_NAMES) {
      tools[name] = async (params) => {
        const r = await fetch(`/api/tools/${name}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channel, channelUserId: userRef.current, input: params ?? {} }),
        });
        const d = await r.json();
        return d.result as string;
      };
    }
    return tools;
  }, [channel]);

  const log = useCallback(
    (role: "user" | "agent", text: string) =>
      fetch(`/api/channels/${channel}/log`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelUserId: userRef.current, role, text }),
      }).catch(() => {}),
    [channel],
  );

  const conversation = useConversation({
    clientTools,
    onConnect: () => setStatus("listening"),
    onDisconnect: () => {
      active.current = false;
      setStatus("idle");
    },
    onError: (e: unknown) => {
      setError(typeof e === "string" ? e : (e as Error)?.message ?? "Error de ElevenLabs");
      setStatus("error");
    },
    onMessage: (m: { message: string; source?: string; role?: string }) => {
      const who = (m.role ?? m.source) === "user" ? "user" : "agent";
      if (m.message?.trim()) log(who, m.message);
    },
  });

  useEffect(() => {
    if (engine !== "elevenlabs" || !active.current) return;
    if (conversation.status === "connected") setStatus(conversation.isSpeaking ? "speaking" : "listening");
  }, [engine, conversation.status, conversation.isSpeaking]);

  // ---------- Navegador: Web Speech API ----------
  const recRef = useRef<any>(null);
  const mutedRef = useRef(false);

  const speak = useCallback((text: string) => {
    return new Promise<void>((resolve) => {
      if (!text || typeof window === "undefined" || !window.speechSynthesis) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const code = langRef.current === "en" ? "en-US" : "es-US";
      u.lang = code;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang === code) ?? voices.find((x) => x.lang.startsWith(langRef.current));
      if (v) u.voice = v;
      u.rate = 1.05;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      setStatus("speaking");
      window.speechSynthesis.speak(u);
    });
  }, []);

  const listen = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Este navegador no soporta reconocimiento de voz. Usa Chrome o el modo texto.");
      setStatus("error");
      return;
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = langRef.current === "en" ? "en-US" : "es-US";
    rec.interimResults = true;
    rec.continuous = false;
    let final = "";
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      setInterim(txt);
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(`Micrófono: ${e.error}`);
    };
    rec.onend = async () => {
      setInterim("");
      if (!active.current) return setStatus("idle");
      if (mutedRef.current) return setStatus("listening");
      if (!final.trim()) return listen();
      setStatus("thinking");
      const r = await sendRef.current({ text: final.trim() });
      if (r?.parts?.length) await speak(spokenFrom(r.parts, channel, langRef.current));
      if (active.current) listen();
    };
    setStatus("listening");
    try {
      rec.start();
    } catch {
      /* ya iniciado */
    }
  }, [channel, speak]);

  // ---------- API pública ----------
  const start = useCallback(
    async (context?: string, greeting?: string) => {
      setError(null);
      active.current = true;
      if (engine === "elevenlabs") {
        setStatus("connecting");
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          const s = await fetch("/api/elevenlabs/session", { cache: "no-store" }).then((r) => r.json());
          if (s.error && !s.agentId) throw new Error(s.error);
          conversation.startSession(
            s.conversationToken
              ? { conversationToken: s.conversationToken, connectionType: "webrtc", userId: userRef.current ?? undefined }
              : { agentId: s.agentId, connectionType: "webrtc", userId: userRef.current ?? undefined },
          );
          if (context) {
            // El contexto (canal, teléfono, fecha) se envía en cuanto la sesión conecta.
            const wait = setInterval(() => {
              try {
                conversation.sendContextualUpdate(context);
                clearInterval(wait);
              } catch {
                /* aún conectando */
              }
            }, 400);
            setTimeout(() => clearInterval(wait), 10000);
          }
        } catch (e) {
          active.current = false;
          setError((e as Error).message);
          setStatus("error");
        }
        return;
      }
      if (greeting) await speak(greeting);
      if (active.current) listen();
    },
    [engine, conversation, listen, speak],
  );

  const stop = useCallback(() => {
    active.current = false;
    if (engine === "elevenlabs") {
      try {
        conversation.endSession();
      } catch {
        /* noop */
      }
    } else {
      recRef.current?.abort?.();
      window.speechSynthesis?.cancel();
    }
    setStatus("idle");
  }, [engine, conversation]);

  /** El huésped toca una tarjeta o botón en pantalla durante la conversación de voz. */
  const choose = useCallback(
    async (id: string, title: string) => {
      if (engine === "elevenlabs" && active.current) {
        const quoteId = id.startsWith("pick:") ? id.slice(5) : null;
        conversation.sendContextualUpdate(quoteId ? `El huésped tocó en pantalla la opción "${title}" (quoteId ${quoteId}).` : `El huésped tocó el botón "${title}" (${id}).`);
        conversation.sendUserMessage(quoteId ? `Elijo ${title}` : title);
        log("user", `▸ ${title}`);
        return;
      }
      if (active.current) {
        recRef.current?.abort?.();
        setStatus("thinking");
      }
      const r = await sendRef.current({ buttonId: id, buttonTitle: title });
      if (active.current && r?.parts?.length) {
        await speak(spokenFrom(r.parts, channel, langRef.current));
        if (active.current) listen();
      }
    },
    [engine, conversation, log, speak, listen, channel],
  );

  /** Mensajes proactivos (p. ej. pago recibido) durante la sesión. */
  const announce = useCallback(
    async (text: string) => {
      if (!active.current) return;
      if (engine === "elevenlabs") {
        conversation.sendContextualUpdate(`Aviso del sistema: ${text} Infórmaselo al huésped brevemente.`);
      } else {
        recRef.current?.abort?.();
        await speak(text.replace(/\p{Extended_Pictographic}/gu, ""));
        if (active.current) listen();
      }
    },
    [engine, conversation, speak, listen],
  );

  const setMuted = useCallback(
    (m: boolean) => {
      mutedRef.current = m;
      if (engine === "elevenlabs") conversation.setMuted(m);
      else if (m) recRef.current?.abort?.();
      else if (active.current) listen();
    },
    [engine, conversation, listen],
  );

  /** Texto escrito durante una sesión de ElevenLabs (p. ej. el correo): va al agente como mensaje del huésped. */
  const sendText = useCallback(
    (text: string) => {
      if (engine !== "elevenlabs" || !active.current || conversation.status !== "connected") return false;
      conversation.sendUserMessage(text);
      log("user", text);
      return true;
    },
    [engine, conversation, log],
  );

  return { engine, status, interim, error, start, stop, choose, announce, setMuted, sendText, active: active.current };
}
