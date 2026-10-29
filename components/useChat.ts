"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel, Part } from "@/lib/types";

export interface ChatMessage {
  id: string;
  direction: "in" | "out";
  author: "guest" | "agent" | "staff" | "system";
  template: boolean;
  createdAt: string;
  parts: Part[];
}

/** Conversación de un usuario en un canal: polling de la bandeja + envío. */
export function useChat(channel: Channel, userId: string | null, intervalMs = 1500) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("agent");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const cursor = useRef<string | null>(null);
  const userRef = useRef(userId);
  const inflight = useRef(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    userRef.current = userId;
    cursor.current = null;
    setMessages([]);
  }, [userId, channel]);

  const poll = useCallback(async () => {
    const u = userRef.current;
    if (!u || inflight.current) return;
    if (typeof document !== "undefined" && document.hidden) return;
    inflight.current = true;
    const qs = new URLSearchParams({ u });
    if (cursor.current) qs.set("after", cursor.current);
    try {
      const r = await fetch(`/api/channels/${channel}/outbox?${qs}`, { cache: "no-store" });
      const data = await r.json();
      if (u !== userRef.current) return;
      if (data.mode) setMode(data.mode);
      if (data.language) setLanguage(data.language === "en" ? "en" : "es");
      const fresh: ChatMessage[] = data.messages ?? [];
      if (fresh.length) {
        lastActivity.current = Date.now();
        cursor.current = fresh[fresh.length - 1].createdAt;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
        });
      }
    } catch {
      /* servidor reiniciando */
    } finally {
      inflight.current = false;
    }
  }, [channel]);

  // Polling adaptativo: rápido mientras hay actividad, más lento tras 30 s sin novedades
  // (menos consultas al servidor cuando nadie está escribiendo).
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await poll();
      if (stopped) return;
      const idle = Date.now() - lastActivity.current > 30_000;
      timer = setTimeout(loop, idle ? Math.max(intervalMs, 4000) : intervalMs);
    };
    lastActivity.current = Date.now();
    loop();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [userId, poll, intervalMs]);

  const send = useCallback(
    async (payload: { text?: string; buttonId?: string; buttonTitle?: string; attachment?: { kind: "image" }; displayName?: string }) => {
      const u = userRef.current;
      if (!u) return null;
      setSending(true);
      lastActivity.current = Date.now();
      try {
        const r = await fetch(`/api/channels/${channel}/message`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelUserId: u, ...payload }),
        });
        const data = await r.json();
        await poll();
        return data as { parts: Part[]; mode: string };
      } finally {
        setSending(false);
      }
    },
    [channel, poll],
  );

  return { messages, send, sending, mode, language, refresh: poll };
}

// Bus entre simuladores (consola omnicanal y pestañas): p. ej. "abre WhatsApp de este número".
export type BusEvent = { type: "wa-open"; phone: string };

export function broadcast(ev: BusEvent) {
  try {
    const bc = new BroadcastChannel("aura-nia");
    bc.postMessage(ev);
    bc.close();
  } catch {
    /* navegador sin BroadcastChannel */
  }
  window.dispatchEvent(new CustomEvent("aura-nia", { detail: ev }));
}

export function useBus(handler: (ev: BusEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const local = (e: Event) => ref.current((e as CustomEvent).detail);
    window.addEventListener("aura-nia", local);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("aura-nia");
      bc.onmessage = (e) => ref.current(e.data);
    } catch {
      /* noop */
    }
    return () => {
      window.removeEventListener("aura-nia", local);
      bc?.close();
    };
  }, []);
}
