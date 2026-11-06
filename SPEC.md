# Alertas Magallanes

Sistema de alertas de clima para Sánchez Magallanes, Tabasco, México, un pueblo
pesquero entre el Golfo de México y la Laguna del Carmen. Proyecto comunitario
real y parte de mi portafolio para aplicar a Computer Science.

## Stack
Next.js con TypeScript, PostgreSQL con Prisma, desplegado en Railway.

## Requisitos
1. Consultar la API gratuita de Open-Meteo (sin API key) para 18.29, -93.87:
   lluvia acumulada, viento máximo y rachas máximas de los próximos 3 días.
   Y la Marine API de Open-Meteo para la altura máxima de olas en un punto
   mar adentro, 18.35, -93.87. Zona horaria America/Mexico_City.
2. Semáforo por día (verde, amarillo, rojo). Reglas iniciales, fáciles de
   ajustar porque las voy a validar con pescadores del pueblo:
   - Amarillo: rachas ≥ 50 km/h, olas ≥ 1.5 m, o lluvia ≥ 50 mm.
   - Rojo: rachas ≥ 70 km/h, olas ≥ 2.5 m, o lluvia ≥ 100 mm.
3. Página web en español, muy ligera (que cargue con mala señal), instalable
   como PWA, que conteste en grande "¿Se puede salir a la laguna hoy?", con el
   semáforo de hoy y los próximos 2 días, explicando por qué en lenguaje sencillo.
4. Para amarillo y rojo: lista corta de qué hacer (asegurar lanchas y techos,
   cargar celulares, números de emergencia).
5. Aviso visible de que es informativo y no sustituye a Protección Civil ni a
   Capitanía de Puerto.

## Más adelante
- Guardar el historial de pronósticos en la base de datos.
- Generar el mensaje de alerta listo para publicar en WhatsApp y Facebook.

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