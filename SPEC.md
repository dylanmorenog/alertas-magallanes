# Alertas Magallanes

Sistema de alertas de clima para Sánchez Magallanes, Tabasco, México, un pueblo
pesquero entre el Golfo de México y la Laguna del Carmen. Proyecto comunitario
real y parte de mi portafolio para aplicar a Computer Science.

## Stack
Next.js con TypeScript, PostgreSQL con Prisma, desplegado en Railway.

## Requisitos
Usuarios principales: familias y vecinos que necesitan prepararse (techos,
inundaciones), no quienes salen a pescar. Ver "Hallazgos con la comunidad".

1. Consultar la API gratuita de Open-Meteo (sin API key) para 18.29, -93.87:
   lluvia diaria, viento máximo y rachas máximas de hoy y los próximos 4 días
   (5 en total), más los 2 días anteriores para calcular la lluvia acumulada.
   Y la Marine API de Open-Meteo para la altura máxima de olas en un punto
   mar adentro, 18.35, -93.87. Zona horaria America/Mexico_City.
2. Lluvia acumulada de 3 días para cada día: la lluvia de ese día más la de los
   2 días anteriores (lo que ya cayó cuenta para las inundaciones). En la página
   se explica como "lluvia de hoy y los 2 días anteriores".
3. Semáforo por día (verde, amarillo, rojo). Reglas en un archivo de
   configuración, fáciles de ajustar:
   - Amarillo: rachas ≥ 50 km/h, lluvia ≥ 50 mm, lluvia de 3 días ≥ 100 mm,
     u olas ≥ 1.5 m.
   - Rojo: rachas ≥ 70 km/h, lluvia ≥ 100 mm, lluvia de 3 días ≥ 200 mm,
     u olas ≥ 2.5 m.
   - Los umbrales de lluvia de 3 días son provisionales, marcados "por validar".
   - Las olas son un dato secundario: mueven el color, pero una opción de la
     configuración permite desactivarlo.
4. Mensaje listo para copiar y publicar a mano en Facebook. La página es el
   enlace del mensaje y debe verse bien al compartirse. Se publica solo cuando
   hay alerta (amarillo o rojo), para que la gente no se acostumbre a leer
   avisos de buen tiempo y deje de leer los de mal tiempo.
   Lenguaje sencillo: primero qué viene y cuándo es lo peor (con día y fecha), solo
   los días con alerta, consecuencias en vez de números ("se pueden inundar calles
   y casas", "viento fuerte", "mar picado"), como mucho 4 consejos ("No cruces
   calles ni arroyos con corriente" siempre que sea por lluvia), hora en formato de
   12 horas, 911, enlace, hora del pronóstico y que es informativo. Los números se
   quedan en la página. Pruebas: sin unidades ni palabras técnicas, y largo
   limitado (≤ 1,250 caracteres y 20 líneas en el peor caso).
   Se obtiene con `npm run mensaje` o desde el celular en `/mensaje`, que usa la
   misma función, tiene botón de copiar y no aparece en buscadores. `/mensaje` se
   arma en cada visita (nunca entrega un mensaje viejo guardado) pero lee la misma
   caché de datos que la página principal: no agrega llamadas a Open-Meteo.
5. Página web en español, muy ligera (que cargue con mala señal), instalable
   como PWA, que conteste en grande "¿Viene mal tiempo a Magallanes?" para los
   próximos 5 días, explicando por qué en lenguaje sencillo. Los días 4 y 5 se
   marcan como "puede cambiar"; una alerta en esos días sí cambia la respuesta
   principal, indicando que puede cambiar.
   Frescura: nadie debe ver un pronóstico de más de ~30 minutos. La página se
   regenera cada 25 minutos (caché ISR, para no hacer una consulta a Open-Meteo
   por visita) y un monitor externo (UptimeRobot, palabra clave, cada 5 minutos)
   la visita para que la regeneración no la pague la primera persona que llega.
   El mismo monitor avisa por correo si la página muestra "NO SABEMOS". Si
   Open-Meteo falla, Next sigue sirviendo la última versión buena y el monitor no
   lo detecta: por eso la página avisa a partir de 1 hora de antigüedad. No
   encender el CDN de Railway: respondería sin pasar por Next.
6. Para amarillo y rojo: lista corta de qué hacer orientada a hogares
   (techos, inundaciones, celulares cargados, números de emergencia).
   Máximo 5 consejos, los más relevantes para el tipo de alerta; el resto queda
   plegado en "Más consejos" en la página y no va en el mensaje de Facebook.
   No predecir suspensión de clases.
7. Aviso visible de que es informativo y no sustituye a Protección Civil ni a
   Capitanía de Puerto.

## Más adelante
- Validar los umbrales de lluvia (sobre todo los de 3 días) con la API
  histórica de Open-Meteo contra fechas de inundaciones reales del pueblo.
  En curso: `npm run backtesting` usa los eventos de `datos/eventos.json` y guarda
  `informes/backtesting.md`, en dos partes:
  1. Histórico (ERA5): si los umbrales se habrían activado en cada evento y cuántas
     alertas habría por año (últimos 5 años completos).
  2. Pronósticos archivados (Previous Runs API, desde enero de 2024, sin olas): con
     cuántos días de anticipación habría avisado la app.
  Falta reunir más eventos confirmados en Sánchez Magallanes.
- Guardar el historial de pronósticos en la base de datos: **pospuesto** (6 nov 2026).
  Open-Meteo ya archiva sus pronósticos (Previous Runs API), así que lo que mostró la app
  se puede reconstruir cuando haga falta, como en la parte 2 del backtesting, sin
  mantener una base de datos ni un cron. Por eso PostgreSQL y Prisma siguen sin usarse.
  Límites de la reconstrucción, por si se retoma: no hay olas archivadas; solo existe
  desde enero de 2024 y por hora (los días se arman sumando horas); `best_match` cambia
  de modelos con el tiempo; y no reproduce la hora exacta en que la página se regeneró.
  Si se necesitara lo que la gente vio exactamente, el diseño propuesto era que la
  página incruste sus datos y un cron cada 30 minutos los guarde.
- Publicación automática en Facebook (hoy se publica a mano).
- Mensaje para WhatsApp.
- Vista previa al compartir con el pronóstico: URLs fijas por alerta (una por cada
  alerta publicada) con imagen dinámica, cuando exista el historial. Mientras tanto la
  vista previa es estática (nombre y para qué sirve, sin pronóstico), porque Facebook
  guarda la vista previa en caché y una dinámica podría mostrar un color viejo.

## Notas
- Los modelos de oleaje no cubren la laguna: las olas del Golfo son una señal
  indirecta. Validar con pescadores si salen al Golfo, a la laguna o a ambos.
- Open-Meteo exige atribución ("Datos: Open-Meteo.com").
## Hallazgos con la comunidad (5 nov 2026)
- Quienes pescan en la laguna no necesitan la app: leen el clima mejor que el modelo.
- Usuarios principales: familias y vecinos que no pescan (techos, inundaciones, escuela).
- Hoy la gente se entera del mal tiempo un día antes como máximo.
- Se enteran por Facebook y en persona.

## Cambios de dirección
- Pregunta principal: "¿Viene mal tiempo a Magallanes?" (antes: salir a la laguna).
- Pronóstico de 5 días; días 4 y 5 marcados como "puede cambiar".
- Prioridad: mensaje listo para Facebook. La página es el enlace del mensaje.
- Agregar lluvia acumulada de 3 días (inundaciones). Olas como dato secundario.
- Lista de qué hacer orientada a hogares. No predecir suspensión de clases.