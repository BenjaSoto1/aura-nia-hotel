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
| `/` | **Consola omnicanal**: los 5 canales lado a lado + viaje en el tiempo |
| `/canal/web` | Sitio del hotel con el asistente de voz flotante (y "Prefiero escribir") |
| `/canal/whatsapp`, `/canal/instagram`, `/canal/messenger`, `/canal/telefono` | Cada simulador a pantalla completa |
| `/panel` | Reservas, filtros por estado y canal, contadores |
| `/panel/reservas/[id]` | Línea de tiempo, folio, pagos, recordatorios y **vista previa de los correos** |
| `/panel/conversaciones` | Bandeja de todos los canales, llamadas a herramientas y **Tomar control** |
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

1. Abre `/` con los cinco canales a la vista.
2. **Web por voz**: *"Hola, quiero dos noches del 14 al 16 de noviembre para dos personas y un perro pequeño"* → aparecen las tarifas → *"La prepago"* (o toca la tarjeta) → nombre, correo y teléfono → botón de pago → paga con `4242…`.
3. Muestra la reserva `confirmed` en `/panel`, **el correo en Gmail** (o en la pestaña Correos del detalle) y **el evento en Google Calendar**.
4. **Teléfono**: llama con otro número y reserva la **Habitación Deluxe Flexible**. Nía dice que envió el enlace por WhatsApp y el mensaje aparece en el WhatsApp simulado de ese número.
5. **Instagram**: *"¿Aceptan perros de 12 kg?"* → responde con la política (hasta 10 kg) y ofrece alternativas. El botón **WhatsApp** pasa la conversación con la cotización cargada.
6. **⏩ 24 h antes del check-in** → llega la plantilla de pre-check-in por WhatsApp → *Empezar check-in* → acepta → adjunta una foto (📎) → firma → "Habitación 412".
7. Por WhatsApp: *"Quiero reservar el spa"* → fecha y hora → se suma al folio → **⏩ Día de salida** → *Pagar saldo y hacer checkout* → paga → llega el comprobante por correo.
8. En `/panel/conversaciones`, **Tomar control** de una conversación y responde como staff; el agente se calla hasta *Devolver al agente*.

## Idiomas

El agente detecta el idioma en cada mensaje escrito ([lib/agent/language.ts](lib/agent/language.ts)) y responde en español o inglés, en modo IA y en modo guiado. Si el huésped cambia de idioma a mitad de la conversación, el agente cambia también. El idioma se guarda en el huésped, así que las tarjetas, los botones, el pago, el pre-check-in, los recordatorios y los correos salen en ese idioma. Los mensajes sin señales claras (un nombre, un correo, una fecha) mantienen el idioma actual.

## Arquitectura en una línea

Todos los canales llaman a `handleTurn()` ([lib/agent/core.ts](lib/agent/core.ts)); las reglas de negocio viven en las herramientas ([lib/tools](lib/tools)) y en [lib/lifecycle.ts](lib/lifecycle.ts) (confirmación, correo, calendario, recordatorios, checkout). Los canales solo traducen entrada y pintan las `parts` de salida. La voz de ElevenLabs llama a las mismas herramientas por `POST /api/tools/[name]`.

Reglas de seguridad implementadas: los números de tarjeta (Luhn) se enmascaran antes de guardarse o llegar al modelo; los pagos van siempre por enlace; la reserva prepaga solo se confirma con el webhook (o el pago simulado); los precios se recalculan siempre desde el Hotel Pack; la foto del documento nunca sale del navegador.
