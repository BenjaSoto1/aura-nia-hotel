# Aura · Hotel Boutique & Casa de Mar — con Nía (prototipo)

Aura es un hotel ficticio del Caribe; Nía es su concierge digital (Flowy AI). Un solo cerebro atiende **WhatsApp, Instagram, Messenger, web por voz y teléfono**: reserva, cobra, envía la confirmación por correo, crea el evento de calendario, manda recordatorios y hace check-in y checkout. La especificación completa está en [BRIEF.md](BRIEF.md).

| Pieza | Estado en el prototipo |
|---|---|
| Cerebro | Claude (`claude-sonnet-5-5`) con *tool use*. Sin API key funciona el **modo guiado** (botones y texto simple) con las mismas herramientas |
| WhatsApp, Instagram, Messenger | **Simulados** dentro de la app (no requieren Meta) |
| Web por voz y teléfono | **Agente de ElevenLabs** (client tools → core). Sin agente configurado, voz del navegador (Chrome) |
| Pagos | Stripe en modo prueba; sin claves, **pago simulado** con la misma lógica del webhook |
| Calendario y correo | Google Calendar y Gmail (OAuth); sin conectar, **simulados** y visibles en el panel |
| Identidad (Jumio) y firma | Simulados |

La app arranca y permite el flujo completo **sin ninguna clave**. Cada integración real se activa sola al poner su clave en `.env`, y el estado (real o simulado) aparece arriba a la derecha.

## Instalación

Requiere Node.js 20 o superior.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:reset
```

```bash
npm run dev
```

Abre <http://localhost:3000>.

Para la demo en vivo usa el modo producción, que responde mucho más rápido que `dev` (el viaje en el tiempo sigue activo mientras `ENABLE_TIME_TRAVEL=true`; ponlo en `false` si publicas la app):

```bash
npm run demo
```

Pruebas automáticas (herramientas, carrera por la última habitación, flujo completo, enmascarado de tarjetas):

```bash
npm run test
```

## Pantallas

| Ruta | Qué es |
|---|---|
| `/` y `/canal/web` | **Sitio de Aura · Nía Mode** (diseño de Claude Design): el hotel cambia de ambiente según la conversación; chat, voz (ElevenLabs) y reserva reales |
| `/consola` | **Consola omnicanal**: los 5 canales lado a lado + viaje en el tiempo |
| `/sitio-clasico` | Versión anterior del sitio (Next.js), conservada como referencia |
| `/personaje` | Mascota 3D (experimento) |
| `/canal/whatsapp`, `/canal/instagram`, `/canal/messenger`, `/canal/telefono` | Cada simulador a pantalla completa |
| `/panel` | **Resumen** del administrador: ingresos, reservas, tarifa media, conversión, cancelaciones (vs período anterior), reservas por día, canales, tarifas, ocupación de 30 días y operación de hoy |
| `/panel/reservas` | Búsqueda, filtros (estado, canal, tarifa, habitación, fechas), orden y **exportar CSV** |
| `/panel/reservas/[id]` | Recepción: **modificar estadía**, agregar servicio, check-in, checkout con cobro, enviar enlace de pago, cancelar; línea de tiempo, folio, pagos y correos |
| `/panel/calendario` | Habitaciones libres por noche y estadías por tipo de habitación |
| `/panel/huespedes` | Perfiles unificados (canales, idioma, estadías, gasto) con su historial |
| `/panel/conversaciones` | Bandeja de todos los canales, llamadas a herramientas y **Tomar control** |
| `/panel/servicios` | Brasa, spa, navegación y traslados agendados |
| `/panel/correos` | Todos los correos con su estado, errores y **reenviar** |
| `/panel/hotel` | Hotel Pack vigente, estado de integraciones y viaje en el tiempo |

El panel pide contraseña cuando `ADMIN_PASSWORD` está definida (en Netlify, defínela siempre: muestra datos de huéspedes). Sin ella queda abierto, pensado solo para desarrollo local.
| `/pago/simulado/[id]`, `/pago/exito` | Checkout simulado y retorno de Stripe |
| `/checkin/[token]` | Pre-check-in móvil (documento, firma, garantía) |

## Configuración de cuentas (opcional)

### Anthropic (cerebro con IA)

Crea una API key en console.anthropic.com y ponla en `ANTHROPIC_API_KEY`. Sin ella, el agente funciona en modo guiado. `AGENT_MODE=guided` fuerza el modo guiado aunque haya key.

### ElevenLabs (voz web y teléfono)

1. Crea una API key en elevenlabs.io (*Developers → API keys*) con permiso de Agents y ponla en `.env` como `ELEVENLABS_API_KEY`.
2. Crea el agente de Nía (prompt del Hotel Pack + las herramientas del core como *client tools*). Si ya existe `ELEVENLABS_AGENT_ID`, el mismo comando lo actualiza:

```bash
npx tsx --env-file=.env scripts/elevenlabs-agent.ts
```

3. Copia el id que imprime en `ELEVENLABS_AGENT_ID` (en `.env` y en Netlify) con `VOICE_PROVIDER=elevenlabs`. El agente queda público (solo hace falta el id); con `ELEVENLABS_PRIVATE=true` queda privado y entonces Netlify también necesita `ELEVENLABS_API_KEY`.

La voz está en el botón **Hablar con Nía** del sitio, en el micrófono del widget y en el simulador de llamada (`/canal/telefono`).

### Stripe (modo prueba)

1. Crea una cuenta gratuita en stripe.com y activa el **modo de prueba**.
2. Copia la clave secreta de prueba (`sk_test_...`) en `STRIPE_SECRET_KEY`. Las claves live se ignoran a propósito.
3. Instala Stripe CLI y ejecuta `stripe login`.
4. En otra terminal:

```bash
npm run stripe:listen
```

5. Copia el `whsec_...` que imprime en `STRIPE_WEBHOOK_SECRET` y reinicia `npm run dev`.
6. Paga con `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. La reserva prepaga pasa a `confirmed` **solo cuando llega el webhook**.

