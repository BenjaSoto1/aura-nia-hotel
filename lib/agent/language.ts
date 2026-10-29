// Detección de idioma (español / inglés) por el texto del chat.
// Puntúa palabras frecuentes de cada idioma; si el mensaje no tiene señales claras
// (un nombre, un correo, "ok", una fecha) se mantiene el idioma actual de la conversación.

const EN = new Set(
  (
    "hi hello hey morning evening afternoon i i'm im i'd we we're want wanna would like need looking book booking booked " +
    "room rooms night nights the an for and with please thanks thank you is are do does can could my our your " +
    "people person guests adults kids children dog dogs pet pets what when where how much price prices cost available " +
    "availability yes yeah yep from to stay weekend there have has any about which one this that it pay paid card " +
    "cancel cancellation table dinner airport transfer bill checkout check-out tomorrow today two three four"
  ).split(" "),
);

const ES = new Set(
  (
    "hola buenas buenos dias días tardes noches quiero quisiera queremos necesito necesitamos busco reservar reserva " +
    "habitacion habitación habitaciones noche para por favor gracias con el la los las un una es son tienen tienes " +
    "aceptan acepta puedo podemos mi mis su personas persona adultos niños perro perros perrito mascota mascotas " +
    "cuanto cuánto cuesta precio precios disponible disponibilidad sí si de del al que qué como cómo cuando cuándo " +
    "fin semana hay algo cual cuál esta este pagar pago tarjeta cancelar mesa cena aeropuerto traslado cuenta salida " +
    "mañana hoy dos tres cuatro somos vamos estamos"
  ).split(" "),
);

export type Lang = "es" | "en";

export function scoreLanguage(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[¿?¡!.,;:()"“”]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let en = 0;
  let es = 0;
  for (const w of words) {
    if (EN.has(w)) en++;
    if (ES.has(w)) es++;
  }
  // Señales fuertes: tildes, ñ y signos de apertura solo existen en español
  if (/[ñáéíóú¿¡]/i.test(text)) es += 2;
  return { en, es };
}

export function detectLanguage(text: string, current: string): Lang {
  const { en, es } = scoreLanguage(text);
  if (en > es) return "en";
  if (es > en) return "es";
  return current === "en" ? "en" : "es";
}
