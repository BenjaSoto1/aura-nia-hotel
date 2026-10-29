import Link from "next/link";
import { db } from "@/lib/db";
import { loadHotelPack } from "@/lib/hotel-pack";
import { partsToPlainText } from "@/lib/conversations";
import type { Part } from "@/lib/types";
import { TopNav } from "@/components/StatusBar";
import { AutoRefresh } from "@/components/panel/AutoRefresh";
import { ChannelTag } from "@/components/panel/badges";
import { StaffBox, ToolCalls } from "./client";

export const dynamic = "force-dynamic";

export default async function Conversations({ searchParams }: { searchParams: Promise<{ c?: string; channel?: string }> }) {
  const sp = await searchParams;
  const pack = loadHotelPack();
  const convs = await db.conversation.findMany({
    where: sp.channel ? { channel: sp.channel } : {},
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const selectedId = sp.c ?? convs[0]?.id;
  const selected = selectedId
    ? await db.conversation.findUnique({ where: { id: selectedId }, include: { messages: { orderBy: { createdAt: "asc" } } } })
    : null;
  const guest = selected?.guestId ? await db.guest.findUnique({ where: { id: selected.guestId }, include: { identities: true, reservations: true } }) : null;
  const tz = pack.hotel.zona_horaria;
  const t = (d: Date) => d.toLocaleString("es-ES", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex h-screen flex-col">
      <AutoRefresh ms={2500} />
      <TopNav hotelName={pack.hotel.nombre} active="conversaciones" />
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 md:px-6">
        <aside className="scroll-thin w-80 shrink-0 overflow-y-auto rounded-2xl border border-arena-200 bg-white">
          <div className="flex flex-wrap gap-1 border-b border-arena-200 p-2">
            {[undefined, "whatsapp", "instagram", "messenger", "web", "phone"].map((c) => (
              <Link key={c ?? "all"} href={c ? `/panel/conversaciones?channel=${c}` : "/panel/conversaciones"} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sp.channel === c ? "bg-oscuro text-white" : "bg-fondo hover:bg-arena"}`}>
                {c ?? "Todas"}
              </Link>
            ))}
          </div>
          {convs.length === 0 && <div className="p-4 text-sm text-gris">Sin conversaciones todavía.</div>}
          {convs.map((c) => {
            const last = c.messages[0];
            return (
              <Link
                key={c.id}
                href={`/panel/conversaciones?c=${c.id}${sp.channel ? `&channel=${sp.channel}` : ""}`}
                className={`block border-b border-arena-200/60 px-3 py-2.5 hover:bg-fondo ${c.id === selectedId ? "bg-laguna-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <ChannelTag channel={c.channel} />
                  <span className="truncate text-[13px] font-semibold">{c.displayName ?? c.channelUserId}</span>
                  {c.needsHuman && <span className="ml-auto rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">PERSONA</span>}
                  {c.mode === "staff" && !c.needsHuman && <span className="ml-auto rounded-full bg-oscuro px-1.5 text-[10px] font-bold text-white">STAFF</span>}
                </div>
                <div className="mt-1 truncate text-[12px] text-gris">{last ? partsToPlainText(JSON.parse(last.partsJson) as Part[]) : ""}</div>
              </Link>
            );
          })}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-arena-200 bg-white">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-arena-200 px-4 py-3">
                <ChannelTag channel={selected.channel} />
                <span className="font-semibold">{selected.displayName ?? selected.channelUserId}</span>
                {guest && (
                  <span className="text-[12px] text-gris">
                    · {guest.fullName} · {guest.email} · identidades: {guest.identities.map((i) => `${i.channel}:${i.channelUserId}`).join(", ")}
                  </span>
                )}
                <span className="ml-auto text-[12px] font-semibold">{selected.mode === "staff" ? "🧑‍💼 Atiende el equipo" : `🤖 Atiende ${pack.agente.nombre}`}</span>
              </div>
              <div className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-fondo p-4">
                {selected.messages.map((m) => {
                  const parts = JSON.parse(m.partsJson) as Part[];
                  const mine = m.direction === "in";
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-start" : "items-end"}`}>
                      <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] ${mine ? "bg-white shadow-sm" : m.author === "staff" ? "bg-coral text-white" : m.author === "system" ? "bg-arena text-tinta" : "bg-laguna text-white"}`}>
                        {m.template && <div className="text-[10px] font-semibold uppercase opacity-70">Plantilla</div>}
                        {partsToPlainText(parts)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-gris">
                        {mine ? "Huésped" : m.author === "staff" ? "Staff" : m.author === "system" ? "Sistema" : pack.agente.nombre} · {t(m.createdAt)}
                      </div>
                      {m.toolCallsJson && <ToolCalls json={m.toolCallsJson} />}
                    </div>
                  );
                })}
              </div>
              <StaffBox conversationId={selected.id} mode={selected.mode} />
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-gris">Elige una conversación</div>
          )}
        </section>
      </div>
    </div>
  );
}