### Google Calendar y Gmail

1. Crea un proyecto en Google Cloud Console.
2. Habilita **Google Calendar API** y **Gmail API**.
3. Configura la pantalla de consentimiento OAuth en modo *Testing* y agrega la cuenta Google del hotel como usuario de prueba.
4. Crea credenciales **OAuth client ID** de tipo *Web application* con el redirect `http://localhost:3000/api/google/callback`.
5. Copia Client ID y Secret al `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), reinicia y abre <http://localhost:3000/api/google/auth> para autorizar.
6. Opcional: `GMAIL_SENDER=tu-cuenta@gmail.com` para que el remitente se vea como "Aura".

El token queda en `.data/google-token.json` (ignorado por git). Alternativa de correo: `EMAIL_PROVIDER=smtp` con `SMTP_USER` y una contraseña de aplicación de Gmail en `SMTP_APP_PASSWORD`.

### Instagram real (DMs y comentarios)

Con `INSTAGRAM_ACCESS_TOKEN`, Nía responde de verdad en la cuenta del hotel:

- **DMs:** el webhook [app/api/webhooks/instagram/route.ts](app/api/webhooks/instagram/route.ts) pasa cada mensaje al mismo core que el resto de canales; la respuesta (texto, botones rápidos, enlaces de pago y pre-check-in) sale por la API. Los mensajes del equipo desde `/panel/conversaciones` y los avisos automáticos también se entregan.
- **Comentarios:** preguntas (precio, fechas, reservas…) → respuesta pública breve + respuesta privada por DM con lo que contestaría Nía. Quejas → respuesta pública empática, DM y la conversación queda marcada para una persona. Elogios o emojis → gracias público. Todo queda en el panel.
- El simulador `/canal/instagram` sigue funcionando: sus usuarios de prueba nunca se envían a Meta.

Pasos ([lib/integrations/instagram.ts](lib/integrations/instagram.ts) explica ambos tipos de token):

1. En developers.facebook.com → tu app → **Instagram → API setup with Instagram business login**: agrega la cuenta profesional del hotel y genera el token (`IGAA…`) con `instagram_business_basic`, `instagram_business_manage_messages` e `instagram_business_manage_comments`. Cópialo en `INSTAGRAM_ACCESS_TOKEN` y el **Instagram app secret** en `INSTAGRAM_APP_SECRET`.
2. En la app de Instagram del hotel: Configuración → Mensajes y respuestas → Herramientas conectadas → **Permitir acceso a los mensajes**.
3. Publica la app (Netlify) o abre un túnel https hacia tu PC y pon esa URL en `APP_PUBLIC_URL`.
4. `npx tsx --env-file=.env scripts/instagram-setup.ts --subscribe` revisa permisos, detecta la cuenta, la suscribe y te imprime la **URL del webhook** y el **token de verificación** para pegarlos en Meta (campos `messages`, `messaging_postbacks`, `comments`).
5. Mientras la app de Meta esté en modo desarrollo, solo responde a cuentas con rol en la app (agrégalas como testers). Para atender al público, Meta pide la revisión de la app (Advanced Access de mensajes y comentarios).

## Despliegue de pruebas en Netlify

En Netlify no hay disco persistente ni un proceso siempre encendido, así que el prototipo cambia tres cosas solo allí: la base es **Postgres** (en local sigue siendo SQLite), los recordatorios los dispara una **función programada** cada minuto ([netlify/functions/reminders-cron.mts](netlify/functions/reminders-cron.mts)) y el token de Google se guarda **en la base**. El build lo hace [scripts/netlify-build.mjs](scripts/netlify-build.mjs): genera el esquema Postgres, crea las tablas, carga el Hotel Pack y compila.

1. Crea y vincula el sitio (CLI de Netlify, desde esta carpeta; si el nombre está tomado, usa otro):

```bash
npx netlify-cli login
```

```bash
npx netlify-cli sites:create --name aura-nia-demo
```

2. Base de datos: la forma más corta es Netlify DB (Neon), que define `NETLIFY_DATABASE_URL` sola. Alternativa: crea un proyecto gratis en neon.tech y pega su URL en `DATABASE_URL`.

```bash
npx netlify-cli db init
```

3. Variables en *Site configuration → Environment variables* (scope: Builds y Functions):

| Variable | Valor |
|---|---|
| `ENABLE_TIME_TRAVEL` | `true` (para probar recordatorios con ⏩) |
| `EMAIL_PROVIDER` | `smtp` |
| `SMTP_USER` | tu cuenta Gmail |
| `SMTP_APP_PASSWORD` | contraseña de aplicación de esa cuenta (myaccount.google.com → Seguridad → Contraseñas de aplicaciones; requiere verificación en 2 pasos) |
| `EMAIL_FROM_NAME` | `Aura · Hotel Boutique & Casa de Mar` |
| `CRON_SECRET` | cualquier texto largo (protege `/api/cron/reminders`) |
| `ANTHROPIC_API_KEY` | opcional: sin ella, Nía funciona en modo guiado |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | opcional: sin ellas, pago simulado |

`APP_PUBLIC_URL` puede quedar vacía: se usa la URL del sitio. Si prefieres Gmail API en vez de SMTP, agrega `https://<tu-sitio>.netlify.app/api/google/callback` como redirect en Google Cloud, define `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, usa `EMAIL_PROVIDER=gmail` y abre `/api/google/auth` en el sitio publicado.

