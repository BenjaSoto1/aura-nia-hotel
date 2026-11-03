import Link from "next/link";
import { loadHotelPack } from "@/lib/hotel-pack";
import { priceStay } from "@/lib/tools/quote";
import { usd } from "@/lib/money";
import { WebAssistant } from "@/components/voice/WebAssistant";
import { AuraWordmark, ImgSlot, NiaMonogram } from "@/components/brand";
import { BookingBar, NiaCta } from "@/components/site/NiaCta";

export const dynamic = "force-dynamic";

const u = (id: string, w = 1400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const g = (a: string, b: string, deg = 150) => `linear-gradient(${deg}deg,${a},${b})`;

const EXPERIENCES = [
  { name: "Navegación al atardecer", desc: "Dos horas en el agua, con champaña.", img: u("1760638285048-1bae91715ec2", 800), bg: g("#D9A27F", "#B8623F"), ask: "Me interesa la navegación al atardecer. ¿Cómo la reservo?" },
  { name: "Cena privada", desc: "Un menú degustación en la arena, solo para ti.", img: u("1783940028793-c520090c27db", 800), bg: g("#C98E6B", "#6B3F2B"), ask: "Me interesa una cena privada en la playa." },
  { name: "Spa y bienestar", desc: "Tratamientos al aire libre y yoga al amanecer.", img: u("1715242563833-946f4b811399", 800), bg: g("#9DB0A6", "#3F5448"), ask: "¿Qué rituales de bienestar tienen?" },
  { name: "Excursión a la isla", desc: "Calas escondidas y guías locales en bote.", img: u("1634480231310-6713653aab61", 800), bg: g("#A9BDB2", "#5E7468"), ask: "Me interesa la excursión a la isla." },
];

const CAPABILITIES = [
  { label: "Consultar disponibilidad en tiempo real", detail: { buttonId: "menu:book", buttonTitle: "Reservar habitación" } },
  { label: "Reservar una habitación o una mesa", detail: { buttonId: "menu:book", buttonTitle: "Reservar habitación" } },
  { label: "Sumar experiencias a tu estadía", detail: { text: "¿Qué experiencias puedo sumar a mi estadía?" } },
  { label: "Hablar con una persona de recepción", detail: { text: "Quiero hablar con una persona de recepción" } },
];

const ROOM_BG = [g("#E6D8C0", "#B59B76"), g("#A9BDB2", "#4E6A62"), g("#D9A27F", "#8A4A2E")];

export default function HotelSite() {
  const pack = loadHotelPack();
  const h = pack.hotel;
  const agent = pack.agente.nombre;
  const inventory = pack.habitaciones.reduce((s, r) => s + r.inventario, 0);
  const rooms = pack.habitaciones.map((r) => {
    const size = r.descripcion_es.match(/(\d+\s*m²)/)?.[1] ?? "";
    return { ...r, size, desc: r.descripcion_es.replace(/\s*\d+\s*m²\.?\s*$/, ""), from: usd(priceStay(r.codigo, "FLEX", 1, 0).nightlyCents) };
  });

  const navLink = "text-[12px] font-medium uppercase tracking-[0.16em] opacity-90 transition-opacity hover:opacity-100";

  return (
    <div className="min-h-screen bg-fondo text-oscuro">
      {/* Navegación */}
      <header className="absolute inset-x-0 top-0 z-30 text-cal">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-5 py-5 md:px-14 md:py-7">
          <nav className="hidden gap-7 lg:flex">
            <a href="#habitaciones" className={navLink}>
              Habitaciones
            </a>
            <a href="#experiencias" className={navLink}>
              Experiencias
            </a>
            <a href="#gastronomia" className={navLink}>
              Gastronomía
            </a>
            <a href="#bienestar" className={navLink}>
              Bienestar
            </a>
          </nav>
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none text-xl" aria-label="Menú">
              ☰
            </summary>
            <div className="absolute left-0 top-9 grid w-52 gap-3 bg-cal p-5 text-oscuro shadow-xl">
              {["Habitaciones", "Experiencias", "Gastronomía", "Bienestar"].map((l) => (
                <a key={l} href={`#${l.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`} className="text-[12px] uppercase tracking-[0.16em]">
                  {l}
                </a>
              ))}
              <Link href="/consola" className="text-[12px] uppercase tracking-[0.16em] text-gris">
                Consola demo
              </Link>
            </div>
          </details>
          <Link href="/sitio-clasico" className="justify-self-center text-[26px] md:text-[32px]" aria-label={h.nombre}>
            <AuraWordmark name={h.nombre} />
          </Link>
          <div className="flex items-center justify-end gap-6">
            <NiaCta detail={{ buttonId: "menu:mine", buttonTitle: "Mi reserva" }} className={`${navLink} hidden lg:block`}>
              Mi reserva
            </NiaCta>
            <NiaCta
              detail={{ buttonId: "menu:book", buttonTitle: "Reservar habitación" }}
              className="border border-cal px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors hover:bg-cal hover:text-oscuro md:px-5 md:py-[11px] md:text-[12px] md:tracking-[0.16em]"
            >
              Reservar
            </NiaCta>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[620px] flex-col justify-end overflow-hidden text-cal md:min-h-[760px]">
        <ImgSlot src={h.foto_portada} alt={`Fachada de ${h.nombre} al atardecer`} className="!absolute inset-0" gradient={g("#8FA39A", "#B8623F", 115)} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(22,32,43,.45) 0%,rgba(22,32,43,.08) 35%,rgba(22,32,43,.6) 100%)" }} />
        <div className="relative mx-auto w-full max-w-[1200px] px-5 pb-10 md:px-14 md:pb-14">
          <div className="eyebrow">
            {h.ciudad.split(",").pop()?.trim()} · {inventory} habitaciones y suites
          </div>
          <h1 className="mt-4 max-w-[820px] font-serif text-[52px] font-normal leading-[0.98] md:text-[96px]">
            Una casa serena <em>frente al mar.</em>
          </h1>
          <NiaCta
            detail={{ voice: true }}
            className="mt-7 inline-flex items-center gap-3 rounded-full border border-cal/60 bg-noche/40 py-1.5 pl-1.5 pr-5 text-left backdrop-blur transition-colors hover:bg-noche/70"
          >
            <NiaMonogram size={40} />
            <span>
              <span className="block text-[12px] font-semibold uppercase tracking-[0.14em]">Hablar con {agent}</span>
              <span className="block text-[12px] text-cal/75">Reserva por voz, en tu idioma</span>
            </span>
          </NiaCta>
          <BookingBar rooms={pack.habitaciones.map((r) => ({ code: r.codigo, name: r.nombre_es }))} />
        </div>
      </section>

      {/* La casa */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 md:grid-cols-[1fr_1.1fr] md:gap-20 md:px-14 md:py-28">
        <div>
          <div className="eyebrow text-laguna">La casa</div>
          <p className="mt-5 font-serif text-[32px] leading-[1.15] md:text-[42px]">
            {inventory === 24 ? "Veinticuatro" : inventory} habitaciones, una larga terraza y una cocina que sigue la pesca del día.
          </p>
          <p className="mt-6 max-w-[440px] text-tinta">
            {h.nombre} está construida en piedra caliza local y madera clara, abierta a los vientos alisios. Lo bastante pequeña para saber tu nombre.
          </p>
        </div>
        <div className="grid grid-cols-[1.2fr_1fr] gap-4">
          <ImgSlot src={u("1785791153562-e4b4afdcc69d", 900)} alt="Terraza frente al mar" ratio="3/4" gradient={g("#D8C7A4", "#A88E68", 160)} />
          <ImgSlot src={u("1674205710296-606898df6642", 900)} alt="Patio con piscina y palmeras" ratio="3/4" gradient={g("#9DB0A6", "#5E7468", 160)} className="mt-14" />
        </div>
      </section>

      {/* Habitaciones */}
      <section id="habitaciones" className="mx-auto max-w-[1200px] scroll-mt-6 px-5 pb-20 md:px-14 md:pb-28">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-[44px] font-medium leading-none md:text-[56px]">Habitaciones</h2>
          <NiaCta detail={{ buttonId: "menu:rooms", buttonTitle: "Ver habitaciones" }} className="border-b border-oscuro pb-1 text-[12px] font-semibold uppercase tracking-[0.14em]">
            Ver todas
          </NiaCta>
        </div>
        <div className="mt-9 grid gap-10 md:grid-cols-3 md:gap-6">
          {rooms.map((r, i) => (
            <article key={r.codigo}>
              <ImgSlot src={r.foto} alt={r.nombre_es} ratio="4/5" gradient={ROOM_BG[i % ROOM_BG.length]} />
              <div className="mt-5 flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-[30px] font-medium leading-tight md:text-[32px]">{r.nombre_es}</h3>
                <span className="shrink-0 text-[12px] tracking-[0.06em] text-gris">{r.size}</span>
              </div>
              <p className="mt-1.5 text-[15px] text-tinta">{r.desc}</p>
              {r.amenidades_es && <div className="mt-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-bruma">{r.amenidades_es}</div>}
              <div className="mt-4 flex items-center justify-between border-t border-arena-200 pt-4">
                <span className="text-[13px] text-gris">
                  Hasta {r.max_huespedes} huéspedes · desde {r.from}
                </span>
                <NiaCta
                  detail={{ text: `Quiero ver disponibilidad para la ${r.nombre_es}.` }}
                  className="border-b border-laguna pb-[3px] text-[12px] font-bold uppercase tracking-[0.12em]"
                >
                  Ver disponibilidad
                </NiaCta>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Experiencias */}
      <section id="experiencias" className="scroll-mt-6 bg-oscuro text-fondo">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-14 md:py-[104px]">
          <div className="eyebrow text-durazno">Experiencias</div>
          <h2 className="mt-3.5 max-w-[640px] font-serif text-[44px] font-normal leading-[1.02] md:text-[56px]">
            Días pensados <em>para ti.</em>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-4">
            {EXPERIENCES.map((e) => (
              <NiaCta key={e.name} detail={{ text: e.ask }} className="group text-left">
                <ImgSlot src={e.img} alt={e.name} ratio="3/4" gradient={e.bg} className="transition-opacity group-hover:opacity-90" />
                <div className="mt-4 font-serif text-[24px] leading-tight md:text-[28px]">{e.name}</div>
                <div className="mt-1 text-[14px] text-[#B9BEC0]">{e.desc}</div>
              </NiaCta>
            ))}
          </div>
        </div>
      </section>

      {/* Gastronomía + Bienestar */}
      <section className="grid md:grid-cols-2">
        <div id="gastronomia" className="scroll-mt-6 bg-arena px-5 py-20 md:px-14 md:py-24">
          <div className="eyebrow text-laguna">Gastronomía</div>
          <h3 className="mt-3.5 font-serif text-[40px] font-medium leading-[1.05] md:text-[46px]">Sal, humo y cítricos en Brasa.</h3>
          <p className="mb-7 mt-4 max-w-[400px] text-tinta">Cocina a fuego abierto en la terraza. Desayuno hasta el mediodía, cena junto al agua.</p>
          <ImgSlot src={u("1599827206951-160baab40e45", 1100)} alt="Mesa en la terraza de Brasa" ratio="16/10" gradient={g("#C98E6B", "#8A4A2E")} />
          <NiaCta detail={{ text: "Quiero reservar una mesa en Brasa." }} className="mt-6 border-b border-oscuro pb-[3px] text-[12px] font-bold uppercase tracking-[0.12em]">
            Reservar mesa
          </NiaCta>
        </div>
        <div id="bienestar" className="scroll-mt-6 bg-bruma px-5 py-20 text-cal md:px-14 md:py-24">
          <div className="eyebrow text-[#E8CDB4]">Bienestar</div>
          <h3 className="mt-3.5 font-serif text-[40px] font-medium leading-[1.05] md:text-[46px]">
            Rituales lentos, <em>aire de mar.</em>
          </h3>
          <p className="mb-7 mt-4 max-w-[400px] text-[#E4EAE5]">Salas de tratamiento al aire libre, yoga al amanecer y piscina fría frente a la bahía.</p>
          <ImgSlot src={u("1752769041878-f24e37fd6aea", 1100)} alt="Sala de tratamiento al aire libre" ratio="16/10" gradient={g("#A9BDB2", "#3F5448")} />
          <NiaCta detail={{ text: "Quiero reservar un ritual de bienestar." }} className="mt-6 border-b border-cal pb-[3px] text-[12px] font-bold uppercase tracking-[0.12em]">
            Reservar un ritual
          </NiaCta>
        </div>
      </section>

      {/* Destino */}
      <section className="px-5 py-20 text-center md:py-[104px]">
        <div className="eyebrow text-laguna">Destino</div>
        <p className="mx-auto mt-4 max-w-[820px] font-serif text-[36px] leading-[1.1] md:text-[50px]">A veinte minutos del aeropuerto. A un mundo de todo lo demás.</p>
      </section>

      {/* Conoce a Nía */}
      <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-14 md:pb-24">
        <div className="grid items-center gap-10 bg-oscuro p-7 text-fondo md:grid-cols-[1.1fr_1fr] md:gap-14 md:p-14">
          <div>
            <div className="flex items-center gap-3.5">
              <NiaMonogram size={48} />
              <div className="eyebrow text-[#E0A27F]">Conoce a {agent} · Concierge digital</div>
            </div>
            <h3 className="mt-5 font-serif text-[36px] font-normal leading-[1.08] md:text-[46px]">
              Planifica, reserva y pregunta, <em>en una sola conversación.</em>
            </h3>
            <p className="mt-4 max-w-[440px] text-[#C9CFD3]">
              {agent} conoce la casa, consulta disponibilidad real y puede reservar o gestionar el pago. Continúa en la web, WhatsApp o Instagram: ella recuerda.
            </p>
          </div>
          <div className="grid gap-2.5">
            {CAPABILITIES.map((c) => (
              <NiaCta key={c.label} detail={c.detail} className="flex items-center justify-between border border-[#2F3C4C] px-5 py-4 text-left transition-colors hover:border-durazno">
                <span>{c.label}</span>
                <span className="text-durazno">→</span>
              </NiaCta>
            ))}
          </div>
        </div>
      </section>

      {/* Pie */}
      <footer className="bg-noche text-[14px] text-[#B9BEC0]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-14">
          <div className="col-span-2 md:col-span-1">
            <AuraWordmark name={h.nombre} className="text-[34px] text-fondo" />
            <div className="mt-2.5 max-w-[260px]">{h.direccion}</div>
          </div>
          <div className="grid content-start gap-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-fondo">Estadía</span>
            <a href="#habitaciones">Habitaciones</a>
            <NiaCta detail={{ text: "¿Tienen ofertas o descuentos?" }} className="text-left">
              Ofertas
            </NiaCta>
            <NiaCta detail={{ text: "¿Venden tarjetas de regalo?" }} className="text-left">
              Tarjetas de regalo
            </NiaCta>
          </div>
          <div className="grid content-start gap-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-fondo">Descubre</span>
            <a href="#experiencias">Experiencias</a>
            <a href="#gastronomia">Gastronomía</a>
            <a href="#bienestar">Bienestar</a>
          </div>
          <div className="grid content-start gap-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-fondo">Contacto</span>
            <Link href="/canal/whatsapp">WhatsApp</Link>
            <Link href="/canal/instagram">Instagram</Link>
            <span>{h.correo}</span>
          </div>
          <div className="col-span-2 flex flex-wrap justify-between gap-3 border-t border-[#26323F] pt-5 text-[12px] md:col-span-4">
            <span>© {h.nombre} — hotel ficticio para fines de demostración · tarifas e impuestos de prueba</span>
            <span>
              {agent} · Con tecnología de Flowy AI ·{" "}
              <Link href="/consola" className="underline-offset-2 hover:underline">
                Consola demo
              </Link>
            </span>
          </div>
        </div>
      </footer>

      <WebAssistant agentName={agent} hotelName={h.nombre} />
    </div>
  );
}
