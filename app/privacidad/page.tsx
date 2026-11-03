import { loadHotelPack } from "@/lib/hotel-pack";

export const metadata = { title: "Política de privacidad · Aura" };

/** Política de privacidad (Meta la exige para publicar la app de Instagram / WhatsApp). */
export default function Privacidad() {
  const { hotel, agente } = loadHotelPack();
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[15px] leading-relaxed text-tinta">
      <h1 className="font-serif text-4xl text-oscuro">Política de privacidad</h1>
      <p className="mt-2 text-gris">{hotel.nombre} · {hotel.direccion}</p>

      <h2 className="mt-8 text-lg font-semibold text-oscuro">Qué datos tratamos</h2>
      <p className="mt-2">
        Cuando conversas con {agente.nombre}, la concierge digital de {hotel.nombre}, por la web, WhatsApp, Instagram o Messenger, guardamos los mensajes de la conversación,
        tu identificador en ese canal (por ejemplo, tu usuario de Instagram) y los datos que nos entregas para reservar: nombre, correo, teléfono, fechas y preferencias.
        No guardamos datos de tarjetas: los pagos se hacen en una página de pago segura de un proveedor externo. Las fotos que envíes por chat no se almacenan.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-oscuro">Para qué los usamos</h2>
      <p className="mt-2">
        Para responder tus consultas, cotizar y gestionar tu reserva y los servicios del hotel, enviarte confirmaciones, recordatorios de tu estadía y avisos de pago.
        No vendemos ni compartimos tus datos con terceros para publicidad.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-oscuro">Proveedores</h2>
      <p className="mt-2">
        Usamos proveedores para operar el servicio: Meta (Instagram, WhatsApp y Messenger), un proveedor de inteligencia artificial para redactar las respuestas,
        un proveedor de voz, el alojamiento del sitio, el envío de correos y la pasarela de pagos. Cada uno trata los datos solo para prestar su servicio.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-oscuro">Cuánto tiempo los guardamos</h2>
      <p className="mt-2">Mientras sea necesario para tu reserva y las obligaciones legales del hotel. Puedes pedir su eliminación en cualquier momento.</p>

      <h2 className="mt-6 text-lg font-semibold text-oscuro">Tus derechos</h2>
      <p className="mt-2">
        Puedes pedir acceso, corrección o eliminación de tus datos escribiendo a <a className="underline" href={`mailto:${hotel.correo}`}>{hotel.correo}</a> o
        siguiendo las instrucciones de <a className="underline" href="/eliminacion-de-datos">eliminación de datos</a>.
      </p>
      <p className="mt-10 text-[12px] text-gris">{hotel.nombre} es un hotel ficticio usado para demostración.</p>
    </main>
  );
}
