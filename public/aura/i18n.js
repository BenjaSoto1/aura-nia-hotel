// Idioma del sitio de Aura (diseño "Nía Mode"). El diseño está escrito en español; en inglés,
// este módulo traduce los textos visibles del DOM (fragmento a fragmento, tal como los pinta el
// runtime) con un diccionario exacto + reglas para textos con datos (fechas, precios, códigos).
// El idioma cambia con el botón ES/EN o solo, al detectar en qué idioma escribe o habla el huésped.
(function () {
  "use strict";

  var DICT = {
    // ---- navegación, hero y secciones
    "Habitaciones": "Rooms", "Experiencias": "Experiences", "Gastronomía": "Dining", "Bienestar": "Wellness",
    "Mi reserva": "My booking", "Reservar": "Book", "Caribe": "Caribbean", "24 habitaciones y suites": "24 rooms and suites",
    "Una casa serena": "A serene house", "frente al mar.": "by the sea.",
    "HABLAR CON NÍA": "TALK TO NÍA", "Reserva por voz, en tu idioma": "Book by voice, in your language",
    "Llegada": "Arrival", "Salida": "Departure", "Huéspedes": "Guests", "Habitación": "Room", "Cualquiera": "Any",
    "Habitación Deluxe": "Deluxe Room", "Habitación Vista al Mar": "Sea View Room", "Suite Vista al Mar": "Sea View Suite",
    "Ver disponibilidad": "Check availability", "Consultando…": "Checking…", "1 adulto": "1 adult",
    "La casa": "The house",
    "Veinticuatro habitaciones, una larga terraza y una cocina que sigue la pesca del día.": "Twenty-four rooms, a long terrace and a kitchen that follows the day's catch.",
    "Aura está construida en piedra caliza local y madera clara, abierta a los vientos alisios. Lo bastante pequeña para saber tu nombre.": "Aura is built of local limestone and pale wood, open to the trade winds. Small enough to know your name.",
    "VER TODAS": "VIEW ALL", "Desde": "From",
    "Muros encalados, cama king y terraza privada con sombra.": "Whitewashed walls, a king bed and a shaded private terrace.",
    "Balcón orientado al oeste sobre la bahía, hecho para atardeceres.": "West-facing balcony over the bay, made for sunsets.",
    "Sala independiente, terraza envolvente y piscina privada.": "Separate living room, wraparound terrace and private pool.",
    "Terraza · Ducha lluvia · Espresso": "Terrace · Rain shower · Espresso", "Vista al mar · Tina · Balcón": "Sea view · Bathtub · Balcony",
    "Piscina privada · Sala · Mayordomo": "Private pool · Living room · Butler",
    "Días pensados": "Days designed", "para ti.": "for you.",
    "Navegación al atardecer": "Sunset sail", "Dos horas en el agua, con champaña.": "Two hours on the water, with champagne.",
    "Cena privada": "Private dinner", "Un menú degustación en la arena, solo para ti.": "A tasting menu on the sand, just for you.",
    "Spa y bienestar": "Spa & wellness", "Tratamientos al aire libre y yoga al amanecer.": "Open-air treatments and sunrise yoga.",
    "Excursión a la isla": "Island excursion", "Calas escondidas y guías locales en bote.": "Hidden coves and local guides by boat.",
    "Sal, humo y cítricos en Brasa.": "Salt, smoke and citrus at Brasa.",
    "Cocina a fuego abierto en la terraza. Desayuno hasta el mediodía, cena junto al agua.": "Open-fire cooking on the terrace. Breakfast until noon, dinner by the water.",
    "Reservar mesa": "Book a table", "Rituales lentos, aire de mar.": "Slow rituals, sea air.",
    "Salas de tratamiento al aire libre, yoga al amanecer y piscina fría frente a la bahía.": "Open-air treatment rooms, sunrise yoga and a cold plunge facing the bay.",
    "Reservar un ritual": "Book a ritual", "Destino": "Destination",
    "A veinte minutos del aeropuerto.": "Twenty minutes from the airport.", "A un mundo de todo lo demás.": "A world away from everything else.",
    "Conoce a Nía": "Meet Nía", "Concierge digital": "Digital concierge",
    "Planifica, reserva y pregunta,": "Plan, book and ask,", "en una sola conversación.": "in a single conversation.",
    "Nía conoce la casa, consulta disponibilidad real y puede reservar o gestionar el pago. Continúa en la web, WhatsApp o Instagram: ella recuerda.": "Nía knows the house, checks real availability and can book or handle payment. Continue on the web, WhatsApp or Instagram: she remembers.",
    "Consultar disponibilidad en tiempo real": "Check real-time availability", "Reservar una habitación o una mesa": "Book a room or a table",
    "Sumar experiencias a tu estadía": "Add experiences to your stay", "Hablar con una persona de recepción": "Talk to someone at the front desk",
    "Calle del Faro 12, Costa Norte, Caribe": "12 Calle del Faro, North Coast, Caribbean",
    "Estadía": "Stay", "Ofertas": "Offers", "Tarjetas de regalo": "Gift cards", "Descubre": "Discover", "Contacto": "Contact",
    "© Aura — hotel ficticio para fines de demostración": "© Aura — fictional hotel for demo purposes", "tarifas e impuestos de prueba": "test rates and taxes",
    "Con tecnología de Flowy AI": "Powered by Flowy AI",
    "¿Te muestro Aura": "Shall I show you Aura", "conversando?": "in conversation?",
    "Pregúntame por habitaciones, Brasa o el atardecer, y el hotel te lo muestra.": "Ask me about rooms, Brasa or the sunset, and the hotel shows you.",
    "Empezar con Nía": "Start with Nía", "Seguir navegando": "Keep browsing",
    // ---- Nía Mode: escenas
    "Bienvenida": "Welcome", "Al atardecer": "At sunset", "Tu estadía": "Your stay", "Reserva": "Booking", "Volver al sitio": "Back to site",
    "¿Qué te gustaría": "What would you like", "descubrir de Aura?": "to discover at Aura?",
    "Pregúntale a Nía por las habitaciones, Brasa o el atardecer. Aura te lo muestra.": "Ask Nía about the rooms, Brasa or the sunset. Aura shows you.",
    "Tres maneras de": "Three ways to", "quedarse.": "stay.", "/ noche": "/ night", "Ver esta habitación": "View this room", "Reservarla": "Book it",
    "Cena junto al agua": "Dinner by the water", "Cocina a fuego abierto en la terraza.": "Open-fire cooking on the terrace.", "Esta noche": "Tonight",
    "En tu estadía": "In your stay", "Ver mi estadía →": "See my stay →", "Menú de la noche": "Tonight's menu", "Desliza →": "Swipe →",
    "Tu mesa": "Your table", "Mesa": "Table", "Junto al": "By the", "agua.": "water.", "Reservar esta mesa →": "Book this table →",
    "Camarones en caldo de hinojo": "Shrimp in fennel broth", "Caldo de azafrán, hinojo confitado y eneldo.": "Saffron broth, confit fennel and dill.", "Del mar": "From the sea",
    "Miso del mar": "Sea miso", "Langostinos, tofu sedoso, shiitake y algas.": "Prawns, silken tofu, shiitake and seaweed.", "Para empezar": "To start",
    "Tom yum de langostinos": "Prawn tom yum", "Lima, ají, hierba limón y champiñones.": "Lime, chili, lemongrass and mushrooms.", "Picante": "Spicy",
    "Camarones fríos": "Chilled shrimp", "Alioli de cítricos y albahaca de la huerta.": "Citrus aioli and garden basil.", "Para compartir": "To share",
    "Langostinos al coco": "Coconut prawns", "Curry suave de coco, cilantro y hoja de plátano.": "Mild coconut curry, cilantro and banana leaf.", "De la casa": "House specialty",
    "Pato a la brasa": "Ember-grilled duck", "Piel crujiente, vegetales del fuego y brotes.": "Crispy skin, fire-roasted vegetables and sprouts.", "De la parrilla": "From the grill",
    "¿Te lo reservo con tu mesa de esta noche?": "Shall I add it to your table tonight?",
    "Al caer el sol": "As the sun sets", "Una hora dorada": "A golden hour", "solo para ti.": "just for you.",
    "“Hoy el sol se pone a las 17:48. Tengo tres formas de vivirlo.”": "“Today the sun sets at 17:48. I have three ways to live it.”",
    "También esta tarde": "Also this evening", "Navegación en velero": "Sailboat cruise", "Recomendado por Nía": "Recommended by Nía",
    "Salida 17:15": "Departs 17:15", "Duración": "Duration", "Incluye": "Includes", "Capacidad": "Capacity", "Hora": "Time", "Menú": "Menu",
    "Horario": "Hours", "Carta": "Menu", "sol 17:48": "sunset 17:48", "2 horas": "2 hours",
    "Capitán, champaña y bocados del mar": "Captain, champagne and sea bites", "Hasta 6 personas": "Up to 6 people",
    "Cena en la arena": "Dinner on the sand", "Privada": "Private", "Desde 18:00": "From 18:00", "Tres tiempos de Brasa": "Three courses from Brasa",
    "Mesa privada, farol y maridaje": "Private table, lantern and wine pairing", "2 personas": "2 people",
    "Cóctel en la terraza": "Terrace cocktail", "Sin reserva previa": "No booking needed", "Coctelería de autor con ron local": "Signature cocktails with local rum",
    "Dos cócteles y bocados": "Two cocktails and bites", "Mesas para 2 a 4": "Tables for 2 to 4",
    "Agregar a mi estadía": "Add to my stay", "Pedírselo a Nía": "Ask Nía",
    "Inhala…": "Breathe in…", "Exhala…": "Breathe out…", "Por la nariz": "Through the nose", "Suelta despacio": "Let it go slowly",
    "Ir directo a los rituales →": "Skip to the rituals →", "Rituales frente al mar": "Seaside rituals", "Respira.": "Breathe.", "El resto puede esperar.": "Everything else can wait.",
    "Piedras calientes": "Hot stones", "Masaje en sala abierta": "Open-air massage", "Baño de flores y cítricos": "Flower & citrus bath", "Yoga al amanecer": "Sunrise yoga",
    "Piedras volcánicas tibias, aceite de coco y orquídea. Para soltar la espalda y el sueño pendiente.": "Warm volcanic stones, coconut and orchid oil. To release your back and catch up on sleep.",
    "Masaje profundo en una sala de madera abierta al verde, con brisa y luz natural.": "Deep massage in a wooden room open to the greenery, with breeze and natural light.",
    "Tina preparada en tu habitación con flores, limón y una copa de vino blanco.": "A bath drawn in your room with flowers, lemon and a glass of white wine.",
    "Práctica guiada frente al mar con la primera luz. Esteras y agua de coco incluidas.": "Guided practice by the sea at first light. Mats and coconut water included.",
    "Amanecer": "Sunrise", "Tarde": "Afternoon", "Atardecer": "Sunset", "Reservar ritual": "Book ritual", "Sonido del mar": "Sea sound",
    "Tu estadía en Aura": "Your stay at Aura", "Una estadía": "A stay", "a tu medida.": "made for you.",
    "Cena": "Dinner", "Cena en Brasa": "Dinner at Brasa", "+ Sumar": "+ Add", "Reservar esta estadía": "Book this stay",
    // ---- panel de reserva
    "Tu estadía,": "Your stay,", "lista para confirmar.": "ready to confirm.", "Fechas": "Dates",
    "Sin experiencias por ahora": "No experiences yet", "Estimado · impuestos de prueba": "Estimate · test taxes",
    "Total · impuestos de prueba incluidos": "Total · test taxes included",
    "Nombre completo": "Full name", "Correo": "Email", "Teléfono (+56 9…)": "Phone (+1 …)",
    "Flexible · pagas en el hotel": "Flexible · pay at the hotel", "Prepago −12%": "Prepaid −12%",
    "Cancelación gratis hasta 48 h antes": "Free cancellation until 48 h before", "No reembolsable · pago seguro ahora": "Non-refundable · secure payment now",
    "Reservando…": "Booking…", "Reservar y pagar seguro": "Book and pay securely", "Confirmar reserva": "Confirm booking", "Ajustar estadía": "Adjust stay",
    "El pago siempre es un botón seguro. Nunca compartas tu tarjeta en el chat.": "Payment is always a secure button. Never share your card in the chat.",
    "Escribe tu nombre completo.": "Please enter your full name.", "Revisa tu correo: ahí llega la confirmación.": "Check your email: the confirmation goes there.",
    "Escribe tu teléfono con código de país.": "Enter your phone number with country code.", "La salida debe ser después de la llegada.": "Check-out must be after check-in.",
    "No pude completar la reserva.": "I couldn't complete the booking.", "Se perdió la conexión. Intenta de nuevo.": "Connection lost. Please try again.",
    "Esta habitación no está disponible en esas fechas. Elige otra.": "This room isn't available for those dates. Please pick another.",
    "pendiente de pago": "pending payment", "Tu habitación,": "Your room,", "guardada 30 minutos.": "held for 30 minutes.",
    "Paga con el botón seguro. En cuanto se confirme el pago, la confirmación llega a": "Pay with the secure button. As soon as payment is confirmed, the confirmation goes to",
    "Pagar": "Pay", "de forma segura": "securely", "Esperando la confirmación del pago…": "Waiting for payment confirmation…",
    "Reserva confirmada": "Booking confirmed", "Te esperamos,": "See you on", ". La confirmación va camino a": ". The confirmation is on its way to", "tu correo": "your email",
    "Volver a Aura": "Back to Aura", "Modificar o cancelar": "Modify or cancel",
    "Disponible": "Available", "Disponibilidad": "Availability", "Agotada": "Sold out",
    // ---- panel de Nía
    "Escribe a Nía…": "Write to Nía…", "Conectando con Nía…": "Connecting to Nía…", "Nía está hablando…": "Nía is speaking…",
    "Nía te escucha · toca el micrófono para terminar": "Nía is listening · tap the mic to end", "Terminar la voz": "End voice", "Hablar con Nía por voz": "Talk to Nía by voice",
    "Necesito permiso para usar el micrófono.": "I need permission to use the microphone.", "La voz no está configurada en este sitio.": "Voice is not configured on this site.",
    "Reservar con Nía": "Book with Nía", "Modo inmersivo ↗": "Immersive mode ↗", "Consultar disponibilidad": "Check availability", "Experiencias y servicios": "Experiences & services", "Mensaje para Nía": "Message for Nía", "Chat con Nía": "Chat with Nía", "Chatear con Nía": "Chat with Nía", "Enviar": "Send", "Ver fechas": "Check dates", "Hola, soy Nía, la concierge de Aura. ¿En qué te ayudo?": "Hi, I'm Nía, Aura's concierge. How can I help?", "Cerrar": "Close", "Cambiar idioma": "Change language",
    // ---- mensajes y sugerencias de la coreografía
    "Hola. ¿Qué te gustaría descubrir de Aura?": "Hi. What would you like to discover at Aura?",
    "Claro. Vamos a verlas.": "Of course. Let's take a look.",
    "Si buscas algo especial para una escapada en pareja, te recomendaría la Vista al Mar.": "If you're looking for something special for a getaway for two, I'd recommend the Sea View.",
    "Te llevaría a Brasa.": "I'd take you to Brasa.",
    "Brasa es nuestra cocina frente al agua. Si quieres, puedo reservarte una mesa para esta noche.": "Brasa is our kitchen by the water. If you like, I can book you a table for tonight.",
    "Entonces tengo una idea.": "Then I have an idea.",
    "Dos horas en el agua, justo cuando el sol comienza a bajar. ¿Quieres que la agregue a tu estadía?": "Two hours on the water, just as the sun begins to set. Shall I add it to your stay?",
    "Antes de elegir, respira conmigo.": "Before choosing, breathe with me.",
    "Ahora sí. Estos son nuestros rituales. Pasa por cada uno y te cuento.": "Now then. These are our rituals. Go through each one and I'll tell you about it.",
    "Puedo ayudarte a armar una estadía a tu medida.": "I can help you put together a stay made for you.",
    "Esto es lo que llevamos. Toca cualquier momento para sumarlo o quitarlo.": "Here's what we have so far. Tap any moment to add or remove it.",
    "Perfecto. Organicemos tu estadía.": "Perfect. Let's organize your stay.",
    "Revisa los detalles. El pago siempre es un botón seguro, nunca compartas tu tarjeta en el chat.": "Review the details. Payment is always a secure button; never share your card in the chat.",
    "Las calas se recorren en bote, con guías locales. Si quieres, la sumo a tu estadía o te muestro el atardecer.": "The coves are explored by boat, with local guides. If you like, I can add it to your stay or show you the sunset.",
    "Ver habitaciones": "See rooms", "Descubrir experiencias": "Discover experiences", "Conocer Brasa": "Discover Brasa", "Planear mi estadía": "Plan my stay",
    "Quiero algo especial para el atardecer": "I want something special for sunset", "¿Dónde puedo cenar?": "Where can I have dinner?",
    "Quiero reservar": "I want to book", "¿Y si quiero relajarme?": "What if I want to relax?",
    "Quiero ver mi reserva": "I want to see my booking", "Muéstrame las habitaciones": "Show me the rooms",
    "Cuéntame de la excursión a la isla": "Tell me about the island excursion", "Ver mi estadía": "See my stay",
    "Quiero modificar o cancelar mi reserva": "I want to modify or cancel my booking",
    "Listo. La navegación ya es parte de tu estadía. ¿Quieres que te muestre cómo va quedando?": "Done. The sail is now part of your stay. Want me to show you how it's coming together?",
    "Reservado. Un ritual al aire libre te espera durante tu estadía.": "Booked. An open-air ritual awaits you during your stay.",
    "Te esperamos sin prisa.": "We'll be waiting, no rush.", "Un anfitrión te confirmará los detalles.": "A host will confirm the details.",
    "Perdón, perdí la conexión un momento. ¿Me lo repites?": "Sorry, I lost the connection for a moment. Could you say that again?",
    "Pagar de forma segura →": "Pay securely →", "Abrir →": "Open →", "Pago seguro": "Secure payment",
  };

  function g(x) { var t = trCore(x); return t == null ? x : t; }
  var RULES = [
    [/^(\d) adultos$/, "$1 adults"],
    [/^Hasta (\d) huéspedes$/, "Up to $1 guests"],
    [/^Máx\. (\d) huéspedes$/, "Max. $1 guests"],
    [/^quedan (\d+)$/, "$1 left"],
    [/^(\d+) noches?$/, function (m, n) { return n + (n === "1" ? " night" : " nights"); }],
    [/^Desde (.+)$/, function (m, x) { return "From " + x; }],
    [/^(.+) \/ noche$/, "$1 / night"],
    [/^Quiero reservar la (.+)$/, function (m, r) { return "I want to book the " + g(r); }],
    [/^Hecho\. Te reservé una mesa en Brasa a las (.+), junto al agua\.$/, "Done. I booked you a table at Brasa at $1, by the water."],
    [/^Te guardo la habitación 30 minutos\. Cuando pagues, tu reserva (\S+) queda confirmada y te llega el correo\.$/, "I'm holding the room for 30 minutes. Once you pay, booking $1 is confirmed and the email is sent."],
    [/^Listo\. Tu reserva (\S+) está confirmada y la confirmación va camino a (.+)\. Te esperamos\.$/, "Done. Booking $1 is confirmed and the confirmation is on its way to $2. See you soon."],
    [/^Pago recibido\. Tu reserva (\S+) está confirmada; la confirmación va camino a (.+)\.$/, "Payment received. Booking $1 is confirmed; the confirmation is on its way to $2."],
  ];

  var HAS_WORD = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/;

  function trCore(c) {
    if (Object.prototype.hasOwnProperty.call(DICT, c)) return DICT[c];
    for (var i = 0; i < RULES.length; i++) {
      var m = c.match(RULES[i][0]);
      if (m) return typeof RULES[i][1] === "function" ? RULES[i][1].apply(null, m) : c.replace(RULES[i][0], RULES[i][1]);
    }
    // Textos compuestos con " · ": se traduce cada tramo conocido y se respetan los separadores.
    if (c.indexOf("·") >= 0) {
      var parts = c.split(/(\s*·\s*)/), changed = false;
      for (var j = 0; j < parts.length; j += 2) {
        if (!parts[j]) continue;
        var t = trCore(parts[j]);
        if (t != null) { parts[j] = t; changed = true; }
      }
      if (changed) return parts.join("");
    }
    return null;
  }

  var lang = "es";
  try {
    var q = new URLSearchParams(location.search).get("lang");
    lang = q === "en" || q === "es" ? q : localStorage.getItem("aura-lang") === "en" ? "en" : "es";
  } catch (e) {}

  /** Traduce un texto del diseño al idioma actual (deja intacto lo que no conoce). */
  function tr(s) {
    if (lang !== "en" || typeof s !== "string" || !HAS_WORD.test(s)) return s;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var out = trCore(m[2]);
    return out == null ? s : m[1] + out + m[3];
  }

  // ---------------- DOM ----------------
  var ATTRS = ["placeholder", "title", "aria-label"];
  var texts = new Map(); // nodo de texto -> { es, en }
  var attrs = []; // [{ el, name, es, en }]
  var observer = null;

  function visitText(n) {
    var v = n.nodeValue, rec = texts.get(n);
    if (rec && rec.en === v) return;
    var t = tr(v);
    if (t !== v) { texts.set(n, { es: v, en: t }); n.nodeValue = t; }
    else if (rec) texts.delete(n);
  }
  function visitAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (v == null) continue;
      var t = tr(v);
      if (t !== v) { attrs.push({ el: el, name: a, es: v, en: t }); el.setAttribute(a, t); }
    }
  }
  function skip(el) { var t = el.tagName; return t === "SCRIPT" || t === "STYLE" || t === "TEXTAREA" || el.isContentEditable; }
  function walk(root) {
    if (root.nodeType === 3) { if (root.parentNode && !skip(root.parentNode)) visitText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    visitAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeType === 1 && skip(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) visitText(n); else visitAttrs(n); }
  }

  function start() {
    if (observer || !document.body) return;
    walk(document.body);
    observer = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === "characterData") visitText(r.target);
        else if (r.type === "attributes") visitAttrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    texts.forEach(function (rec, n) { if (n.nodeValue === rec.en) n.nodeValue = rec.es; });
    texts.clear();
    attrs.forEach(function (a) { if (a.el.getAttribute(a.name) === a.en) a.el.setAttribute(a.name, a.es); });
    attrs = [];
  }

  // ---------------- detección por lo que escribe / dice el huésped ----------------
  // Misma idea que lib/agent/language.ts: palabras frecuentes de cada idioma; sin señales claras no cambia.
  var EN = ("hi hello hey morning evening afternoon i i'm im i'd we we're want wanna would like need looking book booking booked room rooms night nights the an for and with please thanks thank you is are do does can could my our your people person guests adults kids children what when where how much price prices cost available availability yes yeah from to stay weekend there have has any about which one this that it pay cancel table dinner airport transfer show tell see sunset relax").split(" ");
  var ES = ("hola buenas buenos dias días tardes noches quiero quisiera queremos necesito busco reservar reserva habitacion habitación habitaciones noche para por favor gracias con el la los las un una es son tienen tienes puedo podemos mi mis su personas adultos niños cuanto cuánto cuesta precio disponible disponibilidad sí si de del al que qué como cómo cuando cuándo hay algo cual cuál esta este pagar cancelar mesa cena mañana hoy somos vamos muéstrame cuéntame atardecer relajarme").split(" ");
  function detect(text) {
    var words = String(text || "").toLowerCase().replace(/[¿?¡!.,;:()"“”]/g, " ").split(/\s+/), en = 0, es = 0;
    words.forEach(function (w) { if (EN.indexOf(w) >= 0) en++; if (ES.indexOf(w) >= 0) es++; });
    if (/[ñáéíóú¿¡]/i.test(text)) es += 2;
    return en > es ? "en" : es > en ? "es" : null;
  }

  var listeners = [];
  function set(l) {
    l = l === "en" ? "en" : "es";
    if (l === lang) return;
    lang = l;
    try { localStorage.setItem("aura-lang", l); } catch (e) {}
    document.documentElement.lang = l;
    if (l === "en") start(); else stop();
    listeners.forEach(function (fn) { try { fn(l); } catch (e) {} });
  }

  document.documentElement.lang = lang;
  if (lang === "en") {
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  }

  window.AuraI18n = {
    get lang() { return lang; },
    set: set,
    tr: tr,
    /** Cambia el idioma si el texto del huésped lo indica con claridad. */
    observe: function (text) { var d = detect(text); if (d) set(d); return d; },
    detect: detect,
    onChange: function (fn) { listeners.push(fn); },
  };
})();
