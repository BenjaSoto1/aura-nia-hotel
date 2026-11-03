"""
Genera public/aura/index.html a partir del diseño original de Claude Design
(design/aura/hotel-aura-nia-immersive.dc.html), conectándolo con el cerebro del hotel:

  - rutas de assets absolutas (/aura/...) para servirlo en / y /canal/web
  - nia-bridge.js: chat real (core), voz real (ElevenLabs), reserva real (correo de confirmación)
  - panel de reserva con nombre, correo, teléfono y tarifa; código de reserva real
  - micrófono del panel y "Hablar con Nía" del hero abren la voz de ElevenLabs
  - i18n.js: el sitio completo en inglés (botón ES/EN o detección por lo que escribe o dice el huésped)
  - buscador del hero con disponibilidad y precios reales (/api/aura/availability) -> panel de reserva
  - la voz llena el panel de reserva (fechas, habitación, precio, código y pago)
  - videos de fondo: se descargan solo al entrar a su escena (preload="none")

Uso:  python scripts/build-aura-page.py
Si el diseño cambia, reemplaza el .dc.html en design/aura/ y vuelve a ejecutar.
Cada reemplazo verifica que el texto original exista: si el diseño cambió, el script avisa dónde.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "aura" / "hotel-aura-nia-immersive.dc.html"
OUT = ROOT / "public" / "aura" / "index.html"

html = SRC.read_text(encoding="utf-8")


def sub(old, new, count=1):
    global html
    n = html.count(old)
    if n == 0:
        sys.exit(f"[build-aura-page] No encontré en el diseño:\n  {old[:140]}")
    if count and n != count:
        sys.exit(f"[build-aura-page] Esperaba {count} coincidencia(s) y hay {n}:\n  {old[:140]}")
    html = html.replace(old, new)


def resub(pattern, new):
    global html
    html, n = re.subn(pattern, new, html, count=1, flags=re.S)
    if n != 1:
        sys.exit(f"[build-aura-page] Patrón no encontrado: {pattern[:140]}")


# ---------------------------------------------------------------- rutas y cabecera
sub('<script src="./support.js"></script>',
    '<title>Aura · Hotel Boutique &amp; Casa de Mar</title>\n'
    '<meta name="description" content="Una casa serena frente al mar. Habla con Nía, la concierge digital de Aura.">\n'
    '<script src="/aura/i18n.js"></script>\n<script src="/aura/nia-bridge.js"></script>\n<script src="/aura/support.js"></script>')
html = html.replace('href="_ds/', 'href="/aura/_ds/')
html = html.replace("uploads/images/", "/aura/uploads/images/")
html = html.replace("cena-arena.png", "cena-arena.jpg")  # optimizada (scripts/optimize-aura-images.py)

# ---------------------------------------------------------------- plantilla
# Hero: "Hablar con Nía · Reserva por voz" abre Nía y la voz.
sub('<button onClick="{{ openChat }}" style="margin-top:36px;', '<button onClick="{{ talk }}" style="margin-top:36px;')

# Huéspedes: select controlado (el diseño marcaba "2 adultos" con selected, que React ignora).
sub('<select onChange="{{ setGuests }}"', '<select value="{{ guests }}" onChange="{{ setGuests }}"')
sub('<option selected>2 adultos</option>', '<option>2 adultos</option>')

# Footer: los canales de contacto llevan a los simuladores de la demo.
sub('<a href="#" style-hover="color:#D9A27F">WhatsApp</a><a href="#" style-hover="color:#D9A27F">Instagram</a>',
    '<a href="/canal/whatsapp" style-hover="color:#D9A27F">WhatsApp</a><a href="https://www.instagram.com/hotel_prueba_aura/" target="_blank" rel="noopener" style-hover="color:#D9A27F">Instagram</a>')

# Mensajes: saltos de línea y enlaces (pago seguro, pre-check-in).
sub('box-shadow:{{ m.shadow }};border:{{ m.border }}">{{ m.text }}</div>',
    'box-shadow:{{ m.shadow }};border:{{ m.border }};white-space:pre-line">{{ m.text }}'
    '<sc-if value="{{ m.hasLink }}"><a href="{{ m.link }}" target="_blank" rel="noopener" '
    'style="display:inline-block;margin-top:10px;background:#16202B;color:#FBF8F1;padding:10px 16px;font-size:11px;letter-spacing:.14em;text-transform:uppercase" '
    'style-hover="background:#B8623F">{{ m.linkLabel }}</a></sc-if></div>')

# Estado de la voz + errores, sobre el compositor.
sub('<form onSubmit="{{ send }}"',
    '<sc-if value="{{ voiceOn }}"><div style="display:flex;align-items:center;gap:8px;padding:8px 18px;border-top:1px solid #DDD0B8;font-size:12px;color:#7A5A46">'
    '<span style="width:8px;height:8px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s infinite"></span>{{ voiceLabel }}</div></sc-if>'
    '<sc-if value="{{ hasVErr }}"><div style="padding:8px 18px;border-top:1px solid #DDD0B8;font-size:12px;color:#8F4528">{{ vErr }}</div></sc-if>\n'
    '<form onSubmit="{{ send }}"')

# Micrófono del panel: activa / termina la voz de ElevenLabs.
sub('<button type="button" style="width:40px;height:40px;flex:none;border-radius:50%;border:1px solid #DDD0B8;background:#FBF8F1;cursor:pointer;color:#16202B;display:grid;place-items:center">',
    '<button type="button" onClick="{{ toggleVoice }}" title="{{ micTitle }}" aria-label="{{ micTitle }}" style="width:40px;height:40px;flex:none;border-radius:50%;border:1px solid {{ micBd }};background:{{ micBg }};cursor:pointer;color:{{ micFg }};display:grid;place-items:center;transition:background 400ms ease,color 400ms ease">')

# Panel de reserva: datos del huésped, tarifa y confirmación real.
FIELD = "font-family:inherit;font-size:15px;padding:12px 14px;border:1px solid #DDD0B8;background:#F6F0E4;color:#16202B;outline:none;border-radius:0;min-width:0;width:100%;box-sizing:border-box"
PILL = "font-family:inherit;border:1px solid #16202B;padding:10px 16px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer"
sub('<sc-if value="{{ bookedNot }}" hint-placeholder-val="{{ true }}">', '<sc-if value="{{ showForm }}" hint-placeholder-val="{{ true }}">')
resub(r'<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap"><button onClick="\{\{ confirm \}\}".*?</div>\n</sc-if>',
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:18px">'
      f'<input value="{{{{ gName }}}}" onChange="{{{{ setName }}}}" placeholder="Nombre completo" autocomplete="name" style="{FIELD}">'
      f'<input value="{{{{ gEmail }}}}" onChange="{{{{ setEmail }}}}" type="email" placeholder="Correo" autocomplete="email" style="{FIELD}">'
      f'<input value="{{{{ gPhone }}}}" onChange="{{{{ setPhone }}}}" type="tel" placeholder="Teléfono (+56 9…)" autocomplete="tel" style="{FIELD}">'
      '</div>\n'
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">'
      f'<button onClick="{{{{ pickFlex }}}}" style="{PILL};background:{{{{ flexBg }}}};color:{{{{ flexFg }}}}">Flexible · pagas en el hotel</button>'
      f'<button onClick="{{{{ pickPre }}}}" style="{PILL};background:{{{{ preBg }}}};color:{{{{ preFg }}}}">Prepago −12%</button>'
      '<span style="font-size:12px;color:#6B6A60">{{ rateNote }}</span></div>\n'
      '<sc-if value="{{ hasBookErr }}"><div style="color:#8F4528;font-size:13px;margin-top:12px">{{ bookErr }}</div></sc-if>\n'
      '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button onClick="{{ confirm }}" style="font-family:inherit;background:#16202B;color:#FBF8F1;border:0;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer" style-hover="background:#B8623F">{{ busyLabel }}</button>'
      '<button onClick="{{ goStay }}" style="font-family:inherit;background:transparent;color:#16202B;border:1px solid #16202B;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer">Ajustar estadía</button></div>\n'
      '<div style="font-size:11px;color:#6B6A60;margin-top:12px">El pago siempre es un botón seguro. Nunca compartas tu tarjeta en el chat.</div>\n'
      '</sc-if>\n'
      '<sc-if value="{{ awaitingPay }}" hint-placeholder-val="{{ false }}">'
      '<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8F4528;margin-bottom:10px">Reserva {{ code }} · pendiente de pago</div>'
      "<h2 style=\"font-family:'Cormorant Garamond',serif;font-weight:400;font-size:clamp(30px,3.4vw,42px);line-height:1.08;margin:0 0 14px\">Tu habitación, <i>guardada 30 minutos.</i></h2>"
      '<p style="font-size:15px;line-height:1.6;color:#4A5560;margin:0 0 20px">Paga con el botón seguro. En cuanto se confirme el pago, la confirmación llega a {{ bookedEmail }}.</p>'
      '<a href="{{ payUrl }}" target="_blank" rel="noopener" style="display:inline-block;background:#16202B;color:#FBF8F1;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase" style-hover="background:#B8623F">Pagar {{ bookedTotal }} de forma segura</a>'
      '<div style="display:flex;align-items:center;gap:8px;margin-top:16px;font-size:12px;color:#6B6A60"><span style="width:6px;height:6px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s infinite"></span>Esperando la confirmación del pago…</div>'
      '</sc-if>')
sub('Reserva confirmada · AUR-48213', 'Reserva confirmada · {{ code }}')
sub('{{ B.extras }}. La confirmación va camino a tu correo.', '{{ B.extras }}. La confirmación va camino a {{ bookedEmail }}.')

# Reserva confirmada: acceso directo a modificar o cancelar.
sub('<button onClick="{{ closeNia }}" style="font-family:inherit;background:#16202B;color:#FBF8F1;border:0;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer" style-hover="background:#B8623F">Volver a Aura</button>',
    '<div style="display:flex;gap:10px;flex-wrap:wrap"><button onClick="{{ closeNia }}" style="font-family:inherit;background:#16202B;color:#FBF8F1;border:0;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer" style-hover="background:#B8623F">Volver a Aura</button>'
    '<button onClick="{{ manageBooked }}" style="font-family:inherit;background:transparent;color:#16202B;border:1px solid #16202B;padding:16px 24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer">Modificar o cancelar</button></div>')

# ---------------------------------------------------------------- lógica
# Modificar / cancelar / "mi reserva" no son la coreografía de reservar: los resuelve el core.
sub("function intentOf(t) {\n  t = t.toLowerCase();",
    "function intentOf(t) {\n  t = t.toLowerCase();\n"
    "  if (/cancel|anul|modific|cambi|mover|reprogram|posterg|mi reserva|mis reservas|gestionar|change|resched|my booking/.test(t)) return null;")
sub("openBooking: enter('Quiero ver mi reserva', 'booking')", "openBooking: enter('Quiero ver mi reserva', null)")
sub("class Component extends DCLogic {",
    "// Fechas por defecto relativas a hoy (el diseño traía fechas fijas).\n"
    "function isoIn(d) { return new Date(Date.now() + d * 864e5).toLocaleDateString('en-CA'); }\n"
    "const ROOMCODE = { dlx: 'STD_CITY', vm: 'DLX_SEA', ste: 'STE_TER' };\n"
    "const NIA = () => window.AuraNia;\n\n"
    "class Component extends DCLogic {")
sub("arrival: '2026-10-07', departure: '2026-10-09', guests: '2 adultos', messages: [] };",
    "arrival: isoIn(14), departure: isoIn(16), guests: '2 adultos', messages: [],\n"
    "    voice: 'off', vmode: 'listening', vErr: '', coreQuick: null,\n"
    "    gName: '', gEmail: '', gPhone: '', rate: 'FLEX', bookErr: '', busy: false, code: '', bookedEmail: '', payUrl: '', bookedTotal: '' };")

sub("componentWillUnmount() { clearTimeout(this.inviteT);", "componentWillUnmount() { clearInterval(this.payT); NIA() && NIA().voice.stop(); clearTimeout(this.inviteT);")
sub("push(from, text) { this.setState(s => ({ messages: [...s.messages, { from, text }] })); }",
    "push(from, text, extra) { this.setState(s => ({ messages: [...s.messages, { from, text, ...(extra || {}) }] })); }")
sub("reply(text, ms = 750) { this.setState({ typing: true });",
    "reply(text, ms = 750) { if (this.state.voice === 'on') return; this.setState({ typing: true });")

# run(): con voz activa, el texto va al agente de voz y solo cambia el ambiente;
# sin intención visual, responde el cerebro real del hotel (reservas, políticas, preguntas libres).
resub(r"    if \(key === undefined\) key = intentOf\(text \|\| ''\);\n    if \(!key\) return this\.reply\((.*?)\);\n",
      "    const voiceOn = this.state.voice === 'on';\n"
      "    if (voiceOn && text) { this.lastTyped = text; NIA().voice.sendText(text); }\n"
      "    if (key === undefined) key = intentOf(text || '');\n"
      "    if (key) this.setState({ coreQuick: null });\n"
      "    if (!key) { if (voiceOn) return; if (/excursi|isla/i.test(text || '')) return this.reply(\\1); return this.askCore({ text }); }\n")
sub("      this.later(f, () => this.setState({ typing: true }));\n"
    "      this.later(f + 900, () => { this.setState({ typing: false }); this.push('nia', S.follow);",
    "      this.later(f, () => { if (this.state.voice !== 'on') this.setState({ typing: true }); });\n"
    "      this.later(f + 900, () => { this.setState({ typing: false }); if (this.state.voice !== 'on') this.push('nia', S.follow);")

sub("  hideInvite() { clearTimeout(this.inviteT); this.setState({ invite: false }); }",
    """  hideInvite() { clearTimeout(this.inviteT); this.setState({ invite: false }); }
  // ---- Conexión con el cerebro del hotel (nia-bridge.js) ----
  showParts(parts) {
    const r = NIA().partsToUi(parts);
    r.messages.forEach(m => this.push('nia', m.text, m.link ? { link: m.link, linkLabel: m.linkLabel } : null));
    if (r.buttons.length) this.setState({ coreQuick: r.buttons });
  }
  askCore(payload) {
    this.setState({ typing: true });
    NIA().chat(payload).then(r => {
      this.setState({ typing: false, coreQuick: r.buttons.length ? r.buttons : null });
      r.messages.forEach(m => this.push('nia', m.text, m.link ? { link: m.link, linkLabel: m.linkLabel } : null));
    }).catch(() => { this.setState({ typing: false }); this.push('nia', 'Perdón, perdí la conexión un momento. ¿Me lo repites?'); });
  }
  pressQuick(b) {
    this.push('user', b.label);
    this.setState({ coreQuick: null });
    if (this.state.voice === 'on') { NIA().voice.choose(b.id, b.label); return; }
    this.askCore({ buttonId: b.id, buttonTitle: b.label });
  }
  toggleVoice() {
    const V = NIA() && NIA().voice; if (!V) return;
    if (this.state.voice !== 'off') { V.stop(); this.setState({ voice: 'off' }); return; }
    this.setState({ vErr: '', voice: 'connecting' });
    V.start({
      onStatus: st => this.setState({ voice: st }),
      onMode: m => this.setState({ vmode: m }),
      onError: msg => this.setState({ vErr: msg }),
      onMessage: (role, text) => {
        if (role === 'user') {
          if (text === this.lastTyped) return;
          this.push('user', text);
          const k = intentOf(text);
          if (k && k !== 'welcome' && k !== this.state.stage) this.run(null, k);
        } else this.push('nia', text);
      },
      onParts: parts => this.showParts(parts),
    });
  }
  confirmReal() {
    const s = this.state;
    const roomId = s.added.room || this.rooms[s.sel].id;
    if (s.gName.trim().length < 3) return this.setState({ bookErr: 'Escribe tu nombre completo.' });
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(s.gEmail.trim())) return this.setState({ bookErr: 'Revisa tu correo: ahí llega la confirmación.' });
    if (s.gPhone.replace(/\\D/g, '').length < 8) return this.setState({ bookErr: 'Escribe tu teléfono con código de país.' });
    if (!(s.departure > s.arrival)) return this.setState({ bookErr: 'La salida debe ser después de la llegada.' });
    const extras = {};
    if (s.added.dinner) extras.dinner = s.hora;
    if (s.added.sunset) extras.sunset = true;
    if (s.added.spa) extras.spa = { name: EXTRAS.spa.name, slot: s.wSlot };
    this.setState({ busy: true, bookErr: '' });
    NIA().book({ roomTypeCode: ROOMCODE[roomId], ratePlanCode: s.rate, checkIn: s.arrival, checkOut: s.departure, guests: parseInt(s.guests, 10) || 2,
      fullName: s.gName.trim(), email: s.gEmail.trim(), phone: s.gPhone.trim(), extras })
      .then(r => {
        if (!r.ok) return this.setState({ busy: false, bookErr: r.error || 'No pude completar la reserva.' });
        const total = '$' + Math.round(r.totalCents / 100).toLocaleString('en-US');
        this.setState(st => ({ busy: false, code: r.code, bookedEmail: r.email, bookedTotal: total, added: { ...st.added, room: roomId } }));
        if (r.payUrl) {
          this.setState({ payUrl: r.payUrl });
          this.push('nia', 'Te guardo la habitación 30 minutos. Cuando pagues, tu reserva ' + r.code + ' queda confirmada y te llega el correo.', { link: r.payUrl, linkLabel: 'Pagar de forma segura →' });
          this.pollPay(r.code);
        } else {
          this.setState({ booked: true });
          this.push('nia', 'Listo. Tu reserva ' + r.code + ' está confirmada y la confirmación va camino a ' + r.email + '. Te esperamos.');
          NIA().voice.notify('La reserva ' + r.code + ' quedó confirmada y el correo va camino a ' + r.email + '.');
        }
      })
      .catch(() => this.setState({ busy: false, bookErr: 'Se perdió la conexión. Intenta de nuevo.' }));
  }
  pollPay(code) {
    clearInterval(this.payT);
    this.payT = setInterval(() => NIA().reservationStatus(code).then(d => {
      if (['confirmed', 'precheckin_done', 'in_house', 'checked_out'].includes(d.status)) {
        clearInterval(this.payT);
        this.setState({ booked: true, payUrl: '' });
        this.push('nia', 'Pago recibido. Tu reserva ' + code + ' está confirmada; la confirmación va camino a ' + d.email + '.');
        NIA().voice.notify('Se recibió el pago de la reserva ' + code + '.');
      }
    }).catch(() => {}), 3000);
  }""")

sub("closeNia: () => this.setState({ nia: false }),",
    "closeNia: () => { if (this.state.voice !== 'off') NIA().voice.stop(); this.setState({ nia: false, voice: 'off' }); },\n"
    "      talk: e => { e && e.preventDefault && e.preventDefault(); this.enter(); if (this.state.voice === 'off') this.toggleVoice(); },\n"
    "      toggleVoice: () => this.toggleVoice(),\n"
    "      manageBooked: () => { const c = this.state.code; this.push('user', 'Quiero modificar o cancelar mi reserva'); if (this.state.voice === 'on') { NIA().voice.sendText('Quiero modificar o cancelar mi reserva ' + c); return; } this.askCore({ buttonId: 'manage:open:' + c, buttonTitle: 'Gestionar ' + c }); },\n"
    "      voiceOn: s.voice !== 'off', hasVErr: !!s.vErr, vErr: s.vErr,\n"
    "      voiceLabel: s.voice === 'connecting' ? 'Conectando con Nía…' : s.vmode === 'speaking' ? 'Nía está hablando…' : 'Nía te escucha · toca el micrófono para terminar',\n"
    "      micBg: s.voice === 'on' ? '#16202B' : s.voice === 'connecting' ? '#7A5A46' : '#FBF8F1', micFg: s.voice !== 'off' ? '#FBF8F1' : '#16202B',\n"
    "      micBd: s.voice !== 'off' ? '#16202B' : '#DDD0B8', micTitle: s.voice !== 'off' ? 'Terminar la voz' : 'Hablar con Nía por voz',\n"
    "      gName: s.gName, gEmail: s.gEmail, gPhone: s.gPhone,\n"
    "      setName: e => this.setState({ gName: e.target.value }), setEmail: e => this.setState({ gEmail: e.target.value }), setPhone: e => this.setState({ gPhone: e.target.value }),\n"
    "      pickFlex: () => this.setState({ rate: 'FLEX' }), pickPre: () => this.setState({ rate: 'PREPAGO' }),\n"
    "      flexBg: s.rate === 'FLEX' ? '#16202B' : 'transparent', flexFg: s.rate === 'FLEX' ? '#FBF8F1' : '#16202B',\n"
    "      preBg: s.rate === 'PREPAGO' ? '#16202B' : 'transparent', preFg: s.rate === 'PREPAGO' ? '#FBF8F1' : '#16202B',\n"
    "      rateNote: s.rate === 'FLEX' ? 'Cancelación gratis hasta 48 h antes' : 'No reembolsable · pago seguro ahora',\n"
    "      hasBookErr: !!s.bookErr, bookErr: s.bookErr,\n"
    "      busyLabel: s.busy ? 'Reservando…' : s.rate === 'PREPAGO' ? 'Reservar y pagar seguro' : 'Confirmar reserva',\n"
    "      showForm: !s.booked && !s.payUrl, awaitingPay: !s.booked && !!s.payUrl,\n"
    "      code: s.code, bookedEmail: s.bookedEmail || 'tu correo', payUrl: s.payUrl, bookedTotal: s.bookedTotal,")
sub("booked: false }); this.later(400, () => this.reply(STATES.welcome.lead)); },",
    "booked: false, code: '', payUrl: '', coreQuick: null, bookErr: '' }); this.later(400, () => this.reply(STATES.welcome.lead)); },")
sub("confirm: () => { this.setState({ booked: true }); this.reply('Listo. Tu reserva AUR-48213 está confirmada y la confirmación va camino a tu correo. Te esperamos.'); },",
    "confirm: () => this.confirmReal(),")
sub("{ text: m.text,", "{ hasLink: !!m.link, link: m.link || '', linkLabel: m.linkLabel || '', text: m.alt ? m.alt[s.lang] || m.text : m.text,", count=2)
sub("quick: STATES[s.stage].sugg.map(l => ({ label: l, go: () => this.run(l) })),",
    "quick: s.coreQuick ? s.coreQuick.map(b => ({ label: b.label, go: () => this.pressQuick(b) })) : STATES[s.stage].sugg.map(l => ({ label: l, go: () => this.run(l) })),")

# ================================================================ idioma, disponibilidad real, voz -> panel, carga
# ---- plantilla
LANG_BTN = ('<button onClick="{{ toggleLang }}" title="Cambiar idioma" aria-label="Cambiar idioma" '
            'style="background:none;border:0;color:inherit;font-family:inherit;font-size:12px;letter-spacing:.16em;cursor:pointer;padding:0" '
            'style-hover="color:#D9A27F">{{ langOther }}</button>')
sub('onClick="{{ openBooking }}">Mi reserva</a>', 'onClick="{{ openBooking }}">Mi reserva</a>' + LANG_BTN)
# Celular: la navegación del hero no debe ensanchar la página (el diseño original ya quedaba justo).
sub('padding:26px 56px;gap:24px', 'padding:26px clamp(16px,5vw,56px);gap:clamp(12px,2vw,24px)')
sub('<div style="display:flex;gap:24px;align-items:center;justify-content:flex-end">',
    '<div style="display:flex;flex-wrap:wrap;gap:12px clamp(14px,2vw,24px);align-items:center;justify-content:flex-end;min-width:0">')
html = re.sub(r"minmax\((\d+)px,1fr\)", r"minmax(min(\1px,100%),1fr)", html)  # grillas que no ensanchan la página
sub('padding:56px;display:grid;', 'padding:clamp(24px,6vw,56px);display:grid;')
# Barra de Nía Mode en celular: solo la × para volver (deja lugar al botón de idioma).
sub('<span>Volver al sitio</span>', '<span style="display:{{ L.backTxt }}">Volver al sitio</span>')
sub("    if (mob) Object.assign(L, { h2Display: 'none', descDisplay: 'none' });",
    "    if (mob) Object.assign(L, { h2Display: 'none', descDisplay: 'none' });\n    L.backTxt = mob ? 'none' : 'inline'; L.bookLbl = mob ? '78px' : '120px';")
sub('grid-template-columns:120px minmax(0,1fr)', 'grid-template-columns:{{ L.bookLbl }} minmax(0,1fr)')

# Huéspedes con value fijo: el texto visible se traduce, el valor no.
GUEST_OPTS = ''.join(f'<option value="{n} adulto{"s" if n > 1 else ""}">{n} adulto{"s" if n > 1 else ""}</option>' for n in range(1, 5))
sub('<option>1 adulto</option><option>2 adultos</option><option>3 adultos</option><option>4 adultos</option>', GUEST_OPTS)

# Buscador del hero: habitación controlada + "Ver disponibilidad" con disponibilidad y precios reales.
sub('<select style="border:0;background:transparent;font-size:17px;color:#16202B;width:100%;outline:none"><option>Cualquiera</option><option>Habitación Deluxe</option><option>Habitación Vista al Mar</option><option>Suite Vista al Mar</option></select>',
    '<select value="{{ heroRoom }}" onChange="{{ setHeroRoom }}" style="border:0;background:transparent;font-size:17px;color:#16202B;width:100%;outline:none">'
    '<option value="">Cualquiera</option><option value="dlx">Habitación Deluxe</option><option value="vm">Habitación Vista al Mar</option><option value="ste">Suite Vista al Mar</option></select>')
sub('<a href="#habitaciones" style="flex:1 1 200px;background:#16202B;color:#FBF8F1;display:grid;place-items:center;padding:20px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:500" style-hover="background:#0F1720">Ver disponibilidad</a>\n</div>',
    '<a href="#reservar" onClick="{{ checkAvail }}" style="flex:1 1 200px;background:#16202B;color:#FBF8F1;display:grid;place-items:center;padding:20px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:500;cursor:pointer" style-hover="background:#0F1720">{{ availLabel }}</a>\n</div>\n'
    '<sc-if value="{{ hasHeroErr }}"><div style="margin-top:10px;max-width:960px;background:rgba(15,23,32,.7);color:#F6D9C4;padding:10px 16px;font-size:13px">{{ heroErr }}</div></sc-if>')

# Barra de Nía Mode: botón de idioma junto a "Volver al sitio".
sub('<div style="display:flex;justify-content:flex-end"><button onClick="{{ closeNia }}"',
    '<div style="display:flex;justify-content:flex-end;gap:8px"><button onClick="{{ toggleLang }}" title="Cambiar idioma" aria-label="Cambiar idioma" '
    'style="background:none;border:1px solid rgba(251,248,241,.4);color:#FBF8F1;font-family:inherit;font-size:11px;letter-spacing:.16em;padding:11px 14px;cursor:pointer" '
    'style-hover="background:#FBF8F1;color:#16202B">{{ langOther }}</button><button onClick="{{ closeNia }}"')

# Panel de reserva: fechas y huéspedes editables, habitaciones con disponibilidad y precio real.
LBL = 'font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6B6A60;padding-top:4px'
SMALL = 'font-family:inherit;font-size:14px;padding:6px 8px;border:1px solid #DDD0B8;background:#F6F0E4;color:#16202B;outline:none;border-radius:0;min-width:0'
resub(r'<span style="[^"]*">Fechas</span><span>\{\{ stayLabel \}\} · \{\{ nightsLabel \}\}</span>.*?/ noche</span>',
      f'<span style="{LBL};padding-top:10px">Fechas</span><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      f'<input type="date" value="{{{{ arrival }}}}" onChange="{{{{ setArrival }}}}" aria-label="Llegada" style="{SMALL}"><span>→</span>'
      f'<input type="date" value="{{{{ departure }}}}" onChange="{{{{ setDeparture }}}}" aria-label="Salida" style="{SMALL}">'
      '<span style="font-size:13px;color:#6B6A60">{{ nightsLabel }}</span></span>\n'
      f'<span style="{LBL};padding-top:10px">Huéspedes</span><span><select value="{{{{ guests }}}}" onChange="{{{{ setGuests }}}}" aria-label="Huéspedes" style="{SMALL}">{GUEST_OPTS}</select></span>\n'
      f'<span style="{LBL}">Habitación</span><span>{{{{ B.room }}}} · {{{{ B.roomPrice }}}} / noche'
      '<sc-if value="{{ hasAvail }}"><span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">'
      '<sc-for list="{{ availPills }}" as="ap" hint-placeholder-count="3"><button onClick="{{ ap.pick }}" title="{{ ap.name }}" '
      'style="font-family:inherit;display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1px solid {{ ap.bd }};background:{{ ap.bg }};color:{{ ap.fg }};padding:7px 10px;font-size:12px;cursor:{{ ap.cursor }};text-align:left">'
      '<span style="text-decoration:{{ ap.deco }}">{{ ap.name }}</span><span style="font-size:11px;opacity:.8">{{ ap.info }}</span></button></sc-for></span></sc-if>'
      '<sc-if value="{{ hasAvailNote }}"><span style="display:block;margin-top:8px;font-size:13px;color:#8F4528">{{ availNote }}</span></sc-if></span>')
# Alerta de habitación ocupada: en el panel de reserva (bajo el título) y en el buscador del hero.
ALERT_BOX = ('<div role="alert" style="display:flex;gap:12px;align-items:flex-start;margin:0 0 18px;padding:12px 14px;background:#F8E9DC;border:1px solid #D9A27F;border-left:3px solid #B8623F;color:#5C2E1C;font-size:14px;line-height:1.45"><span aria-hidden="true" style="flex:none;width:20px;height:20px;border-radius:50%;background:#B8623F;color:#FBF8F1;display:grid;place-items:center;font-size:12px;font-weight:700">!</span>')
sub('lista para confirmar.</i></h2>',
    'lista para confirmar.</i></h2>\n<sc-if value="{{ hasBookAlert }}">' + ALERT_BOX + '<span>{{ bookAlert }}</span></div></sc-if>')
sub('<sc-if value="{{ hasHeroErr }}">',
    '<sc-if value="{{ hasHeroAlert }}"><div style="margin-top:10px;max-width:960px">' + ALERT_BOX.replace('margin:0 0 18px', 'margin:0') + '<span>{{ heroAlert }}</span></div></div></sc-if>\n<sc-if value="{{ hasHeroErr }}">')
sub('<span style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6B6A60">Estimado · impuestos de prueba</span>',
    '<span style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6B6A60">{{ totalNote }}</span>')

# Velocidad: los videos solo se descargan al entrar a su escena (play() los carga); póster mientras tanto.
sub('src="/aura/uploads/images/brasa-dia-noche.mp4" poster="/aura/uploads/images/restaurante-brasa.jpg" preload="metadata"',
    'src="/aura/uploads/images/brasa-dia-noche.mp4" poster="/aura/uploads/images/restaurante-brasa.jpg" preload="none"')
sub('src="/aura/uploads/images/atardecer-velero.mp4" poster="/aura/uploads/images/velero-atardecer.jpg" preload="metadata"',
    'src="/aura/uploads/images/atardecer-velero.mp4" poster="/aura/uploads/images/velero-atardecer.jpg" preload="none"')
sub('src="/aura/uploads/images/habitaciones-fondo.mp4" preload="metadata"',
    'src="/aura/uploads/images/habitaciones-fondo.mp4" poster="/aura/uploads/images/habitaciones-fondo-poster.jpg" preload="none"')

# Precio real de la navegación (Hotel Pack: SAIL $140).
sub("sunset: { name: 'Navegación al atardecer', price: 180 }", "sunset: { name: 'Navegación al atardecer', price: 140 }")
sub("badge: 'Recomendado por Nía', price: '$180'", "badge: 'Recomendado por Nía', price: '$140'")

# ---- lógica
# Intenciones también en inglés.
sub("if (/cenar|comer|brasa|restaur|mesa|gastron|cocina/.test(t)) return 'dining';",
    "if (/cenar|comer|brasa|restaur|mesa|gastron|cocina|dinner|dine|eat|food|table/.test(t)) return 'dining';")
sub("if (/relaj|spa|bienestar|yoga|ritual|masaj/.test(t)) return 'wellness';",
    "if (/relaj|spa|bienestar|yoga|ritual|masaj|relax|wellness|massage/.test(t)) return 'wellness';")
sub("if (/atardecer|sunset|especial|naveg|barco|experienc/.test(t)) return 'sunset';",
    "if (/atardecer|sunset|especial|naveg|barco|experienc|sail|boat|special|experience/.test(t)) return 'sunset';")
sub("if (/planific|planea|estad|itinerar/.test(t)) return 'stay';",
    "if (/planific|planea|estad|itinerar|plan my|my stay|itinerary/.test(t)) return 'stay';")
sub("if (/reserv|disponib|confirm|pagar/.test(t)) return 'booking';",
    "if (/reserv|disponib|confirm|pagar|book|availab/.test(t)) return 'booking';")
sub("if (/habitaci|suite|cuarto|dormir/.test(t)) return 'rooms';",
    "if (/habitaci|suite|cuarto|dormir|room/.test(t)) return 'rooms';")
sub("if (/hola|inicio|empez/.test(t)) return 'welcome';",
    "if (/hola|inicio|empez|hello|\\bhi\\b|start/.test(t)) return 'welcome';")

sub("const NIA = () => window.AuraNia;\n",
    "const NIA = () => window.AuraNia;\n"
    "const I18N = () => window.AuraI18n;\n"
    "const EN = () => !!(window.AuraI18n && window.AuraI18n.lang === 'en');\n"
    "const T = x => (window.AuraI18n ? window.AuraI18n.tr(x) : x);\n"
    "const money = c => '$' + Math.round(c / 100).toLocaleString('en-US');\n"
    "const GN = g => parseInt(g, 10) || 2;\n"
    "const ROOMID = code => Object.keys(ROOMCODE).find(k => ROOMCODE[k] === code);\n")
sub("bookedEmail: '', payUrl: '', bookedTotal: '' };",
    "bookedEmail: '', payUrl: '', bookedTotal: '',\n"
    "    lang: (window.AuraI18n && window.AuraI18n.lang) || 'es', heroRoom: '', wantedRoom: '', avail: null, availErr: '', availBusy: false, heroErr: '' };")
sub("    this.startLoop();\n    this.inviteT = setTimeout",
    "    if (I18N()) I18N().onChange(l => this.setState({ lang: l }));\n"
    "    setTimeout(() => this.fromLink(), 300);\n"
    "    this.startLoop();\n    this.inviteT = setTimeout")
sub("fmt(d) { const [, m, dd] = d.split('-'); return",
    "fmt(d) { const [, m, dd] = d.split('-'); if (EN()) return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + (+dd); return")
sub("componentWillUnmount() { clearInterval(this.payT);", "componentWillUnmount() { clearInterval(this.payT); clearTimeout(this.availT);")

# Lo que escribe el huésped define el idioma; los textos del diseño viajan al core ya traducidos.
sub("send: e => { e.preventDefault(); const t = s.draft.trim(); if (!t) return; this.setState({ draft: '' }); this.run(t); }",
    "send: e => { e.preventDefault(); const t = s.draft.trim(); if (!t) return; this.setState({ draft: '' }); if (I18N()) I18N().observe(t); this.run(t); }")
sub("if (voiceOn && text) { this.lastTyped = text; NIA().voice.sendText(text); }",
    "if (voiceOn && text) { this.lastTyped = text; NIA().voice.sendText(T(text)); }")
sub("return this.askCore({ text }); }", "return this.askCore({ text: T(text) }); }")
sub("    const S = STATES[key], p = S.pause || 0;\n", "    const S = STATES[key], p = S.pause || 0;\n    if (key === 'booking') this.refreshAvail();\n")
sub("          if (text === this.lastTyped) return;\n", "          if (text === this.lastTyped) return;\n          if (I18N()) I18N().observe(text);\n")
sub("      onParts: parts => this.showParts(parts),\n", "      onParts: parts => this.showParts(parts),\n      onTool: (name, p, r, parts) => this.voiceTool(name, p, r, parts),\n")
sub("NIA().voice.sendText('Quiero modificar o cancelar mi reserva ' + c); return; }",
    "NIA().voice.sendText(T('Quiero modificar o cancelar mi reserva') + ' ' + c); return; }")

# Textos compuestos en la lógica: se arman ya en el idioma actual.
sub("pick: () => this.reply(d.name + '. ' + d.desc + ' ' + d.tag + '. ¿Te lo reservo con tu mesa de esta noche?') }));",
    "pick: () => this.reply(T(d.name) + '. ' + T(d.desc) + ' ' + T(d.tag) + '. ' + T('¿Te lo reservo con tu mesa de esta noche?')) }));")
sub("ask: () => this.reply('Perfecto. Te aparto ' + fx.name.toLowerCase() + ' para hoy. Un anfitrión te confirmará los detalles.') };",
    "ask: () => this.reply(EN() ? 'Perfect. I\\'ll hold the ' + T(fx.name).toLowerCase() + ' for you today. A host will confirm the details.' : 'Perfecto. Te aparto ' + fx.name.toLowerCase() + ' para hoy. Un anfitrión te confirmará los detalles.') };")
sub("pick: () => { this.setState({ sunPick: e.id }); this.reply(e.name + ': ' + e.facts[2][1].toLowerCase() + '. ' + e.time + '.'); } }));",
    "pick: () => { this.setState({ sunPick: e.id }); this.reply(T(e.name) + ': ' + T(e.facts[2][1]).toLowerCase() + '. ' + T(e.time) + '.'); } }));")
sub("this.add('spa', 'Reservado: ' + r.name.toLowerCase() + ', ' + this.state.wSlot.toLowerCase() + '. Te esperamos sin prisa.'); } }; });",
    "this.add('spa', (EN() ? 'Booked: ' : 'Reservado: ') + T(r.name).toLowerCase() + ', ' + T(this.state.wSlot).toLowerCase() + '. ' + T('Te esperamos sin prisa.')); } }; });")

# Panel de reserva con precios reales (cuando hay disponibilidad consultada para esas fechas).
sub("    const B = { room: bRoom.name, roomPrice: bRoom.price, extras: ex.length ? ex.map(k => EXTRAS[k].name).join(' · ') : 'Sin experiencias por ahora', total: '$' + total.toLocaleString('en-US') };",
    "    const AV = s.avail && s.avail.key === this.availKey() ? s.avail : null;\n"
    "    const aOf = id => AV && AV.rooms.find(x => x.roomTypeCode === ROOMCODE[id]);\n"
    "    const bA = aOf(bRoom.id), real = !!(bA && bA.available);\n"
    "    const svc = (AV && AV.services) || {};\n"
    "    const exCents = ex.reduce((a, k) => a + (k === 'dinner' ? (svc.REST || 0) : k === 'sunset' ? (svc.SAIL || 0) : (svc.SPA || 0)), 0);\n"
    "    const B = { room: bRoom.name, roomPrice: real ? money(bA.prices.FLEX.nightlyCents) : bRoom.price, extras: ex.length ? ex.map(k => EXTRAS[k].name).join(' · ') : 'Sin experiencias por ahora',\n"
    "      total: real ? money(bA.prices[s.rate].totalCents + exCents) : '$' + total.toLocaleString('en-US') };\n"
    "    const availPills = AV ? this.rooms.map(r => { const a = aOf(r.id), on = r.id === bRoom.id, ok = !!(a && a.available);\n"
    "      return { name: r.name, info: !a ? '' : !a.fitsGuests ? 'Máx. ' + a.maxGuests + ' huéspedes' : !a.available ? 'Agotada' : money(a.prices[s.rate].totalCents) + (a.roomsLeft <= 3 ? ' · ' + (EN() ? a.roomsLeft + ' left' : 'quedan ' + a.roomsLeft) : ''),\n"
    "        bg: on ? '#16202B' : 'transparent', fg: on ? '#FBF8F1' : ok ? '#16202B' : '#9A968A', bd: on || ok ? '#16202B' : '#DDD0B8', deco: ok ? 'none' : 'line-through', cursor: ok ? 'pointer' : 'not-allowed',\n"
    "        pick: () => { if (ok) this.setState(st => ({ sel: this.rooms.indexOf(r), added: { ...st.added, room: r.id }, bookErr: '', wantedRoom: '' })); } }; }) : [];\n"
    "    const availNote = s.availErr || '';\n"
    "    const en = s.lang === 'en', nmL = r => en ? ({ dlx: 'Deluxe Room', vm: 'Sea View Room', ste: 'Sea View Suite' })[r.id] : r.name;\n"
    "    const range = this.fmtL(s.arrival, en) + ' – ' + this.fmtL(s.departure, en);\n"
    "    const busyMsg = (r, a) => !a.fitsGuests ? (en ? 'The ' + nmL(r) + ' fits up to ' + a.maxGuests + ' guests.' : 'La ' + nmL(r) + ' admite hasta ' + a.maxGuests + ' huéspedes.')\n"
    "      : (en ? 'The ' + nmL(r) + ' is already booked for those dates (' + range + ').' : 'La ' + nmL(r) + ' está ocupada en esas fechas (' + range + ').');\n"
    "    const anyFree = !!(AV && AV.rooms.some(x => x.available));\n"
    "    const wantedR = s.wantedRoom && s.wantedRoom !== bRoom.id && this.rooms.find(r => r.id === s.wantedRoom), wA = wantedR && aOf(wantedR.id);\n"
    "    const noneMsg = en ? 'No rooms are left for those dates (' + range + '). Try other dates.' : 'No quedan habitaciones en esas fechas (' + range + '). Prueba con otras fechas.';\n"
    "    const bookAlert = !AV ? '' : !anyFree ? noneMsg\n"
    "      : !real ? busyMsg(bRoom, bA || { fitsGuests: true }) + (en ? ' Pick an available room or change the dates.' : ' Elige otra habitación disponible o cambia las fechas.')\n"
    "      : wA && !wA.available ? busyMsg(wantedR, wA) + (en ? ' I selected the ' + nmL(bRoom) + ' for you.' : ' Te dejé seleccionada la ' + nmL(bRoom) + '.') : '';\n"
    "    const hR = s.heroRoom && this.rooms.find(r => r.id === s.heroRoom), hA = hR && aOf(hR.id);\n"
    "    const heroAlert = open || !AV ? '' : !anyFree ? noneMsg : hA && !hA.available ? busyMsg(hR, hA) + (en ? ' Choose another room or change the dates.' : ' Elige otra habitación o cambia las fechas.') : '';")

sub("      voiceOn: s.voice !== 'off', hasVErr: !!s.vErr, vErr: s.vErr,\n",
    "      voiceOn: s.voice !== 'off', hasVErr: !!s.vErr, vErr: s.vErr,\n"
    "      toggleLang: () => I18N() && I18N().set(EN() ? 'es' : 'en'), langOther: s.lang === 'en' ? 'ES' : 'EN',\n"
    "      heroRoom: s.heroRoom, setHeroRoom: e => { this.setState({ heroRoom: e.target.value }); this.refreshAvail(); },\n"
    "      checkAvail: e => this.searchAvail(e), availLabel: s.availBusy ? 'Consultando…' : 'Ver disponibilidad', hasHeroErr: !!s.heroErr, heroErr: s.heroErr,\n"
    "      hasAvail: !!AV, availPills, hasAvailNote: !!availNote, availNote, hasBookAlert: !!bookAlert, bookAlert, hasHeroAlert: !!heroAlert, heroAlert,\n"
    "      totalNote: real ? 'Total · impuestos de prueba incluidos' : 'Estimado · impuestos de prueba',\n")
sub("setArrival: e => this.setState({ arrival: e.target.value }), setDeparture: e => this.setState({ departure: e.target.value }), setGuests: e => this.setState({ guests: e.target.value }),",
    "setArrival: e => { this.setState({ arrival: e.target.value, heroErr: '' }); this.refreshAvail(); }, setDeparture: e => { this.setState({ departure: e.target.value, heroErr: '' }); this.refreshAvail(); },\n"
    "      setGuests: e => { this.setState({ guests: e.target.value, heroErr: '' }); this.refreshAvail(); },")

# Confirmar: no se intenta reservar una habitación que la disponibilidad real marca sin cupo.
sub("    if (!(s.departure > s.arrival)) return this.setState({ bookErr: 'La salida debe ser después de la llegada.' });\n",
    "    if (!(s.departure > s.arrival)) return this.setState({ bookErr: 'La salida debe ser después de la llegada.' });\n"
    "    const av = s.avail && s.avail.key === this.availKey() && s.avail.rooms.find(x => x.roomTypeCode === ROOMCODE[roomId]);\n"
    "    if (av && !av.available) return this.setState({ bookErr: 'Esta habitación no está disponible en esas fechas. Elige otra.' });\n")

sub("  pollPay(code) {", r"""  // ---- Disponibilidad real (buscador del hero y panel de reserva) ----
  availKey() { const s = this.state; return s.arrival + '|' + s.departure + '|' + GN(s.guests); }
  refreshAvail() {
    clearTimeout(this.availT);
    this.availT = setTimeout(() => {
      const s = this.state, key = this.availKey();
      if (!(s.departure > s.arrival)) return this.setState({ avail: null, availErr: '' });
      NIA().availability(s.arrival, s.departure, GN(s.guests)).then(d => {
        if (this.availKey() !== key) return;
        this.setState(d.ok ? { avail: { ...d, key }, availErr: '' } : { avail: null, availErr: d.error || '' });
      }).catch(() => {});
    }, 300);
  }
  searchAvail(e) {
    e && e.preventDefault && e.preventDefault();
    const s = this.state;
    if (!(s.departure > s.arrival)) return this.setState({ heroErr: T('La salida debe ser después de la llegada.') });
    this.setState({ availBusy: true, heroErr: '' });
    NIA().availability(s.arrival, s.departure, GN(s.guests)).then(d => {
      this.setState({ availBusy: false });
      if (!d.ok) return this.setState({ heroErr: d.error || T('No pude completar la reserva.') });
      const key = this.availKey();
      const free = this.rooms.filter(r => { const a = d.rooms.find(x => x.roomTypeCode === ROOMCODE[r.id]); return a && a.available; });
      const wanted = s.heroRoom;
      const pick = (wanted && free.find(r => r.id === wanted)) || free.find(r => r.id === this.rooms[s.sel].id) || free[0];
      this.hideInvite(); this.clear();
      this.setState(st => ({ nia: true, stage: 'booking', prev: st.stage, avail: { ...d, key }, availErr: '', wantedRoom: wanted || '', coreQuick: null, booked: false, payUrl: '', code: '', bookErr: '',
        ...(pick ? { sel: this.rooms.indexOf(pick), added: { ...st.added, room: pick.id } } : {}) }));
      // Mensajes en ambos idiomas: si el huésped cambia de idioma, también cambian.
      const both = f => ({ alt: { es: f(false), en: f(true) } });
      const ask = en => (en ? 'Availability · ' : 'Disponibilidad · ') + this.fmtL(s.arrival, en) + ' – ' + this.fmtL(s.departure, en) + ' · ' + (en ? GN(s.guests) + (GN(s.guests) === 1 ? ' adult' : ' adults') : s.guests);
      this.push('user', ask(EN()), both(ask));
      this.setState({ typing: true });
      this.later(900, () => { this.setState({ typing: false }); const f = en => this.availText(d, wanted, pick, en); this.push('nia', f(EN()), both(f)); });
    }).catch(() => this.setState({ availBusy: false, heroErr: T('Se perdió la conexión. Intenta de nuevo.') }));
  }
  fmtL(d, en) { const [, m, dd] = d.split('-'); return en ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + (+dd) : (+dd) + ' ' + ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+m - 1]; }
  availText(d, wanted, pick, en) {
    const n = d.nights, nm = r => en ? ({ dlx: 'Deluxe Room', vm: 'Sea View Room', ste: 'Sea View Suite' })[r.id] : r.name;
    const lines = this.rooms.map(r => {
      const a = d.rooms.find(x => x.roomTypeCode === ROOMCODE[r.id]); if (!a) return null;
      const name = nm(r);
      if (!a.fitsGuests) return '· ' + name + ' — ' + (en ? 'up to ' + a.maxGuests + ' guests' : 'hasta ' + a.maxGuests + ' huéspedes');
      if (!a.available) return '· ' + name + ' — ' + (en ? 'sold out' : 'agotada');
      return '· ' + name + ' — ' + money(a.prices.FLEX.nightlyCents) + (en ? ' a night, ' : ' la noche, ') + money(a.prices.FLEX.totalCents) + (en ? ' in total' : ' en total')
        + (a.roomsLeft <= 3 ? (en ? ' (only ' + a.roomsLeft + ' left)' : ' (quedan ' + a.roomsLeft + ')') : '');
    }).filter(Boolean);
    const head = en ? 'For ' + n + (n === 1 ? ' night' : ' nights') + ', this is what we have (test taxes included):'
                    : 'Para ' + n + (n === 1 ? ' noche' : ' noches') + ', esto es lo que tenemos (impuestos de prueba incluidos):';
    let tail;
    if (!pick) tail = en ? 'Nothing is available for those dates. Try other dates or ask me for alternatives.' : 'No hay disponibilidad para esas fechas. Prueba otras fechas o pídeme alternativas.';
    else if (wanted && pick.id !== wanted) tail = (en ? 'The room you chose is not available, so I selected the ' : 'La habitación que elegiste no está disponible; te dejé seleccionada la ') + nm(pick) + (en ? '. Add your details to book.' : '. Completa tus datos para reservar.');
    else tail = (en ? 'I selected the ' : 'Te dejé seleccionada la ') + nm(pick) + (en ? '. You can switch rooms in the panel; prepaid saves 12%.' : '. Puedes cambiar de habitación en el panel; con prepago ahorras 12%.');
    return head + '\n' + lines.join('\n') + '\n\n' + tail;
  }
  // ---- La voz llena el panel de reserva (lo que el huésped dice aparece en el diseño) ----
  go(key) {
    if (!this.state.nia) { this.hideInvite(); this.setState({ nia: true }); }
    if (this.state.stage !== key) this.setState(st => ({ stage: key, prev: st.stage, night: false, sunReady: false, sunPick: 'sail', wStep: 0 }));
    if (key === 'booking') this.refreshAvail();
  }
  voiceTool(name, p, r, parts) {
    if (!r) return;
    if (r.ok === false && name !== 'quote' && name !== 'check_availability') return;
    const iso = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
    const st = {};
    if (iso(p.checkIn)) st.arrival = p.checkIn;
    if (iso(p.checkOut)) st.departure = p.checkOut;
    if (p.guests) { const g = Math.min(4, Math.max(1, parseInt(p.guests, 10) || 2)); st.guests = g + (g === 1 ? ' adulto' : ' adultos'); }
    const pickRoom = code => { const id = ROOMID(String(code || '').toUpperCase()); if (id) { st.sel = this.rooms.findIndex(x => x.id === id); st.added = { ...this.state.added, room: id }; } };
    if (name === 'check_availability' || name === 'quote') {
      this.quotes = this.quotes || {};
      (r.quotes || []).forEach(q => { this.quotes[q.quoteId] = q; });
      if (p.roomTypeCode) { pickRoom(p.roomTypeCode); st.wantedRoom = ROOMID(String(p.roomTypeCode).toUpperCase()) || ''; }
      if (p.ratePlanCode === 'FLEX' || p.ratePlanCode === 'PREPAGO') st.rate = p.ratePlanCode;
      this.setState({ ...st, booked: false, payUrl: '', code: '', bookErr: '' });
      this.go('booking');
    } else if (name === 'create_reservation') {
      const q = this.quotes && this.quotes[p.quoteId];
      if (q) { pickRoom(q.roomTypeCode); st.rate = q.ratePlanCode; }
      Object.assign(st, { gName: p.fullName || this.state.gName, gEmail: p.email || this.state.gEmail, gPhone: p.phone || this.state.gPhone,
        code: r.reservationCode || '', bookedEmail: p.email || '', bookedTotal: r.total || '', booked: r.status !== 'pending_payment', payUrl: '' });
      this.setState(st);
      this.go('booking');
    } else if (name === 'create_payment_link') {
      const pl = (parts || []).find(x => x.type === 'payment_link');
      if (pl && r.purpose !== 'balance' && r.reservationCode && r.reservationCode === this.state.code && !this.state.booked) {
        this.setState({ payUrl: pl.url, bookedTotal: money(pl.amountCents) });
        this.pollPay(r.reservationCode);
      }
    }
  }
  pollPay(code) {""")

# ================================================================ servicios reales (mesa, atardecer, rituales)
# Las tres experiencias del atardecer se pueden sumar; cada una es un servicio del Hotel Pack (SAIL, SAND, BAR).
sub("time: 'Salida 17:15', addable: true,", "time: 'Salida 17:15', addable: true, p: 140,")
sub("badge: 'Privada', price: '$220', time: 'Desde 18:00',", "badge: 'Privada', price: '$220', time: 'Desde 18:00', addable: true, p: 220,")
sub("badge: 'Sin reserva previa', price: '$45', time: '17:30 – 19:00',", "badge: 'Al caer el sol', price: '$45', time: '17:30 – 19:00', addable: true, p: 45,")
sub("guests: '2 adultos', messages: [],\n", "guests: '2 adultos', messages: [], sunChoice: 'sail',\n")
sub('<sc-if value="{{ added.sunset }}" hint-placeholder-val="{{ false }}">', '<sc-if value="{{ sunIsThis }}" hint-placeholder-val="{{ false }}">')
sub("addedSunsetNot: !ad.sunset,", "addedSunsetNot: !(ad.sunset && s.sunChoice === fx.id), sunIsThis: !!ad.sunset && s.sunChoice === fx.id,")
resub(r"addSunset: \(\) => this\.add\('sunset', (.*?)\),\n",
      r"addSunset: () => { this.setState({ sunChoice: fx.id }); EXTRAS.sunset.name = fx.name; EXTRAS.sunset.price = fx.p; this.add('sunset', \1, { sun: fx.id }); },\n")
sub("T('Te esperamos sin prisa.')); } }; });", "T('Te esperamos sin prisa.'), { ritual: r.id }); } }; });")
sub("{ k: 'sunset', label: 'Atardecer', name: 'Navegación al atardecer', img: '/aura/uploads/images/navegacion-atardecer.jpg', on: ad.sunset }",
    "{ k: 'sunset', label: 'Atardecer', name: EXTRAS.sunset.name, img: '/aura/uploads/images/' + ({ sail: 'navegacion-atardecer.jpg', sand: 'cena-arena.jpg', bar: 'terraza-frente-mar.jpg' })[s.sunChoice || 'sail'], on: ad.sunset }")
sub("{ k: 'spa', label: 'Bienestar', name: 'Spa y bienestar', img: '/aura/uploads/images/spa-bienestar.jpg', on: ad.spa }",
    "{ k: 'spa', label: 'Bienestar', name: ad.spa ? EXTRAS.spa.name : 'Spa y bienestar', img: '/aura/uploads/images/spa-bienestar.jpg', on: ad.spa }")

# Sumar una experiencia: con reserva, se reserva de verdad (folio + correo con invitación); sin reserva, queda en la
# estadía y se confirma junto con la habitación. El texto de respuesta lo arma el servidor en el idioma del huésped.
resub(r"  add\(k, msg\) \{.*?\n", r"""  add(k, msg, opt) {
    this.setState(s => ({ added: { ...s.added, [k]: true } }));
    const s = this.state;
    if (!NIA() || !NIA().service) return this.reply(msg);
    const payload = k === 'dinner' ? { kind: 'dinner', hora: s.hora }
      : k === 'sunset' ? { kind: 'sunset', sun: (opt && opt.sun) || s.sunChoice || 'sail' }
      : { kind: 'spa', ritual: (opt && opt.ritual) || this.spaPick || 'piedras', slot: s.wSlot };
    this.setState({ typing: true });
    NIA().service({ ...payload, code: s.code || undefined }).then(r => {
      this.setState({ typing: false });
      if (!r.ok && !r.needsStay) this.setState(st => ({ added: { ...st.added, [k]: false } }));
      this.push('nia', r.say || msg);
      if (r.ok) NIA().voice.notify(r.say);
    }).catch(() => { this.setState({ typing: false }); this.push('nia', msg); });
  }
""")
# Reserva de la estadía: experiencia del atardecer y ritual elegidos.
sub("    if (s.added.sunset) extras.sunset = true;\n", "    if (s.added.sunset) extras.sunset = s.sunChoice || 'sail';\n")
sub("    if (s.added.spa) extras.spa = { name: EXTRAS.spa.name, slot: s.wSlot };\n", "    if (s.added.spa) extras.spa = { ritual: this.spaPick || 'piedras', name: EXTRAS.spa.name, slot: s.wSlot };\n")
sub("k === 'sunset' ? (svc.SAIL || 0) : (svc.SPA || 0)",
    "k === 'sunset' ? (svc[{ sail: 'SAIL', sand: 'SAND', bar: 'BAR' }[s.sunChoice || 'sail']] || 0) : (svc[{ piedras: 'PIEDRAS', masaje: 'MASAJE', tina: 'TINA', yoga: 'YOGA' }[this.spaPick || 'piedras']] || 0)")

# ================================================================ chat tradicional (mientras se navega el sitio)
# "Seguir navegando" y el botón flotante N abren un chat clásico en la esquina; el modo inmersivo queda igual
# ("Empezar con Nía", "Hablar con Nía" o el botón "Modo inmersivo" del chat). Mismas respuestas del core.
sub('<button onClick="{{ dismissInvite }}" style="font-family:inherit;background:transparent',
    '<button onClick="{{ keepBrowsing }}" style="font-family:inherit;background:transparent')
sub('<button onClick="{{ openChat }}" style="position:fixed;right:24px;bottom:24px;',
    '<button onClick="{{ toggleClassic }}" aria-label="Chatear con Nía" style="position:fixed;right:24px;bottom:24px;')

# Tarjetas con foto dentro de los mensajes (galería de habitaciones del core), en ambos chats.
CARDS_HTML = ('<sc-if value="{{ m.hasCards }}"><div style="display:flex;gap:8px;overflow-x:auto;margin-top:10px;padding-bottom:4px;scrollbar-width:thin">'
              '<sc-for list="{{ m.cards }}" as="cd" hint-placeholder-count="3"><div style="flex:none;width:168px;background:#FBF8F1;border:1px solid #E3D8C3;white-space:normal">'
              '<div style="height:96px;background:#E6D8C0;background-image:url(\'{{ cd.img }}\');background-size:cover;background-position:center"></div>'
              '<div style="padding:8px 10px 10px"><div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;line-height:1.1;color:#16202B">{{ cd.title }}</div>'
              '<div style="font-size:11.5px;line-height:1.35;color:#6B6A60;margin-top:4px">{{ cd.sub }}</div>'
              '<sc-if value="{{ cd.hasBtn }}"><button onClick="{{ cd.go }}" style="margin-top:8px;width:100%;font-family:inherit;background:#16202B;color:#FBF8F1;border:0;padding:8px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer" style-hover="background:#B8623F">{{ cd.label }}</button></sc-if>'
              '</div></div></sc-for></div></sc-if>')
sub('{{ m.linkLabel }}</a></sc-if></div>', '{{ m.linkLabel }}</a></sc-if>' + CARDS_HTML + '</div>')
html = html.replace("this.push('nia', m.text, m.link ? { link: m.link, linkLabel: m.linkLabel } : null)", "this.push('nia', m.text, m)")

MSG_HTML = ('<sc-for list="{{ messages }}" as="m" hint-placeholder-count="1">'
            '<div style="align-self:{{ m.align }};max-width:88%;background:{{ m.bg }};color:{{ m.color }};border-radius:{{ m.radius }};padding:11px 15px;font-size:14px;line-height:1.5;box-shadow:{{ m.shadow }};border:{{ m.border }};white-space:pre-line">{{ m.text }}'
            '<sc-if value="{{ m.hasLink }}"><a href="{{ m.link }}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;background:#16202B;color:#FBF8F1;padding:10px 16px;font-size:11px;letter-spacing:.14em;text-transform:uppercase" style-hover="background:#B8623F">{{ m.linkLabel }}</a></sc-if>'
            + CARDS_HTML + '</div></sc-for>')
CLASSIC = (
    '<!-- CHAT TRADICIONAL -->\n'
    '<sc-if value="{{ classicOpen }}" hint-placeholder-val="{{ false }}">'
    '<div role="dialog" aria-label="Chat con Nía" style="position:fixed;z-index:60;right:{{ cl.right }};left:{{ cl.left }};bottom:{{ cl.bottom }};width:{{ cl.width }};height:{{ cl.height }};background:#F6F0E4;color:#16202B;border:1px solid #E3D8C3;border-radius:18px;box-shadow:0 24px 60px rgba(15,23,32,.28);overflow:hidden;display:flex;flex-direction:column;font-family:\'DM Sans\',sans-serif">'
    '<div style="background:#16202B;color:#FBF8F1;padding:12px 14px;display:flex;align-items:center;gap:12px">'
    '<span style="width:34px;height:34px;flex:none;border-radius:50%;background:#0F1720;border:1px solid #7A5A46;display:grid;place-items:center;position:relative;font-family:\'Cormorant Garamond\',serif;font-size:19px">N<span style="position:absolute;top:0;right:0;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#F6D9C4,#E0A27F 40%,#B8623F)"></span></span>'
    '<div style="flex:1;min-width:0"><div style="font-family:\'Cormorant Garamond\',serif;font-size:21px;line-height:1">Nía<span style="color:#D9A27F">.</span></div><div style="font-size:11.5px;color:#B9BEC0;margin-top:2px">Aura · Concierge digital</div></div>'
    '<button onClick="{{ goImmersive }}" title="Modo inmersivo" style="background:none;border:1px solid rgba(251,248,241,.35);color:#FBF8F1;font-family:inherit;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:7px 10px;cursor:pointer;white-space:nowrap" style-hover="background:#FBF8F1;color:#16202B">Modo inmersivo ↗</button>'
    '<button onClick="{{ closeClassic }}" aria-label="Cerrar" style="background:none;border:0;color:#B9BEC0;font-size:20px;cursor:pointer;padding:0 2px" style-hover="color:#FBF8F1">×</button></div>'
    '<div ref="{{ classicScrollRef }}" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px">'
    + MSG_HTML +
    '<sc-if value="{{ typing }}" hint-placeholder-val="{{ false }}"><div style="align-self:flex-start;background:#FBF8F1;border:1px solid #E3D8C3;border-radius:0 16px 16px 16px;padding:12px 16px;display:flex;gap:5px"><span style="width:6px;height:6px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s .2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s .4s infinite"></span></div></sc-if>'
    '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:2px"><sc-for list="{{ quickC }}" as="q" hint-placeholder-count="4"><button onClick="{{ q.go }}" style="font-family:inherit;background:transparent;border:1px solid #E3C7B3;color:#8F4528;border-radius:999px;padding:7px 13px;font-size:13px;cursor:pointer;text-align:left" style-hover="background:#FBF8F1;border-color:#B8623F">{{ q.label }}</button></sc-for></div>'
    '</div>'
    '<sc-if value="{{ voiceOn }}"><div style="display:flex;align-items:center;gap:8px;padding:7px 14px;border-top:1px solid #DDD0B8;font-size:12px;color:#7A5A46"><span style="width:8px;height:8px;border-radius:50%;background:#B8623F;animation:auraDot 1.2s infinite"></span>{{ voiceLabel }}</div></sc-if>'
    '<form onSubmit="{{ sendClassic }}" style="border-top:1px solid #DDD0B8;padding:10px 12px;display:flex;gap:8px;align-items:center">'
    '<button type="button" onClick="{{ toggleVoice }}" title="{{ micTitle }}" aria-label="{{ micTitle }}" style="width:38px;height:38px;flex:none;border-radius:50%;border:1px solid {{ micBd }};background:{{ micBg }};cursor:pointer;color:{{ micFg }};display:grid;place-items:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3"></path></svg></button>'
    '<input value="{{ draftC }}" onChange="{{ setDraftC }}" placeholder="Escribe a Nía…" aria-label="Mensaje para Nía" style="flex:1;min-width:0;height:38px;border:1px solid #DDD0B8;border-radius:999px;padding:0 16px;font-family:inherit;font-size:15px;background:#FBF8F1;outline:none;color:#16202B">'
    '<button type="submit" aria-label="Enviar" style="width:38px;height:38px;flex:none;border-radius:50%;border:0;background:#D9A27F;color:#16202B;font-size:18px;cursor:pointer">↑</button></form>'
    '</div></sc-if>\n')
sub('<!-- ============ NÍA MODE ============ -->', CLASSIC + '<!-- ============ NÍA MODE ============ -->')

# Lógica del chat clásico.
sub("stageRef = React.createRef(); scrollRef = React.createRef();", "stageRef = React.createRef(); scrollRef = React.createRef(); classicScrollRef = React.createRef();")
sub("const e = this.scrollRef.current; if (e) e.scrollTop = e.scrollHeight; }",
    "const e = this.scrollRef.current; if (e) e.scrollTop = e.scrollHeight; const c = this.classicScrollRef.current; if (c) c.scrollTop = c.scrollHeight; }")
sub("lang: (window.AuraI18n && window.AuraI18n.lang) || 'es',", "lang: (window.AuraI18n && window.AuraI18n.lang) || 'es', classic: false, draftC: '',")
sub("  pollPay(code) {", r"""  // ---- Chat tradicional ----
  openClassic() {
    this.hideInvite();
    this.setState({ classic: true });
    if (!this.state.messages.length) this.later(350, () => this.push('nia', EN() ? "Hi, I'm Nía, Aura's concierge. How can I help?" : 'Hola, soy Nía, la concierge de Aura. ¿En qué te ayudo?'));
  }
  // Enlaces de los correos: ?reserva=AUR-…&k=… (modificar o cancelar) o ?chat=1 (hablar con Nía).
  fromLink() {
    let q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    const code = q.get('reserva'), k = q.get('k');
    if (!code && !q.get('chat')) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    this.hideInvite();
    this.setState({ classic: true });
    if (!code || !k) { this.openClassic(); return; }
    this.setState({ typing: true });
    fetch('/api/aura/manage-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: NIA().sessionId, code, k }) })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { this.setState({ typing: false }); this.push('nia', EN() ? 'That link is no longer valid. Tell me your booking code and the email you booked with, and I will help you.' : 'Ese enlace ya no es válido. Dime tu código de reserva y el correo con que reservaste, y te ayudo.'); return; }
        if (d.lang && I18N()) I18N().set(d.lang);
        this.push('user', (EN() ? 'Manage booking ' : 'Gestionar mi reserva ') + d.code);
        this.askCore({ buttonId: 'manage:open:' + d.code, buttonTitle: (EN() ? 'Manage ' : 'Gestionar ') + d.code });
      })
      .catch(() => { this.setState({ typing: false }); this.openClassic(); });
  }
  sendClassic(text) {
    if (I18N()) I18N().observe(text);
    this.push('user', text);
    this.setState({ coreQuick: null });
    if (this.state.voice === 'on') { this.lastTyped = text; NIA().voice.sendText(text); return; }
    this.askCore({ text });
  }
  pollPay(code) {""")
sub("      acceptInvite: () => this.enter(), dismissInvite: () => this.hideInvite(),",
    "      acceptInvite: () => this.enter(), dismissInvite: () => this.hideInvite(),\n"
    "      keepBrowsing: () => this.openClassic(), toggleClassic: () => (this.state.classic ? this.setState({ classic: false }) : this.openClassic()),\n"
    "      closeClassic: () => this.setState({ classic: false }), goImmersive: () => { this.setState({ classic: false }); this.enter(); },\n"
    "      classicOpen: s.classic && !open, classicScrollRef: this.classicScrollRef,\n"
    "      cl: mob ? { right: '12px', left: '12px', bottom: '96px', width: 'auto', height: 'min(72vh,620px)' } : { right: '24px', left: 'auto', bottom: '108px', width: '380px', height: 'min(600px,calc(100vh - 140px))' },\n"
    "      draftC: s.draftC, setDraftC: e => this.setState({ draftC: e.target.value }),\n"
    "      sendClassic: e => { e.preventDefault(); const t = s.draftC.trim(); if (!t) return; this.setState({ draftC: '' }); this.sendClassic(t); },\n"
    "      quickC: s.coreQuick ? s.coreQuick.map(b => ({ label: b.label, go: () => this.pressQuick(b) }))\n"
    "        : [['menu:rooms', 'Ver habitaciones'], ['menu:book', 'Consultar disponibilidad'], ['menu:services', 'Experiencias y servicios'], ['menu:mine', 'Mi reserva']].map(([id, l]) => ({ label: l, go: () => this.pressQuick({ id, label: T(l) }) })),")
# Mensajes con tarjetas (fotos) y su botón (nía y huésped usan el mismo mapeo).
assert html.count("{ hasLink: !!m.link, link: m.link || '', linkLabel: m.linkLabel || '', text: m.alt ? m.alt[s.lang] || m.text : m.text,") == 2
html = html.replace("{ hasLink: !!m.link, link: m.link || '', linkLabel: m.linkLabel || '', text: m.alt ? m.alt[s.lang] || m.text : m.text,",
    "{ hasLink: !!m.link, link: m.link || '', linkLabel: m.linkLabel || '', hasCards: !!(m.cards && m.cards.length), cards: (m.cards || []).map(c => ({ ...c, hasBtn: !!c.btn, label: c.btn ? c.btn.label : '', go: () => c.btn && this.pressQuick(c.btn) })), text: m.alt ? m.alt[s.lang] || m.text : m.text,")
# Entrar al modo inmersivo cierra el chat clásico (los mensajes se conservan).
sub("    this.hideInvite();\n    this.setState({ nia: true });", "    this.hideInvite();\n    this.setState({ nia: true, classic: false });")

# ================================================================ velocidad de carga
# El modo inmersivo (fondos, platos, rituales, pósters de video) no se monta hasta que la página terminó de cargar
# o el huésped abre Nía: la portada y la landing cargan primero y en el celular se ahorran varios MB al inicio.
sub('data-screen-label="Nía Mode" style="position:fixed;inset:0;z-index:70;',
    'data-screen-label="Nía Mode" style="display:{{ stageDisplay }};position:fixed;inset:0;z-index:70;')
sub("lang: (window.AuraI18n && window.AuraI18n.lang) || 'es', classic: false,", "lang: (window.AuraI18n && window.AuraI18n.lang) || 'es', niaEver: false, classic: false,")
sub("    setTimeout(() => this.fromLink(), 300);\n",
    "    setTimeout(() => this.fromLink(), 300);\n"
    "    const warm = () => setTimeout(() => this.setState({ niaEver: true }), 2500);\n"
    "    if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm, { once: true });\n")
sub("      classicOpen: s.classic && !open,", "      stageDisplay: s.niaEver || open ? 'block' : 'none',\n      classicOpen: s.classic && !open,")
# La foto de portada es lo primero que se ve: se pide antes que todo lo demás.
sub('<script src="/aura/i18n.js"></script>',
    '<link rel="preload" as="image" href="/aura/uploads/images/portada.jpg" fetchpriority="high">\n'
    '<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
    '<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">\n<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png">\n'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="#16202B">\n'
    '<script src="/aura/i18n.js"></script>')

# Videos comprimidos (scripts/compress-aura-media.sh): versión en la URL para no mezclar con cachés del archivo anterior.
html = html.replace('.mp4"', '.mp4?v=2"')

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"[build-aura-page] OK -> {OUT.relative_to(ROOT)} ({len(html) // 1024} KB)")
