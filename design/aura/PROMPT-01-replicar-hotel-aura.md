# PROMPT 01 — REPLICAR HOTEL AURA

## OBJETIVO

Quiero reconstruir en **Claude Design** el sitio web actual de **Hotel Aura**, que ya existe y está desplegado en Netlify.

Este NO es un proyecto para diseñar un hotel nuevo.

El objetivo de esta primera etapa es:

> **REPLICAR CON LA MAYOR FIDELIDAD POSIBLE LA EXPERIENCIA WEB EXISTENTE DE HOTEL AURA.**

Posteriormente construiremos sobre esta base una experiencia mucho más avanzada con Nía, la concierge digital del hotel.

Pero todavía NO quiero hacer esa evolución.

Primero quiero conseguir una réplica sólida, coherente y navegable del hotel que ya existe.

---

# 1. FUENTES DE REFERENCIA

Tienes varias fuentes que debes utilizar conjuntamente:

### A. Design System existente

Este proyecto ya contiene el Design System de Aura.

**Es la fuente de verdad para:**

* tipografía;
* colores;
* espaciado;
* componentes;
* botones;
* inputs;
* cards;
* navegación;
* iconografía;
* bordes;
* estados;
* responsive;
* lenguaje visual.

No crees un Design System nuevo.

No sustituyas el sistema existente por otro estilo.

Si necesitas crear componentes que no existen todavía, extiende el sistema de manera coherente.

---

### B. Sitio existente en Netlify

El sitio actualmente publicado es:

https://aura-nia-demo-877.netlify.app/canal/web

Utilízalo como referencia principal de la experiencia existente.

Quiero que estudies:

* estructura;
* jerarquía;
* composición;
* navegación;
* contenido;
* imágenes;
* proporciones;
* comportamiento;
* secciones;
* interacción;
* presencia de Nía.

**No quiero una interpretación aproximada del sitio.**

Quiero una reconstrucción lo más fiel posible.

---

### C. Screenshots proporcionados

También tienes screenshots del sitio actual.

Úsalos para analizar:

* composición visual;
* proporciones;
* tamaños;
* espacios;
* tipografía;
* tratamiento de imágenes;
* posición de elementos;
* relación entre bloques;
* comportamiento del widget de Nía;
* navegación;
* footer.

Cuando el screenshot y la web sean ligeramente diferentes, utiliza la versión más reciente del sitio como referencia funcional y los screenshots como referencia visual.

---

### D. README del proyecto

El README describe la arquitectura y las pantallas existentes.

No necesitas reproducir la arquitectura técnica interna del proyecto original.

Lo que sí debes reproducir es la **experiencia visual y funcional que el usuario ve**.

El README identifica `/canal/web` como el sitio del hotel con el asistente de voz flotante, y también identifica las principales áreas del sitio.

---

# 2. PRINCIPIO FUNDAMENTAL

Durante esta primera fase:

## NO REDISEÑAR.

No quiero que:

* modernices el sitio;
* cambies la identidad;
* agregues nuevas secciones;
* inventes nuevas funcionalidades;
* cambies la arquitectura visual;
* reemplaces componentes;
* agregues efectos innecesarios;
* conviertas el sitio en una landing page;
* lo hagas parecer una aplicación SaaS.

Quiero que reproduzcas **lo que ya existe**.

Si algo funciona actualmente de una determinada manera, intenta conservarlo.

Si una decisión visual parece poco convencional, no la “corrijas” automáticamente.

La fidelidad al producto existente es más importante que tu propia reinterpretación.

---

# 3. IDENTIDAD DE HOTEL AURA

Aura es un hotel ficticio del Caribe.

La experiencia actual lo presenta como:

**Aura · Hotel Boutique & Casa de Mar**

La personalidad visual es:

* boutique;
* caribeña;
* sofisticada;
* íntima;
* serena;
* contemporánea;
* cercana al mar;
* editorial;
* premium sin sentirse ostentosa.

La experiencia debe transmitir:

> una casa de mar pequeña, sofisticada y tranquila.

No debe parecer:

* resort masivo;
* hotel corporativo;
* cadena hotelera;
* startup;
* producto tecnológico.

