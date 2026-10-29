"use client";
import { useEffect, useState } from "react";
import { openNia, type NiaOpenDetail } from "../voice/WebAssistant";

/** Botón del sitio que abre a Nía y, opcionalmente, le envía un primer mensaje. */
export function NiaCta({ detail, className, children }: { detail?: NiaOpenDetail; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openNia(detail)} className={className}>
      {children}
    </button>
  );
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha local AAAA-MM-DD (no UTC: de noche en Chile, UTC ya es "mañana"). */
function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(s: string, n: number) {
  const [y, m, d] = s.split("-").map(Number);
  return iso(new Date(y, m - 1, d + n));
}
function longEs(s: string) {
  const [, m, d] = s.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}
function shortEs(s: string) {
  const [, m, d] = s.split("-").map(Number);
  return `${d} ${SHORT[m - 1]}`;
}

/** Barra de reserva del hero: arma la consulta y se la pasa a Nía (que consulta disponibilidad real). */
export function BookingBar({ rooms }: { rooms: { code: string; name: string }[] }) {
  // Se calcula en el navegador al cargar: siempre parte de hoy y avanza solo cada día.
  const [today, setToday] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  useEffect(() => {
    const t = iso(new Date());
    setToday(t);
    setCheckIn(t);
    setCheckOut(addDays(t, 1));
  }, []);
  const changeIn = (v: string) => {
    if (!v || v < today) v = today; // nunca fechas pasadas
    setCheckIn(v);
    if (!checkOut || checkOut <= v) setCheckOut(addDays(v, 1));
  };
  const changeOut = (v: string) => setCheckOut(v && v > checkIn ? v : addDays(checkIn, 1));
  const [guests, setGuests] = useState(2);
  const [room, setRoom] = useState("");

  const ask = () => {
    if (!checkIn) return;
    const out = checkOut > checkIn ? checkOut : addDays(checkIn, 1);
    const roomName = rooms.find((r) => r.code === room)?.name;
    openNia({
      text: `Quiero ver disponibilidad del ${longEs(checkIn)} al ${longEs(out)} para ${guests} ${guests === 1 ? "adulto" : "adultos"}${roomName ? `, en la ${roomName}` : ""}.`,
    });
  };

  const label = "text-[10px] uppercase tracking-[0.16em] text-gris";
  const field = "mt-0.5 w-full bg-transparent font-medium text-oscuro outline-none";

  return (
    <>
      {/* Escritorio: barra completa */}
      <div className="mt-11 hidden max-w-[960px] grid-cols-[1fr_1fr_1fr_1fr_auto] bg-cal text-oscuro md:grid">
        <label className="border-r border-[#E3D8C3] px-6 py-4">
          <div className={label}>Llegada{checkIn ? ` · ${shortEs(checkIn)}` : ""}</div>
          <input type="date" min={today} value={checkIn} onChange={(e) => changeIn(e.target.value)} className={field} />
        </label>
        <label className="border-r border-[#E3D8C3] px-6 py-4">
          <div className={label}>Salida{checkOut ? ` · ${shortEs(checkOut)}` : ""}</div>
          <input type="date" min={checkIn ? addDays(checkIn, 1) : undefined} value={checkOut} onChange={(e) => changeOut(e.target.value)} className={field} />
        </label>
        <label className="border-r border-[#E3D8C3] px-6 py-4">
          <div className={label}>Huéspedes</div>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={field}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "adulto" : "adultos"}
              </option>
            ))}
          </select>
        </label>
        <label className="border-r border-[#E3D8C3] px-6 py-4">
          <div className={label}>Habitación</div>
          <select value={room} onChange={(e) => setRoom(e.target.value)} className={field}>
            <option value="">Cualquiera</option>
            {rooms.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={ask} className="bg-oscuro px-9 text-[12px] font-semibold uppercase tracking-[0.14em] text-fondo transition-colors hover:bg-noche">
          Ver disponibilidad
        </button>
      </div>
      {/* Móvil: un solo CTA */}
      <button
        onClick={() => openNia({ buttonId: "menu:book", buttonTitle: "Reservar habitación" })}
        className="mt-8 w-full bg-cal py-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-oscuro md:hidden"
      >
        Ver disponibilidad
      </button>
    </>
  );
}
