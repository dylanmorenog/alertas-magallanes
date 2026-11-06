// Backtesting de los umbrales, en dos partes:
//   1. Histórico (ERA5): ¿se habrían activado en los eventos? ¿Cuántas alertas por año?
//   2. Pronósticos archivados (Previous Runs): ¿con cuánta anticipación habría avisado la app?
//
// Uso: npm run backtesting                        (alertas por año: últimos 5 años completos)
//      npm run backtesting -- --desde 1991 --hasta 2025
//
// Los eventos están en datos/eventos.json. Imprime el informe y lo guarda en
// informes/backtesting.md. El informe no lleva la hora de ejecución a propósito: así
// `git diff` solo muestra cambios cuando cambian los resultados.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { obtenerHistorico } from "../src/lib/open-meteo-historico.ts";
import { ANTICIPACION_MAXIMA, PREVIAS_DESDE, obtenerPrevias } from "../src/lib/open-meteo-previas.ts";
import {
  alertasPorAno,
  DIAS_ANTES_DETALLE,
  evaluarEvento,
  evaluarSerie,
  finDelEvento,
  reglasSinOlas,
  simularApp,
  type ResultadoApp,
  type ResultadoHistorico,
} from "../src/lib/backtesting.ts";
import { validarEventos, type Evento } from "../src/lib/eventos.ts";
import { VARIABLES, type Nivel } from "../src/lib/semaforo.ts";
import { fechaEnMexico, sumarDias } from "../src/lib/tiempo.ts";
import { NOMBRES, UMBRALES } from "../src/config/reglas.ts";

const ARCHIVO_EVENTOS = "datos/eventos.json";
const ARCHIVO_INFORME = "informes/backtesting.md";

// Por defecto, los últimos 5 años COMPLETOS: un año a medias no se puede comparar (los
// nortes se concentran entre octubre y marzo).
const anoActual = Number(fechaEnMexico(new Date()).slice(0, 4));
const { values } = parseArgs({
  options: {
    desde: { type: "string", default: String(anoActual - 5) },
    hasta: { type: "string", default: String(anoActual - 1) },
  },
});
const desdeAno = Number(values.desde);
const hastaAno = Number(values.hasta);
if (!Number.isInteger(desdeAno) || !Number.isInteger(hastaAno) || desdeAno > hastaAno || desdeAno < 1940 || hastaAno >= anoActual) {
  console.error(`Uso: npm run backtesting -- --desde ${anoActual - 5} --hasta ${anoActual - 1} (años completos, desde 1940).`);
  process.exit(1);
}

const numero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const valor = (v: number | null) => (v === null ? "—" : numero.format(v));
const NIVEL: Record<Nivel | "null", string> = { verde: "verde", amarillo: "AMARILLO", rojo: "ROJO", null: "sin datos" };
const nivel = (n: Nivel | null) => NIVEL[n ?? "null"];

function anticipacion(dias: number | null): string {
  if (dias === null) return "no avisó";
  if (dias === 0) return "el mismo día";
  if (dias > 0) return `${dias} día${dias === 1 ? "" : "s"} antes`;
  return `${-dias} día${dias === -1 ? "" : "s"} después de empezar (tarde)`;
}

function encabezado(evento: Evento): string[] {
  const fechas = evento.hasta ? `${evento.fecha} a ${evento.hasta}` : evento.fecha;
  return [
    `### ${fechas} · ${evento.descripcion}`,
    "",
    `- Alcance: **${evento.alcance}** · fuentes (verificadas el ${evento.verificadoEl}): ` +
      evento.fuentes.map((f) => `[${f.nombre}](${f.url})`).join("; "),
    ...(evento.notas ? [`- Notas: ${evento.notas}`] : []),
  ];
}