---

# 4. ESTRUCTURA PRINCIPAL

Replica la estructura actualmente visible en `/canal/web`.

La navegación principal contiene:

* Habitaciones
* Experiencias
* Gastronomía
* Bienestar

Además:

* Aura como marca central;
* Mi reserva;
* Reservar.

Mantén la jerarquía y disposición visual de la navegación existente.

---

# 5. HERO

El hero es uno de los elementos más importantes.

Debe conservar la lógica actual:

### Imagen

Fotografía de Aura frente al mar, al atardecer.

La imagen debe ocupar prácticamente todo el viewport inicial.

Debe existir un tratamiento visual que permita leer correctamente el texto sobre la fotografía.

### Eyebrow

CARIBE · 24 HABITACIONES Y SUITES

### Headline

> Una casa serena frente al mar.

Con el tratamiento tipográfico editorial existente y el énfasis en cursiva que aparece en el diseño.

### CTA de Nía

Mantener la presencia actual de:

**HABLAR CON NÍA**

con:

**Reserva por voz, en tu idioma**

No reinventar este componente.

### Buscador / disponibilidad

Mantener el selector horizontal existente:

* Llegada
* Salida
* Huéspedes
* Habitación
* Ver disponibilidad

Debe conservar su aspecto de módulo integrado sobre el hero.

---

# 6. SECCIÓN “LA CASA”

Después del hero debe existir la sección editorial actualmente presente.

Contenido:

### Eyebrow

LA CASA

### Mensaje

> Veinticuatro habitaciones, una larga terraza y una cocina que sigue la pesca del día.

Y el texto descriptivo de Aura:

> Aura está construida en piedra caliza local y madera clara, abierta a los vientos alisios. Lo bastante pequeña para saber tu nombre.

Mantener el tratamiento editorial y la relación entre texto e imágenes.

---

# 7. HABITACIONES

Recrear la sección de habitaciones existente.

Debe mostrar las tres categorías actuales:

### Habitación Deluxe

38 m²

Muros encalados, cama king y terraza privada con sombra.

Características:

* Terraza
* Ducha lluvia
* Espresso

Hasta 2 huéspedes.

Desde $289.

---

### Habitación Vista al Mar

46 m²

Balcón orientado al oeste sobre la bahía, hecho para atardeceres.

Características:

* Vista al mar
* Tina
* Balcón

Hasta 4 huéspedes.

Desde $389.

---

### Suite Vista al Mar

78 m²

Sala independiente, terraza envolvente y piscina privada.

Características:

* Piscina privada
* Sala
* Mayordomo

Hasta 4 huéspedes.

Desde $569.

---

Cada habitación debe mantener:

* imagen;
* nombre;
* superficie;
* descripción;
* amenities;
* capacidad;
* precio;
* CTA.

Los precios son datos de demostración.

No necesitas conectar disponibilidad real.

---

# 8. EXPERIENCIAS

Recrear la sección:

## Días pensados para ti.

Debe mostrar cuatro experiencias:

### Navegación al atardecer

Dos horas en el agua, con champaña.

### Cena privada

Un menú degustación en la arena, solo para ti.

### Spa y bienestar

Tratamientos al aire libre y yoga al amanecer.

### Excursión a la isla

Calas escondidas y guías locales en bote.

Mantener el tratamiento visual de las imágenes en formato vertical y la composición horizontal de las cuatro experiencias.

---

# 9. GASTRONOMÍA

Recrear la sección de gastronomía existente.

### Eyebrow

GASTRONOMÍA

### Headline

> Sal, humo y cítricos en Brasa.

### Descripción

> Cocina a fuego abierto en la terraza. Desayuno hasta el mediodía, cena junto al agua.

Mantener la composición visual actual, incluyendo el bloque de color claro y la imagen gastronómica.

Debe existir el CTA:

**Reservar mesa**

---

# 10. BIENESTAR

Recrear la sección actual.

### Eyebrow

BIENESTAR

### Headline

> Rituales lentos, aire de mar.

### Descripción

