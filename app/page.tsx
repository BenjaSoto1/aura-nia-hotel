import { loadHotelPack } from "@/lib/hotel-pack";
import { TopNav, TimeTravel } from "@/components/StatusBar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { WhatsAppSim } from "@/components/sims/WhatsAppSim";
import { DmSim } from "@/components/sims/DmSim";
import { PhoneSim } from "@/components/sims/PhoneSim";
import { WebAssistant } from "@/components/voice/WebAssistant";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Console() {
  const pack = loadHotelPack();
  const name = pack.hotel.nombre;
  return (
    <div className="min-h-screen">
      <TopNav hotelName={name} active="consola" />
      <main className="mx-auto max-w-[1800px] px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl leading-tight md:text-4xl">Un solo cerebro, cinco canales.</h1>
            <p className="mt-1 max-w-2xl text-sm text-tinta">
              {pack.agente.nombre} atiende WhatsApp, Instagram, Messenger, la web por voz y el teléfono con las mismas herramientas, precios y políticas. Todo lo que pasa aquí aparece en el{" "}
              <Link href="/panel" className="font-semibold text-laguna underline-offset-2 hover:underline">
                panel del hotel
              </Link>
              .
            </p>
          </div>
          <TimeTravel compact />
        </div>

        <div className="scroll-thin -mx-4 flex gap-6 overflow-x-auto px-4 pb-6 md:-mx-6 md:px-6">
          <PhoneFrame label="WhatsApp">
            <WhatsAppSim hotelName={name} />
          </PhoneFrame>
          <PhoneFrame label="Instagram">
            <DmSim variant="instagram" hotelName={name} coverImage={pack.hotel.foto_portada} />
          </PhoneFrame>
          <PhoneFrame label="Messenger">
            <DmSim variant="messenger" hotelName={name} />
          </PhoneFrame>
          <div className="flex shrink-0 flex-col items-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gris">Web · asistente de voz</div>
            <div className="flex h-[700px] w-[400px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_60px_-20px_rgba(19,48,46,0.35)]">
              <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-[#f3f1ed] px-3 py-2">
                <span className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </span>
                <Link href="/canal/web" target="_blank" className="flex-1 truncate rounded-md bg-white px-2 py-1 text-[11px] text-gris hover:text-laguna">
                  🔒 aura.example
                </Link>
              </div>
              <div className="relative h-28 shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${pack.hotel.foto_portada})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-oscuro/80 to-transparent" />
                <div className="absolute bottom-2 left-3 text-white">
                  <div className="font-serif text-lg leading-tight">{name}</div>
                  <div className="text-[11px] opacity-80">{pack.hotel.ciudad}</div>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <WebAssistant agentName={pack.agente.nombre} hotelName={name} embedded />
              </div>
            </div>
          </div>
          <PhoneFrame label="Teléfono">
            <PhoneSim hotelName={name} hotelPhone={pack.hotel.telefono} />
          </PhoneFrame>
        </div>

        <div className="grid gap-3 text-[13px] text-tinta md:grid-cols-4">
          {[
            ["1 · Voz en la web", "“Hola, quiero dos noches del 14 al 16 de noviembre para dos personas y un perro pequeño” → elige la prepago → paga."],
            ["2 · Teléfono", "Llama con otro número, reserva la Habitación Deluxe Flexible: el enlace llega al WhatsApp de ese número."],
            ["3 · Instagram", "“¿Aceptan perros de 12 kg?” → responde con la política y ofrece alternativas."],
            ["4 · Viaje en el tiempo", "⏩ 24 h antes → pre-check-in por WhatsApp; luego spa, día de salida y pago del saldo."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-arena-200 bg-white p-4">
              <div className="font-serif text-base text-oscuro">{t}</div>
              <div className="mt-1 leading-snug">{d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
