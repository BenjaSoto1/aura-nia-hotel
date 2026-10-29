"use client";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "../useChat";

/** Contexto que recibe el agente de ElevenLabs al conectar (canal, teléfono, fecha del hotel). */
export async function voiceContext(channel: "web" | "phone", userId: string) {
  const s = await fetch("/api/status").then((r) => r.json()).catch(() => ({}));
  // Fecha real (no la del viaje en el tiempo): las reservas son siempre de hoy en adelante.
  const today = new Date(s.today ?? Date.now());
  const fecha = today.toLocaleString("es-ES", { timeZone: "America/Puerto_Rico", dateStyle: "full", timeStyle: "short" });
  const iso = today.toLocaleDateString("en-CA", { timeZone: "America/Puerto_Rico" });
  const base = `Contexto del sistema. Fecha y hora del hotel: ${fecha} (hoy es ${iso}). Solo se reserva desde hoy en adelante: si el huésped dice un día y mes sin año, usa la próxima vez que ocurra a partir de hoy. Usa siempre las herramientas para disponibilidad, precios y reservas; las tarjetas de tarifas y los botones de pago aparecen solos en pantalla. Haz una sola pregunta por turno, en frases cortas; nunca pidas dos datos a la vez.`;
  if (channel === "phone")
    return `${base} Canal: llamada telefónica. Teléfono del huésped: ${userId} (úsalo como phone en create_reservation; no lo pidas, solo confírmalo). Para el correo, pide que lo deletree y repítelo letra por letra para confirmarlo antes de reservar. Para pagar, llama a create_payment_link: el enlace llega solo al WhatsApp del huésped; dile que se lo enviaste por WhatsApp. Con tarifa flexible, tras reservar llama a preauthorize (garantía, también llega por WhatsApp).`;
  return `${base} Canal: asistente de voz del sitio web. Identificador de sesión: ${userId}. Pide nombre, correo y teléfono para reservar, de a uno. Para el correo, pídele que lo escriba en el chat de la pantalla (llega como mensaje de texto) y confírmalo leyéndolo una vez. El pago es un botón en pantalla; nunca dictes ni pidas datos de tarjeta.`;
}

/** Llama a onNew con cada mensaje saliente nuevo que no originó el propio turno (avisos proactivos). */
export function useProactive(messages: ChatMessage[], onNew: (m: ChatMessage) => void) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(messages.map((m) => m.id));
      return;
    }
    for (const m of messages) {
      if (seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      if (m.direction === "out" && m.parts.some((p) => p.type === "reservation_summary")) onNew(m);
    }
  }, [messages, onNew]);
}

export function VoiceOrb({ status, size = 120 }: { status: string; size?: number }) {
  const speaking = status === "speaking";
  const listening = status === "listening";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {(speaking || listening) && <span className={`pulse-ring absolute inset-0 rounded-full ${speaking ? "text-laguna/40" : "text-bruma/30"}`} />}
      <div
        className={`relative grid place-items-center rounded-full shadow-lg transition-colors ${speaking ? "bg-laguna" : status === "thinking" || status === "connecting" ? "bg-oscuro" : "bg-noche"}`}
        style={{ width: size * 0.78, height: size * 0.78 }}
      >
        {speaking || listening ? (
          <div className="flex h-8 items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="voice-bar block w-1.5 rounded-full bg-white" style={{ height: 28, animationDelay: `${i * 0.12}s`, animationDuration: speaking ? "0.7s" : "1.4s" }} />
            ))}
          </div>
        ) : status === "thinking" || status === "connecting" ? (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot h-2 w-2 rounded-full bg-white" />
            ))}
          </div>
        ) : (
          <svg width={size * 0.3} height={size * 0.3} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        )}
      </div>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  idle: "Toca para hablar",
  connecting: "Conectando…",
  listening: "Te escucho…",
  thinking: "Pensando…",
  speaking: "Nía está hablando",
  error: "Hubo un problema",
};
