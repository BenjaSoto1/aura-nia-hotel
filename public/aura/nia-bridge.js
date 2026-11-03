// Puente entre el sitio de Aura (diseño "Nía Mode", runtime de Claude Design) y el cerebro del hotel.
// - chat():  mensajes escritos -> /api/channels/web/message (mismo core que WhatsApp, Instagram, etc.)
// - book():  panel "Tu estadía" -> /api/aura/book (reserva real + correo de confirmación)
// - service(): mesa, atardecer y rituales -> /api/aura/service (servicio real + correo)
// - voice:   agente de ElevenLabs (WebRTC) cuyas client tools llaman a /api/tools/<nombre>
(function () {
  "use strict";

  var ELEVENLABS_CLIENT = "https://esm.sh/@elevenlabs/client@1.26.0";
  var VOICE_TOOLS = [
    "check_availability", "quote", "create_reservation", "create_payment_link", "preauthorize",
    "get_my_reservations", "book_service", "get_folio", "start_checkin", "checkout",
    "modify_reservation", "cancel_reservation", "send_to_whatsapp", "escalate_to_human",
  ];

  function sessionId() {
    var id = null;
    try { id = localStorage.getItem("aura-web-id"); } catch (e) {}
    if (!id) {
      id = "web-" + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem("aura-web-id", id); } catch (e) {}
    }
    return id;
  }
  var SID = sessionId();

  function isEn() { return !!(window.AuraI18n && window.AuraI18n.lang === "en"); }
  function L(es, en) { return isEn() ? en : es; }

  function money(cents) {
    return "$" + Math.round(cents / 100).toLocaleString("en-US");
  }

  function postJSON(url, body) {
    return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  /** Convierte las partes del core en mensajes del panel de Nía y botones rápidos. */
  function partsToUi(parts) {
    var messages = [], buttons = [];
    (parts || []).forEach(function (p) {
      // *negrita* es formato de WhatsApp: en el sitio se muestra el texto limpio.
      if (p.type === "text") messages.push({ text: p.text.replace(/\*([^*\n]+)\*/g, "$1") });
      else if (p.type === "rate_cards") {
        messages.push({ text: p.items.map(function (i) { return "· " + i.label + " — " + money(i.totalCents) + " (" + i.nights + (i.nights === 1 ? L(" noche", " night") : L(" noches", " nights")) + ")"; }).join("\n") });
        p.items.forEach(function (i) { if (i.quoteId) buttons.push({ id: "pick:" + i.quoteId, label: i.label }); });
      } else if (p.type === "cards") {
        // Galería con foto (habitaciones): tarjetas dentro del mensaje, cada una con su botón.
        messages.push({
          text: "",
          cards: p.items.map(function (c) {
            var b = (c.buttons || []).filter(function (x) { return x.id; })[0];
            return { img: c.image || "", title: c.title, sub: (c.subtitle || "").split("\n")[0], btn: b ? { id: b.id, label: b.title } : null };
          }),
        });
      } else if (p.type === "buttons") p.items.forEach(function (b) { buttons.push({ id: b.id, label: b.title }); });
      else if (p.type === "payment_link") messages.push({ text: (p.label || L("Pago seguro", "Secure payment")) + " · " + money(p.amountCents), link: p.url, linkLabel: L("Pagar de forma segura →", "Pay securely →") });
      else if (p.type === "link") messages.push({ text: p.title, link: p.url, linkLabel: L("Abrir →", "Open →") });
      else if (p.type === "reservation_summary") messages.push({ text: L("Reserva ", "Booking ") + p.reservationCode + (p.lines && p.lines.length ? " · " + p.lines.join(" · ") : "") });
    });
    return { messages: messages, buttons: buttons };
  }

  function chat(payload) {
    return postJSON("/api/channels/web/message", Object.assign({ channelUserId: SID }, payload)).then(function (r) {
      return partsToUi(r.parts);
    });
  }

  function book(payload) {
    return postJSON("/api/aura/book", Object.assign({ sessionId: SID, lang: isEn() ? "en" : "es" }, payload));
  }

  /** Experiencia del sitio (mesa, atardecer, ritual): se reserva de verdad si el huésped ya tiene reserva. */
  function service(payload) {
    return postJSON("/api/aura/service", Object.assign({ sessionId: SID, lang: isEn() ? "en" : "es" }, payload));
  }

  /** Disponibilidad y precios reales (solo lectura) para el buscador del hero y el panel de reserva. */
  function availability(checkIn, checkOut, guests) {
    var q = "checkIn=" + encodeURIComponent(checkIn) + "&checkOut=" + encodeURIComponent(checkOut) + "&guests=" + (guests || 2) + "&lang=" + (isEn() ? "en" : "es");
    return fetch("/api/aura/availability?" + q, { cache: "no-store" }).then(function (r) { return r.json(); });
  }

  function reservationStatus(code) {
    return fetch("/api/reservation-status?code=" + encodeURIComponent(code), { cache: "no-store" }).then(function (r) { return r.json(); });
  }

  // ---------------- Voz (ElevenLabs) ----------------
  var conv = null;
  var voiceState = "off";

  function log(role, text) {
    postJSON("/api/channels/web/log", { channelUserId: SID, role: role, text: text }).catch(function () {});
  }

  function context() {
    return fetch("/api/status").then(function (r) { return r.json(); }).catch(function () { return {}; }).then(function (s) {
      var today = new Date(s.today || Date.now());
      var fecha = today.toLocaleString("es-ES", { timeZone: "America/Puerto_Rico", dateStyle: "full", timeStyle: "short" });
      var iso = today.toLocaleDateString("en-CA", { timeZone: "America/Puerto_Rico" });
      return "Contexto del sistema. Fecha y hora del hotel: " + fecha + " (hoy es " + iso + "). Solo se reserva desde hoy en adelante: si el huésped dice un día y mes sin año, usa la próxima vez que ocurra a partir de hoy. " +
        "Canal: asistente de voz del sitio web de Aura. Identificador de sesión: " + SID + ". " +
        "El sitio cambia solo de ambiente según el tema (habitaciones, Brasa, atardecer, bienestar); acompaña con frases cortas. " +
        "Usa siempre las herramientas para disponibilidad, precios y reservas; las opciones y el botón de pago aparecen en el panel de la pantalla. " +
        "Pide nombre, correo y teléfono de a uno. Para el correo, pídele que lo escriba en el chat de la pantalla (llega como mensaje de texto) y confírmalo leyéndolo una vez. " +
        "Nunca dictes ni pidas datos de tarjeta. Haz una sola pregunta por turno. " + langNote();
    });
  }

  function langNote() {
    return isEn()
      ? "Idioma: el huésped está usando el sitio en inglés; háblale en inglés salvo que él hable en español."
      : "Idioma: el huésped está usando el sitio en español; responde en el idioma en que te hable.";
  }

  function voiceAvailable() {
    return fetch("/api/elevenlabs/session?probe=1", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.provider === "elevenlabs"; })
      .catch(function () { return false; });
  }

  // ---------------- Respaldo: voz del navegador (si ElevenLabs no inicia: sin créditos, caído) ----------------
  var FALLBACK_KEY = "aura-voice-fallback";
  var bv = null; // { active, busy, rec, h }
  var cancelStart = null; // corta un inicio de ElevenLabs en curso (sin activar el respaldo)

  function elevenDown() {
    try { return Date.now() - Number(sessionStorage.getItem(FALLBACK_KEY) || 0) < 30 * 60000; } catch (e) { return false; }
  }
  function markElevenDown() {
    try { sessionStorage.setItem(FALLBACK_KEY, String(Date.now())); } catch (e) {}
  }

  function spokenText(parts) {
    var out = [], options = false;
    (parts || []).forEach(function (p) {
      if (p.type === "text") out.push(p.text);
      else if (p.type === "rate_cards" || p.type === "cards" || p.type === "buttons") options = true;
      else if (p.type === "payment_link") out.push(L("Te dejé el botón de pago seguro en la pantalla.", "I've put the secure payment button on screen."));
    });
    var s = out.join(" ").replace(/https?:\/\/\S+/g, "").replace(/[*_#]/g, "").replace(/\s+/g, " ").trim();
    if (options && !/pantalla|screen/i.test(s)) s += L(" Te muestro las opciones en pantalla.", " I'm showing the options on screen.");
    return s;
  }

  function bvSpeak(text) {
    return new Promise(function (resolve) {
      if (!bv || !bv.active || !text || !window.speechSynthesis) return resolve();
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var code = isEn() ? "en-US" : "es-ES";
      u.lang = code;
      var voices = window.speechSynthesis.getVoices() || [];
      var v = voices.filter(function (x) { return x.lang === code; })[0] || voices.filter(function (x) { return x.lang.indexOf(isEn() ? "en" : "es") === 0; })[0];
      if (v) u.voice = v;
      u.rate = 1.03;
      u.onend = resolve;
      u.onerror = resolve;
      bv.h.onMode && bv.h.onMode("speaking");
      window.speechSynthesis.speak(u);
    }).then(function () { if (bv && bv.active) bv.h.onMode && bv.h.onMode("listening"); });
  }

  function bvAsk(payload) {
    if (!bv) return Promise.resolve();
    bv.busy = true;
    try { if (bv.rec) bv.rec.abort(); } catch (e) {}
    return postJSON("/api/channels/web/message", Object.assign({ channelUserId: SID }, payload))
      .then(function (r) {
        var parts = r.parts || [];
        if (bv && bv.h.onParts && parts.length) bv.h.onParts(parts);
        return bvSpeak(spokenText(parts));
      })
      .catch(function () { return bvSpeak(L("Perdón, perdí la conexión un momento.", "Sorry, I lost the connection for a moment.")); })
      .then(function () { if (bv) { bv.busy = false; bvListen(); } });
  }

  function bvListen() {
    if (!bv || !bv.active || bv.busy) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new SR();
    bv.rec = rec;
    rec.lang = isEn() ? "en-US" : "es-ES";
    rec.interimResults = false;
    rec.continuous = false;
    var heard = "";
    rec.onresult = function (e) { heard = (e.results[0] && e.results[0][0] && e.results[0][0].transcript) || ""; };
    rec.onerror = function (e) {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        var h = bv && bv.h; stopVoice();
        h && h.onError && h.onError(L("Necesito permiso para usar el micrófono.", "I need permission to use the microphone."));
      }
    };
    rec.onend = function () {
      if (!bv || !bv.active || bv.busy) return;
      var text = heard.trim();
      if (!text) return setTimeout(bvListen, 200);
      log("user", text);
      bv.h.onMessage && bv.h.onMessage("user", text);
      bvAsk({ text: text });
    };
    try { rec.start(); bv.h.onMode && bv.h.onMode("listening"); } catch (e) {}
  }

  function startBrowserVoice(h) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) {
      voiceState = "off";
      h.onStatus && h.onStatus("off");
      h.onError && h.onError(L("La voz no está disponible en este navegador. Prueba con Chrome o escríbeme por el chat.", "Voice isn't available in this browser. Try Chrome or type to me in the chat."));
      return;
    }
    bv = { active: true, busy: false, rec: null, h: h };
    voiceState = "on";
    h.onStatus && h.onStatus("on");
    bvSpeak(L("Hola, soy Nía. ¿En qué te ayudo?", "Hi, I'm Nía. How can I help?")).then(bvListen);
  }

  /**
   * handlers: onMessage(role "user"|"agent", text), onParts(parts), onStatus("connecting"|"on"|"off"),
   *           onMode("speaking"|"listening"), onError(msg),
   *           onTool(name, params, result, parts): cada herramienta que usa la voz (para llenar el panel de reserva)
   * Usa ElevenLabs; si no logra iniciar (sin créditos, caído), sigue con la voz del navegador y el mismo cerebro.
   */
  function startVoice(h) {
    if (conv || bv) return Promise.resolve();
    voiceState = "connecting";
    h.onStatus && h.onStatus("connecting");
    if (elevenDown()) { startBrowserVoice(h); return Promise.resolve(); }
    var connectedAt = null, stopped = false, fell = false;
    var fallback = function () {
      if (fell || stopped) return;
      fell = true;
      markElevenDown();
      var c = conv; conv = null;
      if (c) try { c.endSession().catch(function () {}); } catch (e) {}
      startBrowserVoice(h);
    };
    var early = function () { return connectedAt === null || Date.now() - connectedAt < 6000; };
    cancelStart = function () { stopped = true; };
    var tools = {};
    VOICE_TOOLS.forEach(function (name) {
      tools[name] = function (params) {
        return postJSON("/api/tools/" + name, { channel: "web", channelUserId: SID, input: params || {} }).then(function (d) {
          if (d.parts && d.parts.length && h.onParts) h.onParts(d.parts);
          // El diseño acompaña a la voz: fechas, habitación, precio y reserva aparecen en el panel.
          if (h.onTool) { var res = null; try { res = JSON.parse(d.result); } catch (e) {} try { h.onTool(name, params || {}, res, d.parts || []); } catch (e) {} }
          return d.result;
        });
      };
    });
    return fetch("/api/elevenlabs/session", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s.provider !== "elevenlabs" || (s.error && !s.agentId)) throw new Error("fallback");
        return import(ELEVENLABS_CLIENT).then(function (mod) {
          var opts = {
            connectionType: "webrtc",
            userId: SID,
            clientTools: tools,
            onConnect: function () { connectedAt = Date.now(); voiceState = "on"; h.onStatus && h.onStatus("on"); },
            onDisconnect: function () {
              if (!stopped && early()) return fallback();
              conv = null; voiceState = "off"; h.onStatus && h.onStatus("off");
            },
            onError: function (e) {
              if (!stopped && early()) return fallback();
              h.onError && h.onError(typeof e === "string" ? e : (e && e.message) || "Error de voz");
            },
            onModeChange: function (m) { h.onMode && h.onMode(m.mode); },
            onMessage: function (m) {
              var role = (m.role || m.source) === "user" ? "user" : "agent";
              if (!m.message || !m.message.trim()) return;
              log(role, m.message);
              h.onMessage && h.onMessage(role, m.message);
            },
          };
          if (s.conversationToken) opts.conversationToken = s.conversationToken;
          else opts.agentId = s.agentId;
          return mod.Conversation.startSession(opts);
        });
      })
      .then(function (c) {
        if (fell || stopped) { try { c.endSession().catch(function () {}); } catch (e) {} return; }
        conv = c;
        return context().then(function (ctx) { try { c.sendContextualUpdate(ctx); } catch (e) {} });
      })
      .catch(function (e) {
        conv = null;
        var msg = (e && e.message) || String(e);
        if (/permission|NotAllowed|denied/i.test(msg)) {
          voiceState = "off";
          h.onStatus && h.onStatus("off");
          h.onError && h.onError(L("Necesito permiso para usar el micrófono.", "I need permission to use the microphone."));
          return;
        }
        fallback();
      });
  }

  function stopVoice() {
    if (cancelStart) { cancelStart(); cancelStart = null; }
    var c = conv;
    conv = null;
    voiceState = "off";
    if (bv) {
      var b = bv; bv = null; b.active = false;
      try { if (b.rec) b.rec.abort(); } catch (e) {}
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      b.h.onStatus && b.h.onStatus("off");
    }
    if (c) c.endSession().catch(function () {});
  }

  function sendText(text) {
    if (bv) { log("user", text); bvAsk({ text: text }); return true; }
    if (!conv) return false;
    log("user", text);
    conv.sendUserMessage(text);
    return true;
  }

  function choose(id, label) {
    if (bv) { bvAsk({ buttonId: id, buttonTitle: label }); return true; }
    if (!conv) return false;
    if (id && id.indexOf("pick:") === 0) {
      conv.sendContextualUpdate('El huésped tocó en pantalla la opción "' + label + '" (quoteId ' + id.slice(5) + ").");
      return sendText("Elijo " + label);
    }
    conv.sendContextualUpdate('El huésped tocó el botón "' + label + '" (' + id + ").");
    return sendText(label);
  }

  function notify(text) {
    if (conv) try { conv.sendContextualUpdate("Aviso del sistema: " + text + " Infórmaselo al huésped brevemente."); } catch (e) {}
  }

  if (window.AuraI18n) window.AuraI18n.onChange(function () { if (conv) try { conv.sendContextualUpdate(langNote()); } catch (e) {} });

  window.AuraNia = {
    sessionId: SID,
    partsToUi: partsToUi,
    chat: chat,
    book: book,
    reservationStatus: reservationStatus,
    availability: availability,
    service: service,
    voice: {
      available: voiceAvailable,
      start: startVoice,
      stop: stopVoice,
      sendText: sendText,
      choose: choose,
      notify: notify,
      state: function () { return voiceState; },
    },
  };
})();
