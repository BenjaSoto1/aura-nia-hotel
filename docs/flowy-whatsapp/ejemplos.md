# Conversaciones de ejemplo por WhatsApp

Generadas con el core real (modo guiado: respuestas deterministas con botones; en producción con IA el texto es más
natural, pero los botones, tarjetas, ids y herramientas son los mismos). Para cada turno: lo que escribe el huésped,
lo que responde Nía (partes del core) y el JSON exacto para WhatsApp Cloud API que devuelve `/api/integrations/whatsapp/inbound`.

## Saludo y menú

**Huésped:** Hola

**Nía:**

```text
Hola, soy Nía, la concierge digital de Aura. ¿Cómo puedo ayudarte a planificar tu estadía?
[botones: Ver habitaciones → menu:rooms | Reservar habitación → menu:book | Políticas y mascotas → menu:policies | Servicios → menu:services | Mi reserva → menu:mine | Hablar con una persona → menu:human]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "list",
      "body": {
        "text": "Hola, soy Nía, la concierge digital de Aura. ¿Cómo puedo ayudarte a planificar tu estadía?"
      },
      "action": {
        "button": "Ver opciones",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {
                "id": "menu:rooms",
                "title": "Ver habitaciones"
              },
              {
                "id": "menu:book",
                "title": "Reservar habitación"
              },
              {
                "id": "menu:policies",
                "title": "Políticas y mascotas"
              },
              {
                "id": "menu:services",
                "title": "Servicios"
              },
              {
                "id": "menu:mine",
                "title": "Mi reserva"
              },
              {
                "id": "menu:human",
                "title": "Hablar con una persona"
              }
            ]
          }
        ]
      }
    }
  }
]
```

</details>

## Reserva completa (tarifa flexible)

**Huésped:** Hola, quiero reservar del 20 al 22 de noviembre para 2 personas

**Nía:**

```text
¿Viajan con mascota? Aceptamos perros de hasta 10 kg.
[botones: Sin mascota → pets:0 | Sí, un perro → pets:1]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "¿Viajan con mascota? Aceptamos perros de hasta 10 kg."
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "pets:0",
              "title": "Sin mascota"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "pets:1",
              "title": "Sí, un perro"
            }
          }
        ]
      }
    }
  }
]
```

</details>

**Huésped:** No, sin mascota

**Nía:**

```text
Para 20–22 de noviembre (2 noches, 2 personas) hay opciones desde $554.42. ¿Cuál prefieres?
[tarifas: Habitación Deluxe · Flexible (pagas en el hotel) $630 → pick:cmvfdnhyu000fco3wh4wzq6ol | Habitación Deluxe · Prepago (−12%) $554 → pick:cmvfdnhz1000gco3wiez9k2a8 | Habitación Vista al Mar · Flexible (pagas en el hotel) $848 → pick:cmvfdnhz7000hco3w5w310nu1 | Habitación Vista al Mar · Prepago (−12%) $746 → pick:cmvfdnhzd000ico3wv81jig1k | Suite Vista al Mar · Flexible (pagas en el hotel) $1240 → pick:cmvfdnhzi000jco3wdatos7hy | Suite Vista al Mar · Prepago (−12%) $1092 → pick:cmvfdnhzo000kco3wmyj7qgxw]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "list",
      "body": {
        "text": "Para 20–22 de noviembre (2 noches, 2 personas) hay opciones desde $554.42. ¿Cuál prefieres?"
      },
      "action": {
        "button": "Ver tarifas",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {
                "id": "pick:cmvfdnhyu000fco3wh4wzq6ol",
                "title": "Habitación Deluxe · Fle…",
                "description": "$630 · 2 noches · Gratis hasta 48 h antes; después se cobra la primera …"
              },
              {
                "id": "pick:cmvfdnhz1000gco3wiez9k2a8",
                "title": "Habitación Deluxe · Pre…",
                "description": "$554 · 2 noches · No reembolsable."
              },
              {
                "id": "pick:cmvfdnhz7000hco3w5w310nu1",
                "title": "Habitación Vista al Mar…",
                "description": "$848 · 2 noches · Gratis hasta 48 h antes; después se cobra la primera …"
              },
              {
                "id": "pick:cmvfdnhzd000ico3wv81jig1k",
                "title": "Habitación Vista al Mar…",
                "description": "$746 · 2 noches · No reembolsable."
              },
              {
                "id": "pick:cmvfdnhzi000jco3wdatos7hy",
                "title": "Suite Vista al Mar · Fl…",
                "description": "$1,240 · 2 noches · Gratis hasta 48 h antes; después se cobra la primer…"
              },
              {
                "id": "pick:cmvfdnhzo000kco3wmyj7qgxw",
                "title": "Suite Vista al Mar · Pr…",
                "description": "$1,092 · 2 noches · No reembolsable."
              }
            ]
          }
        ]
      }
    }
  }
]
```

