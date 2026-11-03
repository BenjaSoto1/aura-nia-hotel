# Nía en WhatsApp: paquete para Flowy

Todo lo necesario para que el equipo de Flowy ponga a **Nía**, la concierge digital de **Aura · Hotel Boutique & Casa de Mar**, a atender el WhatsApp del hotel con sus propios medios (número, proveedor y Cloud API).

| Archivo | Qué contiene |
|---|---|
| `README.md` | Esta guía: cómo integrar, contrato de la API, seguridad, botones y reglas de WhatsApp |
| `system-prompt.md` | System prompt completo de Nía (bloque estático + contexto dinámico), generado del código |
| `tools.json` | Las 16 herramientas del core con nombre, descripción y JSON Schema (formato Anthropic tools) |
| `voz-y-tono.md` | Personalidad, tono, estilo de respuesta, idiomas y configuración de voz (ElevenLabs) |
| `plantillas.md` | Mensajes proactivos y las plantillas de WhatsApp a registrar en Meta |
| `ejemplos.md` | Conversaciones de WhatsApp con el JSON exacto de Cloud API de cada respuesta (modo guiado) |
| `ejemplos-ia.md` | Conversaciones reales con IA capturadas en producción |

Para regenerar `system-prompt.md`, `tools.json` y `ejemplos.md` después de cambiar el hotel o el prompt:

```bash
EMAIL_PROVIDER=simulated npx tsx --env-file=.env scripts/export-flowy-kit.ts
```

---

## Dos formas de integrar

### Opción A (recomendada): usar el cerebro de Nía por API

Flowy recibe el webhook de WhatsApp, le pasa cada mensaje a Nía y envía la respuesta que ella devuelve, **ya en formato WhatsApp Cloud API**. Nía conserva todo lo que ya funciona en los demás canales:

- disponibilidad y precios reales, reservas, enlaces de pago, modificar y cancelar;
- correo de confirmación con invitación de calendario;
- recordatorios automáticos (pre-check-in 24 h antes, aviso de salida, encuesta);
- historial unificado con la web, Instagram y la voz;
- panel del hotel (`/panel`), donde el equipo puede tomar una conversación.

Flowy no tiene que replicar prompt, herramientas ni base de datos.

```
Huésped ──WhatsApp──▶ Meta Cloud API ──webhook──▶ Flowy
                                                     │  POST /api/integrations/whatsapp/inbound
                                                     ▼
                                              Nía (hotelaura-nia.netlify.app)
                                                     │  { messages: [...] }  ← respuesta lista
Huésped ◀──WhatsApp── Meta Cloud API ◀── Flowy ◀─────┘
                                                     ▲
       Recordatorios, pagos, mensajes del equipo ─────┘  POST al webhook de salida de Flowy
```

### Opción B: reconstruir a Nía en la plataforma de Flowy

Si Flowy prefiere correr su propio LLM, usen `system-prompt.md` + `voz-y-tono.md` como prompt y `tools.json` como definición de herramientas. Cada herramienta se puede ejecutar contra el servidor del hotel con `POST /api/tools/<nombre>` (ver más abajo). En ese caso, Flowy se encarga del historial, los botones y los mensajes proactivos.

---

## Opción A: contrato de la API

Base: `https://hotelaura-nia.netlify.app`

### 1. Mensaje entrante → respuesta de Nía

```
POST /api/integrations/whatsapp/inbound
Content-Type: application/json
x-aura-key: <WHATSAPP_INTEGRATION_KEY>
```

Mensaje de texto:

```json
{ "from": "+56912345678", "text": "Hola, quiero reservar", "name": "Camila", "messageId": "wamid.HBgL..." }
```

Respuesta a un botón o lista (el `id` que Nía mandó en el botón vuelve como `buttonId`):