4. Publica:

```bash
npx netlify-cli deploy --build --prod
```

5. Prueba el correo: en `/canal/web` reserva con tarifa **Flexible** y tu correo real; la confirmación sale al instante. En `/panel/reservas/<id>` está el historial de correos (proveedor y estado) y el botón **Reenviar confirmación**.

**Stripe en Netlify:** en el dashboard de Stripe (modo prueba) → *Developers → Webhooks* → endpoint `https://<tu-sitio>.netlify.app/api/webhooks/stripe` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `checkout.session.expired`; copia su `whsec_...` en `STRIPE_WEBHOOK_SECRET`.

**Consumo:** cada consulta de los simuladores es una invocación de función. El polling baja a una consulta cada 4 s tras 30 s sin actividad, pero no dejes la consola abierta horas en el plan gratuito.

### Cambiar de hotel

Todo sale de [hotel-pack.yaml](hotel-pack.yaml): nombre, colores, habitaciones, tarifas, impuestos, políticas, servicios y fotos. El pack actual es el de **Aura** (identidad del diseño "Hotel Demo Nía"); los códigos internos de habitación (`STD_CITY`, `DLX_SEA`, `STE_TER`) se mantienen y sus nombres visibles son Habitación Deluxe, Habitación Vista al Mar y Suite Vista al Mar. Tras cambiarlo ejecuta `npm run db:reset` (o solo el seed).