</details>

**Huésped:** ▸ (toca) Habitación Deluxe · Flexible (pagas en el hotel) → `pick:cmvfdnhyu000fco3wh4wzq6ol`

**Nía:**

```text
¡Excelente elección: Habitación Deluxe · Flexible (pagas en el hotel)! ¿Me dices tu nombre completo?
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "text",
    "text": {
      "body": "¡Excelente elección: Habitación Deluxe · Flexible (pagas en el hotel)! ¿Me dices tu nombre completo?"
    }
  }
]
```

</details>

**Huésped:** Camila Rojas

**Nía:**

```text
Gracias, Camila. ¿A qué correo te envío la confirmación?
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "text",
    "text": {
      "body": "Gracias, Camila. ¿A qué correo te envío la confirmación?"
    }
  }
]
```

</details>

**Huésped:** camila.rojas@example.com

**Nía:**

```text
¿Uso este número para tu reserva: +56900000102?
[botones: Sí, este número → phone:yes | Otro número → phone:other]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "¿Uso este número para tu reserva: +56900000102?"
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "phone:yes",
              "title": "Sí, este número"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "phone:other",
              "title": "Otro número"
            }
          }
        ]
      }
    }
  }
]
```

</details>

**Huésped:** Sí, ese es mi número

**Nía:**

```text
Tu reserva AUR-30053 está confirmada; pagas en el hotel. Te envié la confirmación a camila.rojas@example.com.
[reservation_summary]
24 h antes de tu llegada te escribiré por WhatsApp para tu check-in digital.
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "text",
    "text": {
      "body": "Tu reserva AUR-30053 está confirmada; pagas en el hotel. Te envié la confirmación a camila.rojas@example.com.\n\n*Reserva AUR-30053*\nHabitación Deluxe\n20–22 de noviembre\nFlexible (pagas en el hotel)\nTotal: $630.02\n\n24 h antes de tu llegada te escribiré por WhatsApp para tu check-in digital."
    }
  }
]
```

</details>

## Fotos de las habitaciones

**Huésped:** ¿Tienen fotos de las habitaciones?

**Nía:**

