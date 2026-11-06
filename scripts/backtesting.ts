// Backtesting de los umbrales contra eventos reales y conteo de alertas por año.
// Uso: npm run backtesting                       (1991–2025)
//      npm run backtesting -- --desde 2000 --hasta 2024
//
// Imprime el informe y lo guarda en informes/backtesting.md. El informe no lleva la hora
// de ejecución a propósito: así `git diff` solo muestra cambios cuando cambian los
// resultados (un umbral, un evento nuevo), no cada vez que se corre.

import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { obtenerHistorico } from "../src/lib/open-meteo-historico.ts";
import {
  alertasPorAno,
  analizarEvento,
  evaluarSerie,
  reglasSinOlas,
  type ResultadoEvento,
} from "../src/lib/backtesting.ts";
import { VARIABLES, type Nivel } from "../src/lib/semaforo.ts";
import { EVENTOS } from "../src/config/eventos.ts";
import { NOMBRES, UMBRALES } from "../src/config/reglas.ts";

const DIAS_ANTES = 7;
const ARCHIVO_INFORME = "informes/backtesting.md";

const { values } = parseArgs({
  options: { desde: { type: "string", default: "1991" }, hasta: { type: "string", default: "2025" } },
});
const desdeAno = Number(values.desde);
const hastaAno = Number(values.hasta);
if (!Number.isInteger(desdeAno) || !Number.isInteger(hastaAno) || desdeAno > hastaAno || desdeAno < 1940) {
  console.error("Uso: npm run backtesting -- --desde 1991 --hasta 2025 (años completos, desde 1940).");
  process.exit(1);
}

const numero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const valor = (v: number | null) => (v === null ? "—" : numero.format(v));
const NIVEL: Record<Nivel | "null", string> = { verde: "verde", amarillo: "AMARILLO", rojo: "ROJO", null: "sin datos" };

function anticipacion(dias: number | null): string {
  if (dias === null) return "no hubo";
  if (dias === 0) return "el mismo día";
  if (dias > 0) return `${dias} día${dias === 1 ? "" : "s"} antes`;
  return `${-dias} día${dias === -1 ? "" : "s"} después (tarde)`;
}

function seccionEvento(r: ResultadoEvento, sinOlas: ResultadoEvento): string {
  const { evento } = r;
  const filas = r.detalle.map(({ dia, nivel }) => {
    const relativo = Math.round((Date.parse(dia.fecha) - Date.parse(evento.desde)) / 86_400_000);
    return `| ${relativo > 0 ? `+${relativo}` : relativo} | ${dia.fecha} | ${valor(dia.lluviaMm)} | ${valor(dia.lluvia3dMm)} | ${valor(dia.rachasMaxKmh)} | ${valor(dia.olasMaxM)} | ${NIVEL[nivel ?? "null"]} |`;
  });
  return [
    `### ${evento.nombre}`,
    "",
    `- Inicio de daños: ${evento.desde}${evento.hasta ? ` (hasta ${evento.hasta})` : ""} · alcance: **${evento.alcance}**`,
    `- Nivel máximo (de ${DIAS_ANTES} días antes al fin del evento): **${NIVEL[r.nivelMaximo ?? "null"]}**`,
    `- Primera alerta (amarillo o rojo): **${anticipacion(r.anticipacionAlerta)}** · primer rojo: **${anticipacion(r.anticipacionRojo)}**`,
    `- Sin contar las olas: primera alerta ${anticipacion(sinOlas.anticipacionAlerta)} · primer rojo ${anticipacion(sinOlas.anticipacionRojo)}`,
    `- Fuente: [${evento.fuente}](${evento.url}) (verificado el ${evento.verificadoEl})`,
    ...(evento.notas ? [`- Notas: ${evento.notas}`] : []),
    "",
    "| Día | Fecha | Lluvia (mm) | Lluvia 3 días (mm) | Rachas (km/h) | Olas (m) | Nivel |",
    "|---:|---|---:|---:|---:|---:|---|",
    ...filas,
  ].join("\n");
}