## Guion del demo

1. Abre `/consola` con los cinco canales a la vista (el sitio de Aura está en `/`).
2. **Web por voz**: *"Hola, quiero dos noches del 14 al 16 de noviembre para dos personas y un perro pequeño"* → aparecen las tarifas → *"La prepago"* (o toca la tarjeta) → nombre, correo y teléfono → botón de pago → paga con `4242…`.
3. Muestra la reserva `confirmed` en `/panel`, **el correo en Gmail** (o en la pestaña Correos del detalle) y **el evento en Google Calendar**.
4. **Teléfono**: llama con otro número y reserva la **Habitación Deluxe Flexible**. Nía dice que envió el enlace por WhatsApp y el mensaje aparece en el WhatsApp simulado de ese número.
5. **Instagram**: *"¿Aceptan perros de 12 kg?"* → responde con la política (hasta 10 kg) y ofrece alternativas. El botón **WhatsApp** pasa la conversación con la cotización cargada.
6. **⏩ 24 h antes del check-in** → llega la plantilla de pre-check-in por WhatsApp → *Empezar check-in* → acepta → adjunta una foto (📎) → firma → "Habitación 412".
7. Por WhatsApp: *"Quiero reservar el spa"* → fecha y hora → se suma al folio → **⏩ Día de salida** → *Pagar saldo y hacer checkout* → paga → llega el comprobante por correo.
8. En `/panel/conversaciones`, **Tomar control** de una conversación y responde como staff; el agente se calla hasta *Devolver al agente*.

## Idiomas

El agente detecta el idioma en cada mensaje escrito ([lib/agent/language.ts](lib/agent/language.ts)) y responde en español o inglés, en modo IA y en modo guiado. Si el huésped cambia de idioma a mitad de la conversación, el agente cambia también. El idioma se guarda en el huésped, así que las tarjetas, los botones, el pago, el pre-check-in, los recordatorios y los correos salen en ese idioma. Los mensajes sin señales claras (un nombre, un correo, una fecha) mantienen el idioma actual.

## Sitio de Aura (diseño Nía Mode)

El sitio público es el diseño **"Hotel Aura · Nía Immersive"** hecho en Claude Design. Se sirve tal cual (mismo runtime, mismas animaciones) y se conecta al cerebro del hotel:

| Pieza | Archivo |
|---|---|
| Diseño original (no se sirve) | [design/aura/hotel-aura-nia-immersive.dc.html](design/aura/hotel-aura-nia-immersive.dc.html) y los prompts de diseño |
| Página servida (generada) | `public/aura/index.html` + `support.js`, `_ds/` (design system) y `uploads/images/` (fotos optimizadas para web) |
| Puente con el core | [public/aura/nia-bridge.js](public/aura/nia-bridge.js): chat → `/api/channels/web/message`, voz → ElevenLabs (client tools → `/api/tools/*`), reserva → `/api/aura/book` |
| Reserva desde el panel "Tu estadía" | [app/api/aura/book/route.ts](app/api/aura/book/route.ts): cotiza, reserva, suma experiencias al folio y envía la confirmación |
| Disponibilidad real (buscador y panel) | [app/api/aura/availability/route.ts](app/api/aura/availability/route.ts): habitaciones libres y precio total por tarifa, solo lectura |
| Idioma del sitio | [public/aura/i18n.js](public/aura/i18n.js): diccionario ES→EN de los textos del diseño |
| Generador | [scripts/build-aura-page.py](scripts/build-aura-page.py) |
| Optimización de medios | [scripts/compress-aura-media.sh](scripts/compress-aura-media.sh) (videos) y [scripts/optimize-aura-images.py](scripts/optimize-aura-images.py) (fotos); los originales quedan en `design/aura/originals/` |

