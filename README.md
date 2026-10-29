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

Requiere Node.js 20 o superior. La base de datos viene incluida: [prisma/aura.db](prisma/aura.db) es una SQLite con el hotel cargado (habitaciones y tarifas) y sin reservas, así que no hay que crear ni configurar ninguna base.

```bash
git clone https://github.com/BenjaSoto1/aura-nia-hotel.git
```

```bash
cd aura-nia-hotel
```

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run build
```

```bash
npm start
```

Abre <http://localhost:3000>. Para desarrollo con recarga en caliente usa `npm run dev`.

Con `npm start` (o `npm run dev`) los recordatorios automáticos (pre-check-in, aviso de salida, encuesta, vencimiento de pagos) corren solos cada minuto dentro del mismo proceso. Para la demo, el ⏩ viaje en el tiempo sigue activo mientras `ENABLE_TIME_TRAVEL=true`.

Las reservas se guardan en `prisma/aura.db`. Para volver a la base limpia del repo:

```bash
git checkout prisma/aura.db
```

Pruebas automáticas (usan su propia base `prisma/test.db`):

```bash
npm run test
```

### Publicarla en un servidor

Sirve cualquier hosting que mantenga un proceso Node encendido y conserve el disco (Render, Railway, Fly.io, un VPS…): build `npm install && npm run build`, start `npm start`, y las variables de `.env.example` en el panel del hosting (`APP_PUBLIC_URL` con la URL pública). Si el hosting borra el disco en cada despliegue, monta un volumen persistente y apunta `DATABASE_URL` a un archivo dentro de él (cópiale `prisma/aura.db` la primera vez). Los hostings serverless no conservan la SQLite entre peticiones.

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

3. Copia el id que imprime en `ELEVENLABS_AGENT_ID` con `VOICE_PROVIDER=elevenlabs`. El agente queda público (solo hace falta el id); con `ELEVENLABS_PRIVATE=true` queda privado y entonces el servidor también necesita `ELEVENLABS_API_KEY`.

El `.env.example` ya trae el id del agente de Nía, así que la voz funciona sin crear nada.

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