```json
{ "from": "+56912345678", "buttonId": "menu:book", "buttonTitle": "Reservar habitación", "messageId": "wamid.HBgM..." }
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `from` | sí | Número del huésped en formato E.164 (con o sin `+`). Es la identidad del huésped en todo el sistema. |
| `text` | sí, si no hay botón | Texto del mensaje. |
| `buttonId` / `buttonTitle` | en respuestas a botones | `interactive.button_reply.id` o `interactive.list_reply.id` y su `title`. |
| `name` | no | Nombre del perfil de WhatsApp (`contacts[0].profile.name`). |
| `messageId` | recomendado | `messages[0].id`. Evita responder dos veces si Meta reintenta el webhook. |
| `hasImage` | no | `true` si el huésped mandó una foto (Nía no la guarda; responde igual). |

Respuesta (HTTP 200):

```json
{
  "to": "+56912345678",
  "mode": "ai",
  "language": "es",
  "messages": [ { "type": "interactive", "interactive": { "type": "list", "...": "..." } } ],
  "parts": [ { "type": "text", "text": "..." }, { "type": "rate_cards", "items": [] } ]
}
```

- **`messages`**: lista de mensajes listos para WhatsApp Cloud API. Envíenlos **en orden**, uno por uno, agregando `messaging_product` y `to`:

  ```
  POST https://graph.facebook.com/v23.0/{phone-number-id}/messages
  { "messaging_product": "whatsapp", "to": "+56912345678", ...messages[i] }
  ```

- **`parts`**: la misma respuesta en el formato interno de Nía, por si Flowy quiere dibujarla a su manera.
- **`mode`**: `ai` (Claude), `guided` (respaldo con botones), `special` (flujos fijos: check-in, pagos, servicios) o `staff`. Con `staff`, `messages` viene vacío: el equipo del hotel tomó la conversación en el panel, y lo que escriba llega por el webhook de salida.
- **`language`**: `es` o `en`. Nía detecta el idioma en cada mensaje; con esto Flowy elige la plantilla correcta.
- **Tiempo de respuesta**: de 2 a 15 s según lo que haga Nía (consultar disponibilidad, cotizar, reservar). Respondan `200` al webhook de Meta de inmediato y procesen en segundo plano.
- **Errores**: `401` (clave inválida), `400` (cuerpo inválido; viene `issues`). Si se repite un `messageId`, la respuesta es `{ "duplicate": true, "messages": [] }`.

### 2. Mensajes que Nía envía por su cuenta → webhook de Flowy

Algunos mensajes no responden a algo que escribió el huésped:
- recordatorio de pre-check-in;
- aviso de salida con la cuenta;
- encuesta;
- "pago recibido";
- vencimiento del bloqueo;
- mensajes que el equipo escribe desde el panel.

Nía los envía con `POST` a la URL de Flowy:

```
POST <WHATSAPP_OUTBOUND_WEBHOOK_URL>
Content-Type: application/json
x-aura-signature: <HMAC-SHA256 hex del cuerpo, con WHATSAPP_OUTBOUND_SECRET>
```

```json
{
  "event": "message.outbound",
  "to": "+56912345678",
  "lang": "es",
  "author": "agent",
  "template": true,
  "templateHint": null,
  "whatsapp": [ { "type": "text", "text": { "body": "¡Hola Camila! Mañana te esperamos…" } } ],
  "parts": [ { "type": "text", "text": "…" } ],
  "sentAt": "2026-10-19T15:00:00.000Z"
}
```

- `author`: `agent` (Nía), `staff` (equipo del hotel desde el panel) o `system`.
- `template: true` indica que es un mensaje proactivo. Si pasaron más de 24 h desde el último mensaje del huésped, WhatsApp exige enviarlo como **plantilla aprobada** (ver `plantillas.md`). Dentro de la ventana de 24 h se puede enviar `whatsapp` tal cual.
- Verifiquen la firma: `hex(HMAC_SHA256(WHATSAPP_OUTBOUND_SECRET, cuerpo_crudo)) == x-aura-signature`.
- Respondan `2xx`. Si el webhook falla, el panel del hotel muestra "⚠️ No se pudo entregar en WhatsApp" en esa conversación.

Para activar la salida, Flowy nos entrega su URL y la cargamos en `WHATSAPP_OUTBOUND_WEBHOOK_URL` (Netlify). La clave de entrada y el secreto de salida los compartimos por un canal seguro, nunca en este documento.

---

## Botones, listas y tarjetas

Nía decide qué botones mostrar; Flowy solo los envía y devuelve el `id` que toque el huésped.

| Lo que manda Nía | Cómo llega en `messages` | Límites de WhatsApp aplicados |
|---|---|---|
| Hasta 3 botones | `interactive` tipo `button` (sobre el último texto) | Título ≤ 20 caracteres |
| 4 a 10 opciones (menú) | `interactive` tipo `list`, botón "Ver opciones" | Fila ≤ 24, descripción ≤ 72 |
| Tarjetas de tarifas | `interactive` tipo `list` con `id` `pick:<quoteId>` y el total en la descripción | Hasta 10 opciones |
| Galería de habitaciones | Hasta 3 `image` con descripción + una lista con `room:<código>` | Fotos públicas en https |
| Enlace de pago / pre-check-in | `interactive` tipo `cta_url` (botón que abre la página) | Texto del botón ≤ 20 |

**Identificadores de botones** (vuelven como `buttonId`):

| `id` | Significado |
|---|---|
| `menu:open` · `menu:rooms` · `menu:book` · `menu:policies` · `menu:services` · `menu:mine` · `menu:human` | Menú principal: abrir menú, ver habitaciones (con fotos), reservar, políticas, servicios, mi reserva, hablar con una persona |
| `pets:0` · `pets:1` | Viaja sin o con mascota |
| `pick:<quoteId>` | Eligió una tarifa (habitación + tarifa) de la cotización |
| `room:<STD_CITY\|DLX_SEA\|STE_TER>` | Eligió una habitación de la galería |
| `phone:yes` · `phone:other` | Confirma usar su número de WhatsApp para la reserva |
| `manage:open:<código>` · `manage:dates:…` · `manage:room:…` · `manage:guests:…` · `manage:cancel:…` · `manage:cancelyes:…` | Gestionar una reserva: cambiar fechas, habitación o huéspedes, cancelar y confirmar la cancelación |
| `checkin_start:<código>` | Empezar el check-in digital por chat |
| `svc:<REST\|SPA\|TRAS…>:<código>` | Reservar un servicio para esa reserva |
| `folio:<código>` · `pay_balance:<código>` · `checkout:<código>` | Ver la cuenta, pagar el saldo, hacer checkout |
| `review:<1-5>:<código>` | Respuesta a la encuesta (estrellas) |
| `nia:resume` | El huésped pidió una persona y prefiere seguir con Nía mientras espera |

Además, si el huésped escribe **"menú"**, "opciones" o "ayuda", Nía muestra el menú principal.

---

## Reglas de WhatsApp que ya respeta Nía

- **Una sola pregunta por mensaje** y respuestas de 1 a 2 frases. Usa *negrita* de WhatsApp.
- **Teléfono**: en WhatsApp no lo pide; solo confirma que use el mismo número (`phone:yes`).
- **Pagos**: nunca pide ni repite datos de tarjeta; el pago va por botón (`cta_url`). Una reserva prepago se confirma sola cuando llega el pago, y ese aviso llega por el webhook de salida.
- **Persona humana**: si el huésped la pide o está molesto, Nía escala (`menu:human`). La conversación queda marcada en el panel y Nía deja de responder hasta que el equipo la devuelve, salvo que el huésped toque "Seguir con Nía".
- **Idioma**: español o inglés, detectado en cada mensaje.
- **Ventana de 24 h**: las respuestas a mensajes entrantes van siempre dentro de la ventana. Lo proactivo viene marcado con `template: true`.

---

## Opción B: herramientas por HTTP

Cada herramienta de `tools.json` se puede ejecutar en el servidor del hotel:

```
POST /api/tools/<nombre>
Content-Type: application/json
{ "channel": "whatsapp", "channelUserId": "+56912345678", "input": { ...parámetros según tools.json } }
```

Responde `{ "result": "<JSON con ok y datos o error>", "parts": [ ... ] }`. `result` es lo que el LLM debe leer; `parts` son las tarjetas y botones para mostrar. Si usan esta opción, avísennos para protegerla con una clave propia (hoy la usa la voz del navegador).

---

## Pruebas

Con la clave de entrada:

```bash
curl -X POST https://hotelaura-nia.netlify.app/api/integrations/whatsapp/inbound \
  -H "content-type: application/json" -H "x-aura-key: $WHATSAPP_INTEGRATION_KEY" \
  -d '{"from":"+56900000000","text":"Hola","messageId":"prueba-1"}'
```

Todo lo que pase se ve en el panel del hotel: **/panel/conversaciones** (canal WhatsApp) y **/panel/reservas**.