Cómo se comporta: las intenciones visuales (habitaciones, Brasa, atardecer, bienestar, tu estadía) siguen la coreografía del diseño; todo lo demás (preguntas, políticas, "quiero reservar del 14 al 16") lo responde el core real. El micrófono del panel y "Hablar con Nía" abren la voz de ElevenLabs; lo que el huésped dice también cambia el ambiente del sitio. El panel de reserva pide nombre, correo, teléfono y tarifa, y crea una reserva real (código `AUR-…`) con correo de confirmación; con prepago muestra el botón de pago seguro y espera la confirmación.

- **Buscador del hero:** Llegada / Salida / Huéspedes / Habitación → "Ver disponibilidad" consulta el inventario real, Nía muestra qué habitaciones quedan y su precio total, y abre el panel de reserva ya completo (fechas, huéspedes y habitación). En el panel se pueden cambiar fechas, huéspedes y habitación; el total es el real con impuestos de prueba.
- **Voz → panel:** cuando Nía cotiza o reserva por voz, el panel se llena solo con lo que dijo el huésped (fechas, huéspedes, habitación, tarifa y total); al crear la reserva aparece el código y, con prepago, el botón de pago.
- **Idioma:** botón ES/EN en la navegación y en Nía Mode; además el sitio cambia solo si el huésped escribe o habla en inglés (o en español). También sirve `/?lang=en`.
- **Servicios del hotel:** "Reservar mesa" (Brasa), "Agregar a mi estadía" (navegación, cena en la arena o cóctel en la terraza) y "Reservar ritual" (piedras calientes, masaje, baño de flores, yoga). Si el huésped ya tiene reserva, el servicio se reserva de verdad ([app/api/aura/service/route.ts](app/api/aura/service/route.ts)): va al folio y le llega un **correo de confirmación con invitación de calendario** ([emails/ServiceBooked.tsx](emails/ServiceBooked.tsx)). Si todavía no reservó, queda en "Tu estadía" y se confirma junto con la habitación, en el mismo correo. Lo mismo vale por chat, WhatsApp, voz (`book_service`) y desde el panel. Catálogo, precios, horarios y duración: `servicios` en `hotel-pack.yaml` (tras cambiarlo, vuelve a sincronizar el agente de voz con `npx tsx --env-file=.env scripts/elevenlabs-agent.ts`).
- **Carga:** los videos de fondo se comprimieron (25,7 MB → 3,1 MB) y se descargan recién al entrar a su escena; las fotos bajaron de 9,8 MB a 5 MB.

Si el diseño cambia, reemplaza el `.dc.html` en `design/aura/` y ejecuta:

```bash
python scripts/build-aura-page.py
```

El script avisa si algún fragmento que conecta con el core ya no existe en el diseño nuevo. Las fotos nuevas van en `public/aura/uploads/images/`; después ejecuta `python scripts/optimize-aura-images.py`. Si agregas textos nuevos al diseño, suma su traducción en `public/aura/i18n.js`.

## Arquitectura en una línea

Todos los canales llaman a `handleTurn()` ([lib/agent/core.ts](lib/agent/core.ts)); las reglas de negocio viven en las herramientas ([lib/tools](lib/tools)) y en [lib/lifecycle.ts](lib/lifecycle.ts) (confirmación, correo, calendario, recordatorios, checkout). Los canales solo traducen entrada y pintan las `parts` de salida. La voz de ElevenLabs llama a las mismas herramientas por `POST /api/tools/[name]`.

Reglas de seguridad implementadas: los números de tarjeta (Luhn) se enmascaran antes de guardarse o llegar al modelo; los pagos van siempre por enlace; la reserva prepaga solo se confirma con el webhook (o el pago simulado); los precios se recalculan siempre desde el Hotel Pack; la foto del documento nunca sale del navegador.
