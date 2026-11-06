# Backtesting de los umbrales

Periodo: 1991–2025. Lluvia y viento: ERA5 (celda 18.25, -93.75). Olas: ERA5-Ocean (celda 18.5, -94). Generado con `npm run backtesting`.

## Umbrales usados

| Variable | Amarillo | Rojo | Notas |
|---|---:|---:|---|
| lluvia | 50 mm | 100 mm |  |
| lluvia de 3 días | 100 mm | 200 mm | por validar |
| rachas de viento | 50 km/h | 70 km/h |  |
| olas | 1.5 m | 2.5 m |  |

## Eventos

"Anticipación" = cuántos días antes del inicio de los daños el tiempo REAL ya cruzaba el umbral. No mide la calidad del pronóstico: con un pronóstico perfecto, la app habría mostrado ese día hasta 4 días antes.

### Inundaciones en Tabasco por Eta y el frente frío 11

- Inicio de daños: 2020-11-02 · alcance: **tabasco**
- Nivel máximo (de 7 días antes al fin del evento): **ROJO**
- Primera alerta (amarillo o rojo): **4 días antes** · primer rojo: **3 días antes**
- Sin contar las olas: primera alerta 3 días antes · primer rojo no hubo
- Fuente: [Excélsior, 9 nov 2020: declaratoria de emergencia para Huimanguillo y Teapa «por inundaciones fluvial y pluvial ocurridas el 2 de noviembre de 2020».](https://www.excelsior.com.mx/nacional/emiten-declaratorias-de-emergencia-para-chiapas-y-tabasco/1415927) (verificado el 2026-11-06)
- Notas: Evento de prueba. Falta confirmar fecha y daños en Sánchez Magallanes (Cárdenas). La inundación fue en buena parte fluvial (ríos y desfogue de la presa Peñitas): la lluvia local puede no reflejarla.

| Día | Fecha | Lluvia (mm) | Lluvia 3 días (mm) | Rachas (km/h) | Olas (m) | Nivel |
|---:|---|---:|---:|---:|---:|---|
| -7 | 2020-10-26 | 0.8 | 10.9 | 19.8 | 0.7 | verde |
| -6 | 2020-10-27 | 0 | 2.8 | 25.6 | 0.6 | verde |
| -5 | 2020-10-28 | 0.2 | 1 | 26.3 | 0.7 | verde |
| -4 | 2020-10-29 | 9.3 | 9.5 | 37.1 | 1.9 | AMARILLO |
| -3 | 2020-10-30 | 49.3 | 58.8 | 57.6 | 3.1 | ROJO |
| -2 | 2020-10-31 | 8.9 | 67.5 | 36.4 | 2.1 | AMARILLO |
| -1 | 2020-11-01 | 32.8 | 91 | 46.8 | 2.5 | AMARILLO |
| 0 | 2020-11-02 | 27 | 68.7 | 57.6 | 2.7 | ROJO |
| +1 | 2020-11-03 | 5.3 | 65.1 | 48.2 | 2.5 | ROJO |
| +2 | 2020-11-04 | 1.3 | 33.6 | 41 | 1.8 | AMARILLO |
| +3 | 2020-11-05 | 13.3 | 19.9 | 52.6 | 2.3 | AMARILLO |

## Alertas por año

Una alerta = días seguidos con amarillo o rojo (una sola serie de publicaciones).

| Año | Alertas | De ellas, rojas | Alertas sin contar olas | Días amarillo | Días rojo | Días sin datos |
|---|---:|---:|---:|---:|---:|---:|
| 1991 | 18 | 10 | 12 | 32 | 16 | 0 |
| 1992 | 16 | 6 | 5 | 32 | 14 | 0 |
| 1993 | 20 | 8 | 12 | 29 | 19 | 0 |
| 1994 | 19 | 10 | 12 | 30 | 19 | 0 |
| 1995 | 23 | 9 | 11 | 47 | 20 | 0 |
| 1996 | 30 | 13 | 16 | 50 | 26 | 0 |
| 1997 | 18 | 11 | 14 | 28 | 24 | 0 |
| 1998 | 17 | 4 | 6 | 32 | 12 | 0 |
| 1999 | 20 | 9 | 11 | 43 | 18 | 0 |
| 2000 | 18 | 10 | 11 | 33 | 16 | 0 |
| 2001 | 15 | 9 | 7 | 35 | 15 | 0 |
| 2002 | 23 | 17 | 18 | 27 | 36 | 0 |
| 2003 | 21 | 9 | 12 | 38 | 24 | 0 |
| 2004 | 16 | 8 | 8 | 31 | 17 | 0 |
| 2005 | 21 | 9 | 13 | 40 | 17 | 0 |
| 2006 | 21 | 11 | 13 | 34 | 18 | 0 |
| 2007 | 19 | 13 | 12 | 28 | 28 | 0 |
| 2008 | 21 | 10 | 13 | 33 | 20 | 0 |
| 2009 | 18 | 9 | 10 | 43 | 20 | 0 |
| 2010 | 26 | 13 | 19 | 44 | 23 | 0 |
| 2011 | 23 | 14 | 16 | 31 | 29 | 0 |
| 2012 | 20 | 7 | 9 | 37 | 12 | 0 |
| 2013 | 26 | 18 | 19 | 31 | 39 | 0 |
| 2014 | 24 | 13 | 15 | 41 | 26 | 0 |
| 2015 | 22 | 12 | 12 | 41 | 21 | 0 |
| 2016 | 21 | 11 | 13 | 30 | 27 | 0 |
| 2017 | 23 | 8 | 8 | 39 | 13 | 0 |
| 2018 | 22 | 11 | 9 | 35 | 22 | 0 |
| 2019 | 23 | 12 | 15 | 37 | 27 | 0 |
| 2020 | 19 | 15 | 19 | 47 | 29 | 0 |
| 2021 | 21 | 5 | 10 | 36 | 9 | 0 |
| 2022 | 20 | 13 | 16 | 36 | 32 | 0 |
| 2023 | 17 | 11 | 13 | 30 | 21 | 0 |
| 2024 | 22 | 8 | 12 | 40 | 14 | 0 |
| 2025 | 17 | 9 | 10 | 31 | 20 | 0 |
| **Promedio** | **20.6** | 10.4 | 12.3 | 35.7 | 21.2 | 0 |

## Cómo leer esto

- Son datos de reanálisis (lo que pasó, reconstruido por un modelo), no pronósticos guardados.
- La celda de ERA5 mide ~25 km: suaviza los aguaceros locales, así que las alertas por año tienden a quedarse cortas frente a una estación en el pueblo.
- Un evento con alcance "tabasco" sin alerta local no prueba que el umbral esté mal: pudo llover en otro lado o venir por los ríos.
- México tuvo horario de verano hasta 2022 y Open-Meteo usa un desfase fijo (UTC−6): entre abril y octubre de esos años el corte del día se mueve una hora. En sumas diarias el efecto es mínimo.

Datos: Open-Meteo.com (ERA5 y ERA5-Ocean, Copernicus).
