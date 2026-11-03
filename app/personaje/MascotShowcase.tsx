"use client";

import { useState } from "react";
import { Bellhop3D } from "@/components/mascot/Bellhop3D";

export function MascotShowcase({ hotelName }: { hotelName: string }) {
  const [waves, setWaves] = useState(0);
  return (
    <main className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-10 md:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gris">Personaje 3D · {hotelName}</div>
        <h1 className="mt-3 font-serif text-5xl leading-[1.05] md:text-6xl">¡Bienvenido! Te llevo las maletas.</h1>
        <p className="mt-5 max-w-md text-tinta">
          Nuestro botones: uniforme rojo con doble fila de botones dorados, corbatín laguna, guantes blancos y gorro pillbox con tres estrellas. Te sigue con la mirada y saluda cada pocos segundos.
        </p>
        <button
          onClick={() => setWaves((n) => n + 1)}
          className="mt-7 rounded-full bg-laguna px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgba(11,110,105,0.7)] hover:bg-laguna-600"
        >
          👋 Saludar
        </button>
        <p className="mt-3 text-xs text-gris">También puedes hacer clic sobre el personaje.</p>
      </div>
      <div className="relative">
        <div className="absolute inset-x-6 top-10 bottom-6 rounded-[48px] bg-arena" />
        <Bellhop3D className="relative h-[560px] w-full md:h-[640px]" waveSignal={waves} />
      </div>
    </main>
  );
}