function seccionHistorico(r: ResultadoHistorico): string {
  const { evento } = r;
  const fin = finDelEvento(evento);
  const activado = (n: Nivel | null) => (n === null ? "sin datos" : n === "verde" ? "**no** (verde)" : `**sí, ${nivel(n)}**`);
  const porque = r.variables.length > 0 ? ` por ${r.variables.map((v) => NOMBRES[v]).join(", ")}` : "";
  const filas = r.detalle.map(({ dia, nivel: n, razones }) => {
    const delEvento = dia.fecha >= evento.fecha && dia.fecha <= fin;
    const fecha = delEvento ? `**${dia.fecha}**` : dia.fecha;
    const razon = razones.map((x) => NOMBRES[x.variable]).join(", ");
    return `| ${fecha} | ${valor(dia.lluviaMm)} | ${valor(dia.lluvia3dMm)} | ${valor(dia.rachasMaxKmh)} | ${valor(dia.olasMaxM)} | ${nivel(n)} | ${razon} |`;
  });
  return [
    ...encabezado(evento),
    `- ¿Se habría activado? ${activado(r.nivel)}${porque}. Sin contar las olas: ${activado(r.nivelSinOlas)}.`,
    "",
    `Datos reales (ERA5), de ${DIAS_ANTES_DETALLE} días antes al día siguiente; en negritas, los días del evento.`,
    "",
    "| Fecha | Lluvia (mm) | Lluvia 3 días (mm) | Rachas (km/h) | Olas (m) | Nivel | Por qué |",
    "|---|---:|---:|---:|---:|---|---|",
    ...filas,
  ].join("\n");
}

function seccionApp(evento: Evento, r: ResultadoApp | null): string {
  if (r === null) {
    return [
      ...encabezado(evento),
      `- **No se puede evaluar:** no hay pronósticos archivados para esta fecha ` +
        `(la Previous Runs API los guarda desde ${PREVIAS_DESDE}).`,
    ].join("\n");
  }
  const diasDelEvento = [...new Set(r.vistas.flatMap((v) => v.dias.map((d) => d.fecha)))].sort();
  const filas = r.vistas.map((vista) => {
    const celdas = diasDelEvento.map((fecha) => {
      const d = vista.dias.find((x) => x.fecha === fecha);
      if (!d) return "—";
      return `${nivel(d.nivel)} (a ${d.anticipacion} día${d.anticipacion === 1 ? "" : "s"}${d.puedeCambiar ? ", puede cambiar" : ""})`;
    });
    return `| ${vista.emision} | ${celdas.join(" | ")} |`;
  });
  return [
    ...encabezado(evento),
    `- Primer aviso (amarillo o rojo): **${anticipacion(r.anticipacion)}**`,
    `- Primer aviso en un día confiable (no "puede cambiar"): **${anticipacion(r.anticipacionConfiable)}**`,
    `- Primer rojo: **${anticipacion(r.anticipacionRojo)}**`,
    "",
    "Qué mostraba la app cada día (filas) para los días del evento (columnas), sin olas:",
    "",
    `| La app, el día | ${diasDelEvento.join(" | ")} |`,
    `|---|${diasDelEvento.map(() => "---").join("|")}|`,
    ...filas,
  ].join("\n");
}

