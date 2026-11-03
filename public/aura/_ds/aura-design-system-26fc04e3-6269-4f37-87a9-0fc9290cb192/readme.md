# Aura Design System

Aura es un hotel boutique ficticio del Caribe ("Hotel Boutique & Casa de Mar") usado como demo de **Nía**, la concierge digital de Flowy AI. El hotel tiene identidad propia; Nía adopta esa identidad (paleta, tipografía editorial, tono) y conserva solo su forma: monograma circular "N" con punto y burbuja con esquina superior izquierda recta. "Con tecnología de Flowy AI" aparece de forma discreta.

**Fuente:** `uploads/Hotel Demo Nia.dc.html` (demo completa: marca, homepage 1200, widget Nía, WhatsApp/Instagram, móvil, correo) y componentes/tarjetas subidos. No hay Figma ni repositorio. No hay logo: el wordmark es texto (Cormorant Garamond, "ra" en cursiva), sin emblema.

## CONTENT FUNDAMENTALS
- Idioma: español neutro. Tú (no usted): "Te esperamos, Camila." "Escribe a Nía…".
- Tono: cálido, elegante, conciso. Frases cortas, sensoriales (luz, sal, atardecer). Sin signos de exclamación en la voz del hotel; sin emoji.
- Titulares editoriales con énfasis en cursiva en la frase final: "Una casa serena *frente al mar.*"
- Etiquetas y botones en VERSALITAS con tracking amplio: "VER DISPONIBILIDAD", "LLEGADA".
- Nía habla en primera persona ("Hola, soy Nía. ¿Cómo puedo ayudarte a planificar tu estadía?"), ofrece acciones rápidas, no repite datos ya conocidos, traspasa a una persona cuando conviene.
- Datos: fechas "14–17 nov", precios "$1,860", códigos "AUR-48213".

## VISUAL FOUNDATIONS
- **Color:** Marfil #F6F0E4 (fondo), Cal #FBF8F1 (tarjetas), Arena #E6D8C0, Carbón marino #16202B (texto/UI/CTA), Verde bruma #5E7468 (secundario), Terracota #B8623F (acento), más apoyo: carbón profundo, cobre, melocotón (acento sobre oscuro), terracota oscuro (texto acento), líneas cálidas. Sin azules/púrpuras.
- **Tipo:** Cormorant Garamond (editorial: wordmark, titulares, precios, monograma Nía) + DM Sans (UI). Ambas Google Fonts.
- **Esquinas:** rectas (0) en botones del hotel; 4px tarjetas; 12px opciones móviles; 18px widget Nía; 999 píldoras; burbuja `0 16 16 16`, usuario `16 16 4 16`.
- **Espaciado:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 56.
- **Sombras:** cálidas y suaves; burbuja terracota 12%, widget carbón 25%, lanzador con halo melocotón. Tarjetas del hotel: borde 1px, sin sombra.
- **Fondos:** bloques planos alternados (marfil, carbón, arena, bruma); hero con foto a sangre y degradado de protección carbón. Placeholders de imagen: degradados 150° con etiqueta "IMG · …" en versalitas; proporciones fijas (3:4, 4:5, 16:10). Fotografía final: luz lateral natural, grano suave, materiales cálidos.
- **Bordes:** 1px --aura-line; separadores finos; links con subrayado terracota.
- **Hover/press:** el enlace pasa a terracota; no hay animación llamativa. Único movimiento: tres puntos "escribiendo" (opacidad pulsante).
- **Transparencia/blur:** solo degradados de protección sobre imagen; sin blur.

## ICONOGRAPHY
No se usa librería de iconos. Solo caracteres tipográficos: → ↑ ← × ☰ y puntos de estado. No emoji. Si se necesitan iconos, usar trazo fino (p. ej. Lucide, sustitución a confirmar).

## INDEX
- `styles.css` → `tokens/colors.css`, `typography.css`, `effects.css`
- `guidelines/` — tarjetas de fundamentos (color, tipo, sombras, radios, marca)
- `components/actions` Button · `components/nia` NiaAvatar, NiaBubble, NiaQuickReply · `components/hotel` BookingBar, RoomCard · `components/booking` BookingForm · `components/email` ConfirmationEmail
- `ui_kits/aura-site/` — homepage del hotel con Nía (interactivo: Reservar / lanzador abre el chat)
- `uploads/` — fuentes originales

**Adiciones intencionales:** Button, NiaAvatar/NiaBubble/NiaQuickReply (los componentes subidos los requieren).
