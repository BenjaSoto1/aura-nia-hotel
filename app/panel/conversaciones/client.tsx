"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StaffBox({ conversationId, mode }: { conversationId: string; mode: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const post = async (body: object) => {
    await fetch(`/api/panel/conversations/${conversationId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-arena-200 p-3">
      {mode === "staff" ? (
        <>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                post({ action: "send", text });
                setText("");
              }
            }}
            placeholder="Responder como staff…"
            className="min-w-0 flex-1 rounded-full border border-arena-200 px-4 py-2 text-sm outline-none focus:border-coral"
          />
          <button
            onClick={() => {
              if (text.trim()) post({ action: "send", text });
              setText("");
            }}
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white"
          >
            Enviar
          </button>
          <button onClick={() => post({ action: "return" })} className="rounded-full border border-laguna px-4 py-2 text-sm font-semibold text-laguna">
            Devolver al agente
          </button>
        </>
      ) : (
        <button onClick={() => post({ action: "take" })} className="rounded-full bg-oscuro px-4 py-2 text-sm font-semibold text-white">
          🧑‍💼 Tomar control
        </button>
      )}
    </div>
  );
}

export function ToolCalls({ json }: { json: string }) {
  const [open, setOpen] = useState(false);
  let calls: { name: string; input: unknown; result: unknown }[] = [];
  try {
    calls = JSON.parse(json);
  } catch {
    return null;
  }
  return (
    <div className="mt-1 max-w-[75%] text-[11px]">
      <button onClick={() => setOpen(!open)} className="font-semibold text-laguna">
        {open ? "▾" : "▸"} {calls.length} herramienta(s): {calls.map((c) => c.name).join(", ")}
      </button>
      {open && (
        <pre className="scroll-thin mt-1 max-h-72 overflow-auto rounded-lg bg-oscuro p-2 text-[10.5px] text-[#f4e6dc]">{JSON.stringify(calls, null, 2)}</pre>
      )}
    </div>
  );
}
