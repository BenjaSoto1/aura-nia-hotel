import { loadHotelPack } from "@/lib/hotel-pack";

export const metadata = { title: "Eliminación de datos · Aura" };

/** Instrucciones de eliminación de datos (Meta la exige para publicar la app). */
export default function EliminacionDeDatos() {
  const { hotel, agente } = loadHotelPack();
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[15px] leading-relaxed text-tinta">
      <h1 className="font-serif text-4xl text-oscuro">Eliminación de datos</h1>
      <p className="mt-2 text-gris">{hotel.nombre}</p>
      <p className="mt-6">Si conversaste con {agente.nombre} por Instagram, WhatsApp, Messenger o la web y quieres que eliminemos tus datos:</p>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        <li>
          Escríbenos a <a className="underline" href={`mailto:${hotel.correo}`}>{hotel.correo}</a> con el asunto «Eliminar mis datos», o envía el mensaje «eliminar mis datos» por el mismo canal donde conversaste.
        </li>
        <li>Indica tu usuario del canal (por ejemplo, tu @ de Instagram) o el correo/teléfono con que reservaste.</li>
        <li>Eliminaremos tus conversaciones y datos de contacto en un plazo máximo de 30 días y te confirmaremos por el mismo medio. Los datos que la ley obliga a conservar (por ejemplo, comprobantes de una estadía) se guardan solo por el plazo exigido.</li>
      </ol>
      <p className="mt-6">
        También puedes quitar el acceso de la app desde Instagram: Configuración → Apps y sitios web, o desde Facebook: Configuración → Apps y sitios web.
      </p>
      <p className="mt-10 text-[12px] text-gris">{hotel.nombre} es un hotel ficticio usado para demostración.</p>
    </main>
  );
}