try {
  const eventos = validarEventos(JSON.parse(await readFile(ARCHIVO_EVENTOS, "utf8")));

  // Parte 1: alertas por año.
  const historico = await obtenerHistorico(`${desdeAno}-01-01`, `${hastaAno}-12-31`);
  const anual = alertasPorAno(evaluarSerie(historico.dias), desdeAno, hastaAno);
  const anualSinOlas = alertasPorAno(evaluarSerie(historico.dias, reglasSinOlas()), desdeAno, hastaAno);
  const promedio = (f: (i: number) => number) => numero.format(anual.reduce((s, _, i) => s + f(i), 0) / anual.length);

  // Parte 1: eventos. Se descargan aparte: pueden caer fuera de los años del conteo.
  const historicos: ResultadoHistorico[] = [];
  for (const evento of eventos) {
    const { dias } = await obtenerHistorico(
      sumarDias(evento.fecha, -DIAS_ANTES_DETALLE),
      sumarDias(finDelEvento(evento), 1),
    );
    historicos.push(evaluarEvento(evento, evaluarSerie(dias), evaluarSerie(dias, reglasSinOlas())));
  }

  // Parte 2: lo que habría mostrado la app. La lluvia de 3 días necesita 2 días antes.
  const apps: (ResultadoApp | null)[] = [];
  let celdaPrevias = "";
  for (const evento of eventos) {
    if (evento.fecha < PREVIAS_DESDE) {
      apps.push(null);
      continue;
    }
    const { previas, celda } = await obtenerPrevias(sumarDias(evento.fecha, -2), finDelEvento(evento));
    celdaPrevias = `${celda.latitud}, ${celda.longitud}`;
    apps.push(simularApp(evento, previas, UMBRALES, ANTICIPACION_MAXIMA));
  }

  const umbrales = VARIABLES.map((v) => {
    const r = UMBRALES[v];
    const notas = [r.mueveElColor ? "" : "no cuenta para el color", r.porValidar ? "por validar" : ""].filter(Boolean);
    return `| ${NOMBRES[v]} | ${numero.format(r.amarillo)} ${r.unidad} | ${numero.format(r.rojo)} ${r.unidad} | ${notas.join(", ")} |`;
  });

  const { clima, mar } = historico.celdas;
  const informe = [
    "# Backtesting de los umbrales",
    "",
    `Eventos: \`${ARCHIVO_EVENTOS}\`. Generado con \`npm run backtesting\`.`,
    "",
    "## Umbrales usados",
    "",
    "| Variable | Amarillo | Rojo | Notas |",
    "|---|---:|---:|---|",
    ...umbrales,
    "",
    "## Parte 1: ¿se habrían activado los umbrales?",
    "",
    `Con el tiempo que de verdad hizo (reanálisis ERA5; lluvia y viento en la celda ${clima.latitud}, ` +
      `${clima.longitud}; olas de ERA5-Ocean en la celda ${mar.latitud}, ${mar.longitud}).`,
    "",
    ...historicos.flatMap((r) => [seccionHistorico(r), ""]),
    `## Alertas por año (${desdeAno}–${hastaAno})`,
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
    "## Parte 2: ¿con cuánta anticipación habría avisado la app?",
    "",
    "Con el pronóstico que existía cada día (Previous Runs API, modelo `best_match` como la app" +
      (celdaPrevias ? `; celda ${celdaPrevias}` : "") +
      "). La app muestra hoy y los 4 días siguientes, así que el máximo posible es 4 días antes. " +
      "Los días 4 y 5 de la app (a 3 y 4 días) \"pueden cambiar\".",
    "",
    ...eventos.flatMap((evento, i) => [seccionApp(evento, apps[i]), ""]),
    "## Cómo leer esto",
    "",
    "- **Parte 1** usa reanálisis: lo que pasó, reconstruido por un modelo. La celda de ERA5 mide ~25 km " +
      "y suaviza los aguaceros locales, así que las alertas por año tienden a quedarse cortas.",
    "- **Parte 2 va sin olas:** no existen pronósticos de oleaje archivados. Si un evento fue por el mar, " +
      "la parte 2 subestima el aviso.",
    "- **Parte 2 arma cada día sumando las 24 horas** (la API no da datos diarios). \"A N días\" usa el valor " +
      "pronosticado N×24 h antes de cada hora: es una aproximación del pronóstico que la app tenía ese día.",
    "- `best_match` combina varios modelos y su combinación puede cambiar con el tiempo.",
    "- Un evento con alcance \"tabasco\" sin alerta local no prueba que el umbral esté mal: pudo llover " +
      "en otro lado o venir por los ríos.",
    "- México tuvo horario de verano hasta 2022 y Open-Meteo usa un desfase fijo (UTC−6): entre abril y " +
      "octubre de esos años el corte del día se mueve una hora. En sumas diarias el efecto es mínimo.",
    "",
    "Datos: Open-Meteo.com (ERA5 y ERA5-Ocean, Copernicus; pronósticos archivados de Open-Meteo).",
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