> Salas de tratamiento al aire libre, yoga al amanecer y piscina fría frente a la bahía.

Mantener el bloque verde y la imagen asociada.

Debe existir:

**Reservar un ritual**

---

# 11. DESTINO

Mantener la sección de destino existente.

Debe comunicar:

> A veinte minutos del aeropuerto. A un mundo de todo lo demás.

No expandir innecesariamente esta sección.

---

# 12. SECCIÓN DE NÍA

IMPORTANTE:

Nía **ya forma parte de la experiencia actual de Aura**.

Por lo tanto, en esta primera réplica sí quiero conservar su presencia actual.

Pero:

## NO QUIERO TODAVÍA CONSTRUIR LA EXPERIENCIA ADAPTATIVA DE NÍA.

Por ahora solamente replica la presencia existente:

* sección editorial de Nía;
* CTA;
* widget flotante;
* avatar;
* nombre;
* copy;
* quick actions;
* campo de conversación;
* micrófono.

La sección existente comunica:

### CONOCE A NÍA · CONCIERGE DIGITAL

> Planifica, reserva y pregunta, en una sola conversación.

Y:

> Nía conoce la casa, consulta disponibilidad real y puede reservar o gestionar el pago. Continúa en la web, WhatsApp o Instagram: ella recuerda.

Mantén esta sección.

Mantén también las acciones:

* Consultar disponibilidad en tiempo real
* Reservar una habitación o una mesa
* Sumar experiencias a tu estadía
* Hablar con una persona de recepción

---

# 13. WIDGET DE NÍA

Replica visualmente el widget que aparece actualmente en las capturas.

Debe incluir:

* avatar circular de Nía;
* nombre “Nía.”;
* subtítulo “Aura · Concierge digital”;
* controles superiores;
* mensaje inicial;
* quick actions;
* aviso sobre micrófono;
* campo de entrada;
* botón de micrófono;
* botón de envío.

La estética debe ser la misma:

* fondo oscuro en el header;
* superficie clara en el cuerpo;
* bordes redondeados;
* tipografía elegante;
* detalles cálidos;
* controles discretos.

### IMPORTANTE

No rediseñes el avatar de Nía.

Utiliza la identidad visual existente disponible en el proyecto.

Nía debe sentirse como parte del hotel, no como una herramienta externa.

---

# 14. FOOTER

Recrear el footer actual.

Debe incluir:

### Aura

Calle del Faro 12, Costa Norte, Caribe

### Estadía

* Habitaciones
* Ofertas
* Tarjetas de regalo

### Descubre

* Experiencias
* Gastronomía
* Bienestar

### Contacto

* WhatsApp
* Instagram
* [hola@aura.example](mailto:hola@aura.example)

Mantener la estructura visual y el fondo oscuro.

---

# 15. IMÁGENES

Las fotografías son esenciales.

Utiliza las imágenes disponibles en los materiales proporcionados cuando sea posible.

Si necesitas reemplazar alguna imagen, utiliza fotografías que mantengan exactamente el mismo universo visual:

* Caribe;
* mar;
* arquitectura boutique;
* piedra;
* madera;
* atardecer;
* gastronomía;
* bienestar;
* naturaleza.

No mezcles estilos fotográficos radicalmente diferentes.

Las imágenes deben sentirse como si todas pertenecieran al mismo hotel.

---

# 16. TIPOGRAFÍA

Respeta estrictamente la tipografía definida en el Design System.

La experiencia actual utiliza una combinación editorial con:

* serif elegante para grandes titulares;
* tipografía limpia para navegación y textos funcionales;
* uso puntual de cursiva editorial.

No sustituyas esta jerarquía por una tipografía genérica.

---

# 17. COLOR

Respeta los colores del Design System y de la implementación actual.

La experiencia utiliza principalmente:

* azul/negro profundo;
* crema;
* blanco cálido;
* tonos arena;
* verde apagado;
* acentos cálidos.

No agregues nuevos colores sin necesidad.

---

# 18. MOTION

Replica el lenguaje de movimiento existente.

Debe sentirse:

* suave;
* elegante;
* editorial;
* lento;
* natural.

No agregues:

* animaciones tipo SaaS;
* efectos tecnológicos;
* glow;
* neon;
* partículas;
* hologramas;
* efectos “AI”.

---

# 19. RESPONSIVE

La réplica debe funcionar correctamente en:

* desktop;
* tablet;
* mobile.

Pero primero prioriza la fidelidad al desktop mostrado en los screenshots.

Después adapta cuidadosamente la experiencia para pantallas pequeñas.

No conviertas simplemente el desktop en una versión comprimida.

---

# 20. INTERACTIVIDAD

Quiero un prototipo navegable.

Debe permitir:

* navegar por las secciones;
* abrir habitaciones;
* interactuar con botones;
* utilizar el selector de disponibilidad;
* recorrer experiencias;
* interactuar con el widget de Nía;
* utilizar los elementos principales de navegación.

Los datos pueden ser simulados.

No necesitas implementar:

* APIs;
* pagos reales;
* base de datos;
* disponibilidad real;
* integraciones externas.

---

# 21. ELEMENTOS QUE NO DEBES REPLICAR

Hay elementos propios del entorno de desarrollo/despliegue que NO forman parte de la experiencia de Aura.

Por ejemplo:

**“Powered by Netlify”**

No lo incluyas como parte del diseño del hotel.

Tampoco incluyas elementos propios de Claude Design dentro del prototipo final.

Quiero que el resultado represente únicamente la experiencia de **Aura**.

---

# 22. NO MODIFICAR LA IDENTIDAD

No cambies:

* nombre;
* concepto;
* personalidad;
* tono;
* estructura principal;
* identidad visual;
* nombre de Nía.

El hotel es:

# AURA

La concierge digital es:

# NÍA

---

# 23. PREPARAR LA SIGUIENTE FASE

Aunque ahora estamos replicando la experiencia existente, quiero que la estructura sea suficientemente modular para que posteriormente podamos construir una segunda fase.

La segunda fase será:

> **hacer que todo el hotel responda dinámicamente a la conversación con Nía.**

Por ejemplo:

Usuario:

> “Muéstrame las habitaciones.”

Posteriormente queremos que el sitio pueda transformarse hacia una experiencia de habitaciones.

Usuario:

> “¿Y el restaurante?”

Posteriormente queremos que el sitio pueda transformarse hacia gastronomía.

Usuario:

> “¿Qué recomiendas para el atardecer?”

Posteriormente queremos que el sitio pueda transformarse hacia experiencias.

Pero:

## NO IMPLEMENTES ESTA LÓGICA TODAVÍA.

Solo construye una base limpia y modular que nos permita hacerlo después.

---

# 24. CRITERIO DE ÉXITO

La primera versión será exitosa si puedo colocar:

**Claude Design**

y

**el sitio actual de Aura en Netlify**

lado a lado,

y reconocer inmediatamente que son la misma experiencia.

No busco todavía una experiencia más innovadora.

No busco todavía el “wow factor”.

No busco todavía una nueva interfaz de IA.

Busco:

# FIDELIDAD.

Primero replicamos Aura.

Después hacemos que Aura cobre vida con Nía.

---

# 25. ORDEN DE EJECUCIÓN

Antes de comenzar a construir:

1. analiza el Design System;
2. analiza el README;
3. analiza los screenshots;
4. analiza el sitio publicado;
5. identifica los componentes;
6. identifica las páginas/secciones;
7. identifica las imágenes;
8. identifica los patrones visuales;
9. identifica el comportamiento del widget de Nía.

Después construye la réplica.

No quiero una explicación larga antes de comenzar.

Quiero que avances directamente hacia una primera versión funcional y navegable.

Si existe una diferencia entre “lo que sería mejor diseñar” y “lo que existe actualmente”, en esta fase:

**gana lo que existe actualmente.**

---

# RESULTADO ESPERADO

Una réplica navegable de:

**Aura · Hotel Boutique & Casa de Mar**

que conserve la identidad, estructura, contenido, fotografía, composición, navegación y presencia actual de Nía.

Esta será la **base visual oficial sobre la que construiremos la siguiente fase del proyecto.**
