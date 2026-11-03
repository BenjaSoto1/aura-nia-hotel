# Conversaciones de ejemplo con IA (producción)

Capturadas el 19 de octubre de 2026 llamando a `/api/integrations/whatsapp/inbound` en https://hotelaura-nia.netlify.app (modo IA, Claude). Se detuvieron antes de crear reservas.

## Reserva en español

**Huésped:** Hola

**Nía:**

```text
¡Hola! Soy Nía, la concierge digital de Aura. Será un gusto ayudarte con tu estadía. ¿Para qué fechas te gustaría venir?
```

**Huésped:** Quiero reservar del 20 al 22 de noviembre para 2 personas

**Nía:**

```text
¡Qué buena fecha! Tenemos disponibilidad para esas noches. ¿Viajarán con alguna mascota?
```

**Huésped:** No, sin mascota

**Nía:**

```text
Aquí tienes las opciones para esas dos noches. La tarifa prepago tiene 12% de descuento, y la flexible se cancela gratis hasta 48 h antes. ¿Cuál eliges?
[tarifas: Habitación Deluxe · Flexible (pagas en el hotel) $630 → pick:… | Habitación Deluxe · Prepago (−12%) $554 → pick:… | Habitación Vista al Mar · Flexible (pagas en el hotel) $848 → pick:… | Habitación Vista al Mar · Prepago (−12%) $746 → pick:… | Suite Vista al Mar · Flexible (pagas en el hotel) $1240 → pick:… | Suite Vista al Mar · Prepago (−12%) $1092 → pick:…]
```

**Huésped:** ¿Cuál me recomiendas para una escapada en pareja?

**Nía:**

```text
Para una escapada en pareja, te recomiendo la Habitación Vista al Mar: su balcón mira al oeste sobre la bahía, ideal para los atardeceres. Si quieres algo especial, la Suite Vista al Mar tiene piscina privada y terraza envolvente. ¿Cuál te gusta más, y prefieres tarifa flexible o prepago?
```

## Huésped en inglés

**Huésped:** Hi! Do you have a sea view room for next weekend? We are 2 adults

**Nía:**

```text
Hi! We'd love to host you. Do you mean arriving Friday, October 30 and leaving Sunday, November 1?
```

## Pregunta de servicios y fotos

**Huésped:** ¿Tienen spa? ¿Y me muestras fotos de las habitaciones?

**Nía:**

```text
¡Sí, tenemos spa! Ofrecemos un ritual de bienestar al aire libre (USD 120), piedras calientes (USD 120), masaje en sala abierta (USD 150) y baño de flores en tu habitación (USD 80). Arriba te dejé las fotos de las habitaciones.

¿Para qué fechas te gustaría visitarnos?
[tarjetas con foto: Habitación Deluxe | Habitación Vista al Mar | Suite Vista al Mar]
```