```text
Estas son nuestras habitaciones 🌊 Desliza para ver cada una:
[tarjetas con foto: Habitación Deluxe | Habitación Vista al Mar | Suite Vista al Mar]
[botones: Ver disponibilidad → menu:book | Experiencias → menu:services]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "text",
    "text": {
      "body": "Estas son nuestras habitaciones 🌊 Desliza para ver cada una:"
    }
  },
  {
    "type": "image",
    "image": {
      "link": "http://localhost:3000/aura/uploads/images/hab-deluxe-desayuno.jpg",
      "caption": "*Habitación Deluxe*\nDesde $289/noche · hasta 2 huéspedes\nMuros encalados, cama king y terraza privada con sombra. 38 m²."
    }
  },
  {
    "type": "image",
    "image": {
      "link": "http://localhost:3000/aura/uploads/images/hab-vista-mar-balcon.jpg",
      "caption": "*Habitación Vista al Mar*\nDesde $389/noche · hasta 4 huéspedes\nBalcón orientado al oeste sobre la bahía, hecho para atardeceres. 46 m²."
    }
  },
  {
    "type": "image",
    "image": {
      "link": "http://localhost:3000/aura/uploads/images/hab-suite-tina.jpg",
      "caption": "*Suite Vista al Mar*\nDesde $569/noche · hasta 4 huéspedes\nSala independiente, terraza envolvente y piscina privada. 78 m²."
    }
  },
  {
    "type": "interactive",
    "interactive": {
      "type": "list",
      "body": {
        "text": "¿Cuál te gustaría?"
      },
      "action": {
        "button": "Elegir",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {
                "id": "room:STD_CITY",
                "title": "Habitación Deluxe",
                "description": "Ver fechas"
              },
              {
                "id": "room:DLX_SEA",
                "title": "Habitación Vista al Mar",
                "description": "Ver fechas"
              },
              {
                "id": "room:STE_TER",
                "title": "Suite Vista al Mar",
                "description": "Ver fechas"
              }
            ]
          }
        ]
      }
    }
  },
  {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Elige una opción:"
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "menu:book",
              "title": "Ver disponibilidad"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "menu:services",
              "title": "Experiencias"
            }
          }
        ]
      }
    }
  }
]
```

</details>

## Políticas y mascotas

**Huésped:** ¿Aceptan perros? El mío pesa 8 kg

**Nía:**

```text
Check-in desde las 15:00 · check-out hasta las 12:00.
🐾 Perros de hasta 10 kg, USD 25 por noche.
• Flexible (pagas en el hotel): Gratis hasta 48 h antes; después se cobra la primera noche.
• Prepago (−12%): No reembolsable.
[botones: Reservar → menu:book]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Check-in desde las 15:00 · check-out hasta las 12:00.\n🐾 Perros de hasta 10 kg, USD 25 por noche.\n• Flexible (pagas en el hotel): Gratis hasta 48 h antes; después se cobra la primera noche.\n• Prepago (−12%): No reembolsable."
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "menu:book",
              "title": "Reservar"
            }
          }
        ]
      }
    }
  }
]
```

</details>

## Huésped en inglés

**Huésped:** Hi! Do you have a room for this weekend?

**Nía:**

```text
Hi, I'm Nía, Aura's digital concierge. How can I help you plan your stay?
[botones: See rooms → menu:rooms | Book a room → menu:book | Policies & pets → menu:policies | Services → menu:services | My booking → menu:mine | Talk to a person → menu:human]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "list",
      "body": {
        "text": "Hi, I'm Nía, Aura's digital concierge. How can I help you plan your stay?"
      },
      "action": {
        "button": "Ver opciones",
        "sections": [
          {
            "title": "Opciones",
            "rows": [
              {
                "id": "menu:rooms",
                "title": "See rooms"
              },
              {
                "id": "menu:book",
                "title": "Book a room"
              },
              {
                "id": "menu:policies",
                "title": "Policies & pets"
              },
              {
                "id": "menu:services",
                "title": "Services"
              },
              {
                "id": "menu:mine",
                "title": "My booking"
              },
              {
                "id": "menu:human",
                "title": "Talk to a person"
              }
            ]
          }
        ]
      }
    }
  }
]
```

</details>

## Pedir una persona

**Huésped:** Quiero hablar con una persona de recepción

**Nía:**

```text
Una persona del equipo seguirá contigo en breve.
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "text",
    "text": {
      "body": "Una persona del equipo seguirá contigo en breve."
    }
  }
]
```

</details>

**Huésped:** ¿Hay alguien?

**Nía:**

```text
Ya le avisé a recepción y una persona te responderá por aquí en breve. Si quieres que yo siga ayudándote mientras tanto, toca «Seguir con Nía».
[botones: Seguir con Nía → nia:resume]
```

<details><summary>JSON WhatsApp</summary>

```json
[
  {
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Ya le avisé a recepción y una persona te responderá por aquí en breve. Si quieres que yo siga ayudándote mientras tanto, toca «Seguir con Nía»."
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "nia:resume",
              "title": "Seguir con Nía"
            }
          }
        ]
      }
    }
  }
]
```

</details>
