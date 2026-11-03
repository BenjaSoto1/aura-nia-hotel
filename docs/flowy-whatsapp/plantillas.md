# Mensajes proactivos y plantillas de WhatsApp

Estos mensajes los inicia Nía, no responden a algo que escribió el huésped. Llegan a Flowy por el **webhook de salida** con `template: true`.

- **Dentro de 24 h** desde el último mensaje del huésped: se puede enviar el contenido de `whatsapp` tal cual.
- **Fuera de las 24 h:** WhatsApp exige una **plantilla aprobada** en Meta (WhatsApp Manager → Plantillas de mensajes).

Todas son de categoría **Utilidad** y se registran en `es` y `en_US`. El idioma del huésped viene en `lang`.

| Plantilla sugerida | Cuándo la envía Nía | Texto (es) | Variables | Botones |
|---|---|---|---|---|
| `aura_precheckin` | 24 h antes de la llegada | ¡Hola {{1}}! Mañana {{2}} te esperamos en Aura ({{3}}, reserva {{4}}). Adelanta tu check-in digital en menos de 2 minutos: foto de tu documento, firma y número de habitación. | 1 nombre · 2 fecha larga · 3 habitación · 4 código | Respuesta rápida "Empezar check-in" (`checkin_start:<código>`) + URL "Hacer pre-check-in en la web" |
| `aura_checkout` | 08:00 del día de salida | Buenos días {{1}} ☀️ Hoy es tu día de salida (check-out hasta las 12:00). Tu saldo pendiente es {{2}}. | 1 nombre · 2 saldo | Respuesta rápida "Pagar saldo y hacer checkout" (`pay_balance:<código>`) o "Hacer checkout" (`checkout:<código>`) |
| `aura_encuesta` | 24 h después del checkout | {{1}}, ¿cómo estuvo tu estadía en Aura? | 1 nombre | Hasta 3 respuestas rápidas en la plantilla (★★★★★ / ★★★ / ★); Nía acepta `review:<1-5>:<código>` |
| `aura_pago_recibido` | Al confirmarse un prepago | ¡Pago recibido! Tu reserva {{1}} está confirmada. Te enviamos la confirmación a {{2}}. | 1 código · 2 correo | — |
| `aura_reserva_confirmada` | Al crear una reserva flexible (si el huésped ya no está en la ventana) | Tu reserva {{1}} está confirmada; pagas en el hotel. Te enviamos la confirmación a {{2}}. | 1 código · 2 correo | — |
| `aura_bloqueo_vencido` | 30 min después de una reserva prepago sin pago | El bloqueo de tu reserva {{1}} venció sin pago. ¿Quieres que vuelva a cotizar? | 1 código | Respuesta rápida "Cotizar de nuevo" (`menu:book`) |
| `aura_mensaje_equipo` | Cuando alguien del hotel escribe desde el panel fuera de las 24 h | Hola {{1}}, te escribimos de Aura: {{2}} | 1 nombre · 2 mensaje | — |

Notas:

- El texto completo de cada mensaje, con las líneas de la cuenta, el resumen de la reserva, etc., viene siempre en `whatsapp` / `parts` del webhook. Las plantillas solo necesitan la versión corta aprobada.
- En el webhook, `author: "staff"` identifica los mensajes del equipo del hotel.
- Las respuestas a lo que escribe el huésped (cotizaciones, enlaces de pago, gestión de reservas) nunca necesitan plantilla: van dentro de la ventana de 24 h.
- Mientras las plantillas no estén aprobadas, Flowy puede enviar lo proactivo solo si el huésped escribió en las últimas 24 h, y descartar o encolar el resto.
