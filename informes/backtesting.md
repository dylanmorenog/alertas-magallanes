# Backtesting de los umbrales

Eventos: `datos/eventos.json`. Generado con `npm run backtesting`.

## Umbrales usados

| Variable | Amarillo | Rojo | Notas |
|---|---:|---:|---|
| lluvia | 50 mm | 100 mm |  |
| lluvia de 3 días | 100 mm | 200 mm | por validar |
| rachas de viento | 50 km/h | 70 km/h |  |
| olas | 1.5 m | 2.5 m |  |

## Parte 1: ¿se habrían activado los umbrales?

Con el tiempo que de verdad hizo (reanálisis ERA5; lluvia y viento en la celda 18.25, -93.75; olas de ERA5-Ocean en la celda 18.5, -94).

### 2026-10-17 a 2026-10-18 · Frente frío 2: alerta roja en Cárdenas; inundaciones costeras en Paraíso y Chiltepec.

- Alcance: **cardenas** · fuentes (verificadas el 2026-11-06): [Publimetro, 18 oct 2026: inundaciones costeras y cortes carreteros en Cárdenas y Paraíso](https://www.publimetro.com.mx/noticias/2026/10/19/frente-frio-2-deja-inundaciones-cortes-carreteros-y-danos-en-viviendas-del-sureste/); [Por Esto, 18 oct 2026: 144 personas afectadas y 29 viviendas en riesgo en Paraíso y Cárdenas](https://www.poresto.com/mexico/2026/10/18/frente-frio-azota-fuerza-costa-tabasco-oleaje-intenso-afecta-decenas-viviendas-pobladores.amp.html); [Meteored, 18 oct 2026: alerta roja en Teapa, Huimanguillo, Cárdenas y Paraíso; inundaciones costeras y evacuaciones en Chiltepec del 17 a la madrugada del 18](https://www.meteored.mx/noticias/actualidad/el-estado-de-tabasco-esta-bajo-emergencia-por-inundaciones-originadas-el-frente-frio-2-y-su-masa-de-aire.html)
- Notas: Meteored menciona patrullajes preventivos de Protección Civil en Sánchez Magallanes, sin reportar daños en el pueblo.
- ¿Se habría activado? **sí, ROJO** por olas. Sin contar las olas: **no** (verde).

Datos reales (ERA5), de 3 días antes al día siguiente; en negritas, los días del evento.

| Fecha | Lluvia (mm) | Lluvia 3 días (mm) | Rachas (km/h) | Olas (m) | Nivel | Por qué |
|---|---:|---:|---:|---:|---|---|
| 2026-10-14 | 5.8 | 7.7 | 30.2 | 0.8 | verde |  |
| 2026-10-15 | 9.9 | 16.4 | 28.1 | 0.8 | verde |  |
| 2026-10-16 | 12.9 | 28.6 | 30.6 | 0.8 | verde |  |
| **2026-10-17** | 21.1 | 43.9 | 42.5 | 5 | ROJO | olas |
| **2026-10-18** | 48.8 | 82.8 | 35.3 | 4.5 | ROJO | olas |
| 2026-10-19 | 36.2 | 106.1 | 34.2 | 3.1 | ROJO | lluvia de 3 días, olas |

### 2019-11-13 · Frente frío 12: espuma de mar en las calles de Sánchez Magallanes.

- Alcance: **magallanes** · fuentes (verificadas el 2026-11-06): [Mexico News Daily, 14 nov 2019: la espuma llegó el miércoles 13 por la mañana con el frente frío 12](https://mexiconewsdaily.com/news/cold-front-brings-chest-deep-sea-foam)
- Notas: El Heraldo de Tabasco (14 nov 2019, «Invade espuma marina») también lo reporta, pero su sitio bloqueó la verificación.
- ¿Se habría activado? **sí, ROJO** por rachas de viento, olas. Sin contar las olas: **sí, AMARILLO**.

Datos reales (ERA5), de 3 días antes al día siguiente; en negritas, los días del evento.

| Fecha | Lluvia (mm) | Lluvia 3 días (mm) | Rachas (km/h) | Olas (m) | Nivel | Por qué |
|---|---:|---:|---:|---:|---|---|
| 2019-11-10 | 6 | 27.5 | 32 | 1.8 | AMARILLO | olas |
| 2019-11-11 | 0.3 | 19.1 | 25.9 | 1.2 | verde |  |
| 2019-11-12 | 8.1 | 14.4 | 53.6 | 4.4 | ROJO | rachas de viento, olas |
| **2019-11-13** | 39.4 | 47.8 | 56.5 | 4.5 | ROJO | rachas de viento, olas |
| 2019-11-14 | 12.7 | 60.2 | 32 | 2.2 | AMARILLO | olas |

## Alertas por año (2021–2025)

Una alerta = días seguidos con amarillo o rojo (una sola serie de publicaciones).

| Año | Alertas | De ellas, rojas | Alertas sin contar olas | Días amarillo | Días rojo | Días sin datos |
|---|---:|---:|---:|---:|---:|---:|
| 2021 | 21 | 5 | 10 | 36 | 9 | 0 |
| 2022 | 20 | 13 | 16 | 36 | 32 | 0 |
| 2023 | 17 | 11 | 13 | 30 | 21 | 0 |
| 2024 | 22 | 8 | 12 | 40 | 14 | 0 |
| 2025 | 17 | 9 | 10 | 31 | 20 | 0 |
| **Promedio** | **19.4** | 9.2 | 12.2 | 34.6 | 19.2 | 0 |

## Sensibilidad: rojo por olas (2021–2025)

Mismo cálculo de la parte 1 cambiando solo el umbral rojo por olas; el amarillo sigue en 1.5 m, así que el total de alertas apenas cambia: lo que cambia es cuántas llegan a rojo. Para cada evento, el peor nivel en sus días. Los umbrales de la app no cambiaron.

| Rojo por olas desde | Alertas por año | De ellas, rojas | 2026-10-17 | 2019-11-13 |
|---|---:|---:|---|---|
| 2.5 m (actual) | 19.4 | 9.2 | ROJO | ROJO |
| 3 m | 19.4 | 6.4 | ROJO | ROJO |
| 3.5 m | 19.4 | 4.2 | ROJO | ROJO |
| 4 m | 19.4 | 2.8 | ROJO | ROJO |

**Riesgo de sobreajuste:** con solo 2 eventos, un umbral que "los detecta todos" puede fallar en el siguiente. Esta tabla sirve para ver tendencias, no para elegir un umbral; hacen falta más eventos (y también fechas SIN daños) antes de cambiar uno.

**Nada de esto es una medición en Magallanes:** ERA5 es un reanálisis (un modelo ajustado a observaciones, en celdas de ~25 km) y el pronóstico es otro modelo. Ninguno es un anemómetro en el pueblo, y las olas también son de modelo, en una celda mar adentro.

## Parte 2: ¿con cuánta anticipación habría avisado la app?

Con el pronóstico que existía cada día (Previous Runs API, modelo `best_match` como la app; celda 18.242529, -93.863434). La app muestra hoy y los 4 días siguientes, así que el máximo posible es 4 días antes. Los días 4 y 5 de la app (a 3 y 4 días) "pueden cambiar".

### 2026-10-17 a 2026-10-18 · Frente frío 2: alerta roja en Cárdenas; inundaciones costeras en Paraíso y Chiltepec.

- Alcance: **cardenas** · fuentes (verificadas el 2026-11-06): [Publimetro, 18 oct 2026: inundaciones costeras y cortes carreteros en Cárdenas y Paraíso](https://www.publimetro.com.mx/noticias/2026/10/19/frente-frio-2-deja-inundaciones-cortes-carreteros-y-danos-en-viviendas-del-sureste/); [Por Esto, 18 oct 2026: 144 personas afectadas y 29 viviendas en riesgo en Paraíso y Cárdenas](https://www.poresto.com/mexico/2026/10/18/frente-frio-azota-fuerza-costa-tabasco-oleaje-intenso-afecta-decenas-viviendas-pobladores.amp.html); [Meteored, 18 oct 2026: alerta roja en Teapa, Huimanguillo, Cárdenas y Paraíso; inundaciones costeras y evacuaciones en Chiltepec del 17 a la madrugada del 18](https://www.meteored.mx/noticias/actualidad/el-estado-de-tabasco-esta-bajo-emergencia-por-inundaciones-originadas-el-frente-frio-2-y-su-masa-de-aire.html)
- Notas: Meteored menciona patrullajes preventivos de Protección Civil en Sánchez Magallanes, sin reportar daños en el pueblo.
- Primer aviso (amarillo o rojo): **4 días antes**
- Primer aviso en un día confiable (no "puede cambiar"): **2 días antes**
- Primer rojo: **4 días antes**

Qué mostraba la app cada día (filas) para los días del evento (columnas), sin olas:

| La app, el día | 2026-10-17 | 2026-10-18 |
|---|---|---|
| 2026-10-13 | ROJO (a 4 días, puede cambiar) | — |
| 2026-10-14 | ROJO (a 3 días, puede cambiar) | ROJO (a 4 días, puede cambiar) |
| 2026-10-15 | ROJO (a 2 días) | AMARILLO (a 3 días, puede cambiar) |
| 2026-10-16 | ROJO (a 1 día) | AMARILLO (a 2 días) |
| 2026-10-17 | ROJO (a 0 días) | AMARILLO (a 1 día) |
| 2026-10-18 | — | AMARILLO (a 0 días) |

### 2019-11-13 · Frente frío 12: espuma de mar en las calles de Sánchez Magallanes.

- Alcance: **magallanes** · fuentes (verificadas el 2026-11-06): [Mexico News Daily, 14 nov 2019: la espuma llegó el miércoles 13 por la mañana con el frente frío 12](https://mexiconewsdaily.com/news/cold-front-brings-chest-deep-sea-foam)
- Notas: El Heraldo de Tabasco (14 nov 2019, «Invade espuma marina») también lo reporta, pero su sitio bloqueó la verificación.
- **No se puede evaluar:** no hay pronósticos archivados para esta fecha (la Previous Runs API los guarda desde 2024-01-01).

## Cómo leer esto

- **Riesgo de sobreajuste:** con solo 2 eventos, un umbral que "los detecta todos" puede fallar en el siguiente. Esta tabla sirve para ver tendencias, no para elegir un umbral; hacen falta más eventos (y también fechas SIN daños) antes de cambiar uno.
- **Nada de esto es una medición en Magallanes:** ERA5 es un reanálisis (un modelo ajustado a observaciones, en celdas de ~25 km) y el pronóstico es otro modelo. Ninguno es un anemómetro en el pueblo, y las olas también son de modelo, en una celda mar adentro.
- **Parte 1** usa reanálisis: lo que pasó, reconstruido por un modelo. La celda de ERA5 mide ~25 km y suaviza los aguaceros locales, así que las alertas por año tienden a quedarse cortas.
- **Parte 2 va sin olas:** no existen pronósticos de oleaje archivados. Si un evento fue por el mar, la parte 2 subestima el aviso.
- **Parte 2 arma cada día sumando las 24 horas** (la API no da datos diarios). "A N días" usa el valor pronosticado N×24 h antes de cada hora: es una aproximación del pronóstico que la app tenía ese día.
- `best_match` combina varios modelos y su combinación puede cambiar con el tiempo.
- Un evento con alcance "tabasco" sin alerta local no prueba que el umbral esté mal: pudo llover en otro lado o venir por los ríos.
- México tuvo horario de verano hasta 2022 y Open-Meteo usa un desfase fijo (UTC−6): entre abril y octubre de esos años el corte del día se mueve una hora. En sumas diarias el efecto es mínimo.

Datos: Open-Meteo.com (ERA5 y ERA5-Ocean, Copernicus; pronósticos archivados de Open-Meteo).