try {
  const historico = await obtenerHistorico(`${desdeAno}-01-01`, `${hastaAno}-12-31`);
  const serie = evaluarSerie(historico.dias);
  const serieSinOlas = evaluarSerie(historico.dias, reglasSinOlas());

  const anual = alertasPorAno(serie, desdeAno, hastaAno);
  const anualSinOlas = alertasPorAno(serieSinOlas, desdeAno, hastaAno);
  const promedio = (f: (i: number) => number) => numero.format(anual.reduce((s, _, i) => s + f(i), 0) / anual.length);

  const umbrales = VARIABLES.map((v) => {
    const r = UMBRALES[v];
    const notas = [r.mueveElColor ? "" : "no cuenta para el color", r.porValidar ? "por validar" : ""].filter(Boolean);
    return `| ${NOMBRES[v]} | ${numero.format(r.amarillo)} ${r.unidad} | ${numero.format(r.rojo)} ${r.unidad} | ${notas.join(", ")} |`;
  });

  const { clima, mar } = historico.celdas;
  const informe = [
    "# Backtesting de los umbrales",
    "",
    `Periodo: ${desdeAno}–${hastaAno}. Lluvia y viento: ERA5 (celda ${clima.latitud}, ${clima.longitud}). ` +
      `Olas: ERA5-Ocean (celda ${mar.latitud}, ${mar.longitud}). Generado con \`npm run backtesting\`.`,
    "",
    "## Umbrales usados",
    "",
    "| Variable | Amarillo | Rojo | Notas |",
    "|---|---:|---:|---|",
    ...umbrales,
    "",
    "## Eventos",
    "",
    "\"Anticipación\" = cuántos días antes del inicio de los daños el tiempo REAL ya cruzaba el umbral. " +
      "No mide la calidad del pronóstico: con un pronóstico perfecto, la app habría mostrado ese día " +
      "hasta 4 días antes.",
    "",
    ...EVENTOS.flatMap((evento) => [
      seccionEvento(analizarEvento(evento, serie, DIAS_ANTES), analizarEvento(evento, serieSinOlas, DIAS_ANTES)),
      "",
    ]),
    "## Alertas por año",
    "",
    "Una alerta = días seguidos con amarillo o rojo (una sola serie de publicaciones).",
    "",
    "| Año | Alertas | De ellas, rojas | Alertas sin contar olas | Días amarillo | Días rojo | Días sin datos |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...anual.map(
      (a, i) =>
        `| ${a.ano} | ${a.alertas} | ${a.alertasRojas} | ${anualSinOlas[i].alertas} | ${a.diasAmarillo} | ${a.diasRojo} | ${a.diasSinDatos} |`,
    ),
    `| **Promedio** | **${promedio((i) => anual[i].alertas)}** | ${promedio((i) => anual[i].alertasRojas)} | ` +
      `${promedio((i) => anualSinOlas[i].alertas)} | ${promedio((i) => anual[i].diasAmarillo)} | ` +
      `${promedio((i) => anual[i].diasRojo)} | ${promedio((i) => anual[i].diasSinDatos)} |`,
    "",
    "## Cómo leer esto",
    "",
    "- Son datos de reanálisis (lo que pasó, reconstruido por un modelo), no pronósticos guardados.",
    "- La celda de ERA5 mide ~25 km: suaviza los aguaceros locales, así que las alertas por año " +
      "tienden a quedarse cortas frente a una estación en el pueblo.",
    "- Un evento con alcance \"tabasco\" sin alerta local no prueba que el umbral esté mal: pudo " +
      "llover en otro lado o venir por los ríos.",
    "- México tuvo horario de verano hasta 2022 y Open-Meteo usa un desfase fijo (UTC−6): entre abril " +
      "y octubre de esos años el corte del día se mueve una hora. En sumas diarias el efecto es mínimo.",
    "",
    "Datos: Open-Meteo.com (ERA5 y ERA5-Ocean, Copernicus).",
    "",
  ].join("\n");

  console.log(informe);
  await mkdir("informes", { recursive: true });
  await writeFile(ARCHIVO_INFORME, informe);
  console.error(`Guardado en ${ARCHIVO_INFORME}`);
} catch (error) {
  console.error("No se pudo completar el backtesting:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
