// Backtesting de los umbrales: aplica las MISMAS reglas de la app (evaluarDia) a datos del
// pasado. Funciones puras (sin red ni disco) para poder probarlas con series inventadas.
//
// Dos preguntas distintas, con datos distintos:
// - Parte 1 (histórico, ERA5): ¿el tiempo que de verdad hizo cruzaba los umbrales?
//   ¿Cuántas alertas habría por año?
// - Parte 2 (pronósticos archivados): ¿con cuántos días de anticipación habría avisado la
//   app con el pronóstico que existía en ese momento?

import type { PronosticoDia } from "./open-meteo.ts";
import type { Previas } from "./open-meteo-previas.ts";
import { evaluarDia, type Nivel, type Razon, type Reglas, type Variable } from "./semaforo.ts";
import { diasEntre, puedeCambiar, sumarDias } from "./tiempo.ts";
import type { Evento } from "./eventos.ts";
import { DIAS_LLUVIA_ACUMULADA, UMBRALES } from "../config/reglas.ts";

export type DiaHistorico = { dia: PronosticoDia; nivel: Nivel | null; razones: Razon[] };

export type Episodio = { desde: string; hasta: string; dias: number; nivel: "amarillo" | "rojo" };

export type ConteoAnual = {
  ano: number;
  alertas: number; // episodios
  alertasRojas: number; // episodios cuyo peor día fue rojo
  diasAmarillo: number;
  diasRojo: number;
  diasSinDatos: number;
};

const ORDEN: (Nivel | null)[] = [null, "verde", "amarillo", "rojo"];

function esAlerta(nivel: Nivel | null): nivel is "amarillo" | "rojo" {
  return nivel === "amarillo" || nivel === "rojo";
}

function peor(niveles: (Nivel | null)[]): Nivel | null {
  return niveles.reduce<Nivel | null>((a, b) => (ORDEN.indexOf(b) > ORDEN.indexOf(a) ? b : a), null);
}

const ano = (fecha: string) => Number(fecha.slice(0, 4));

// Último día del evento: `hasta`, o `fecha` si fue un solo día.
export const finDelEvento = (evento: Evento) => evento.hasta ?? evento.fecha;

export function evaluarSerie(dias: PronosticoDia[], reglas: Reglas = UMBRALES): DiaHistorico[] {
  return dias.map((dia) => {
    const { nivel, razones } = evaluarDia(dia, reglas);
    return { dia, nivel, razones };
  });
}

// Las mismas reglas, pero sin que las olas muevan el color.
export function reglasSinOlas(reglas: Reglas = UMBRALES): Reglas {
  return { ...reglas, olas: { ...reglas.olas, mueveElColor: false } };
}

// Las mismas reglas con otro umbral rojo para una variable: para la tabla de sensibilidad.
// No cambia los umbrales de la app (UMBRALES), solo devuelve una copia.
export function reglasConRojo(reglas: Reglas, variable: Variable, rojo: number): Reglas {
  if (rojo < reglas[variable].amarillo) {
    throw new Error(`El rojo (${rojo}) no puede ser menor que el amarillo (${reglas[variable].amarillo}).`);
  }
  return { ...reglas, [variable]: { ...reglas[variable], rojo } };
}

// ---------------------------------------------------------------------------------------
// Parte 1: histórico

// Días seguidos con alerta cuentan como UNA alerta: en la práctica son una sola serie de
// publicaciones. Un día sin alerta o sin datos corta el episodio, igual que un hueco en
// las fechas.
export function episodios(serie: DiaHistorico[]): Episodio[] {
  const resultado: Episodio[] = [];
  let actual: Episodio | null = null;
  for (const { dia, nivel } of serie) {
    if (!esAlerta(nivel)) {
      actual = null;
      continue;
    }
    if (actual && diasEntre(actual.hasta, dia.fecha) === 1) {
      actual.hasta = dia.fecha;
      actual.dias++;
      if (nivel === "rojo") actual.nivel = "rojo";
    } else {
      actual = { desde: dia.fecha, hasta: dia.fecha, dias: 1, nivel };
      resultado.push(actual);
    }
  }
  return resultado;
}

// Conteo por año, con todos los años del rango aunque no tengan alertas (un 0 también es
// un resultado). Un episodio que cruza el 31 de diciembre cuenta en el año en que empieza.
export function alertasPorAno(serie: DiaHistorico[], desdeAno: number, hastaAno: number): ConteoAnual[] {
  const conteos = new Map<number, ConteoAnual>();
  for (let a = desdeAno; a <= hastaAno; a++) {
    conteos.set(a, { ano: a, alertas: 0, alertasRojas: 0, diasAmarillo: 0, diasRojo: 0, diasSinDatos: 0 });
  }
  for (const { dia, nivel } of serie) {
    const conteo = conteos.get(ano(dia.fecha));
    if (!conteo) continue;
    if (nivel === "amarillo") conteo.diasAmarillo++;
    if (nivel === "rojo") conteo.diasRojo++;
    if (nivel === null) conteo.diasSinDatos++;
  }
  for (const episodio of episodios(serie)) {
    const conteo = conteos.get(ano(episodio.desde));
    if (!conteo) continue;
    conteo.alertas++;
    if (episodio.nivel === "rojo") conteo.alertasRojas++;
  }
  return [...conteos.values()];
}

export type ResultadoHistorico = {
  evento: Evento;
  // Peor nivel en los días del evento (de `fecha` a `hasta`); null si no hubo datos.
  nivel: Nivel | null;
  nivelSinOlas: Nivel | null;
  // Qué variables cruzaron el umbral en los días del evento (sin repetir).
  variables: Razon["variable"][];
  detalle: DiaHistorico[]; // de `fecha − DIAS_ANTES_DETALLE` a `fin + 1`
};

export const DIAS_ANTES_DETALLE = 3;

// ¿El tiempo real de los días del evento cruzaba los umbrales? `serie` y `serieSinOlas`
// son la misma serie evaluada con y sin olas.
export function evaluarEvento(evento: Evento, serie: DiaHistorico[], serieSinOlas: DiaHistorico[]): ResultadoHistorico {
  const fin = finDelEvento(evento);
  const delEvento = (s: DiaHistorico[]) => s.filter(({ dia }) => dia.fecha >= evento.fecha && dia.fecha <= fin);
  const dias = delEvento(serie);
  const inicioDetalle = sumarDias(evento.fecha, -DIAS_ANTES_DETALLE);
  const finDetalle = sumarDias(fin, 1);
  return {
    evento,
    nivel: peor(dias.map((d) => d.nivel)),
    nivelSinOlas: peor(delEvento(serieSinOlas).map((d) => d.nivel)),
    variables: [...new Set(dias.flatMap((d) => d.razones.map((r) => r.variable)))],
    detalle: serie.filter(({ dia }) => dia.fecha >= inicioDetalle && dia.fecha <= finDetalle),
  };
}

// ---------------------------------------------------------------------------------------
// Parte 2: lo que habría mostrado la app

export type DiaVisto = { fecha: string; anticipacion: number; puedeCambiar: boolean; nivel: Nivel | null };
// Lo que la app mostraba el día `emision` sobre los días del evento que caían en su ventana.
export type Vista = { emision: string; dias: DiaVisto[] };

export type ResultadoApp = {
  evento: Evento;
  vistas: Vista[]; // una por día de emisión, de `fecha − 4` al fin del evento
  // Días ANTES de `evento.fecha` del primer aviso: positivo = antes, 0 = el mismo día,
  // negativo = ya empezado el evento, null = nunca avisó.
  anticipacion: number | null; // amarillo o rojo, en cualquier día visible
  anticipacionConfiable: number | null; // aviso en un día que NO "puede cambiar"
  anticipacionRojo: number | null;
};

// Pronóstico de un día tal como lo veía la app el día `emision`.
// La lluvia de 3 días mezcla pasado y futuro: los días anteriores a la emisión usan el
// pronóstico de anticipación 0 (lo más parecido a lo que la app ya tenía como "pasado");
// los demás, el que había con su anticipación.
function diaVisto(previas: Previas, emision: string, fecha: string): PronosticoDia {
  const delDia = (dia: string) => previas.get(Math.max(0, diasEntre(emision, dia)))?.get(dia) ?? null;
  const hoy = delDia(fecha);
  const ventana = Array.from({ length: DIAS_LLUVIA_ACUMULADA }, (_, i) =>
    delDia(sumarDias(fecha, i - (DIAS_LLUVIA_ACUMULADA - 1)))?.lluviaMm ?? null,
  );
  const lluvia3d = ventana.some((v) => v === null)
    ? null
    : Math.round((ventana as number[]).reduce((s, v) => s + v, 0) * 10) / 10;
  return {
    fecha,
    lluviaMm: hoy?.lluviaMm ?? null,
    lluvia3dMm: lluvia3d,
    vientoMaxKmh: hoy?.vientoMaxKmh ?? null,
    rachasMaxKmh: hoy?.rachasMaxKmh ?? null,
    olasMaxM: null, // no hay olas pronosticadas archivadas
  };
}

// Reconstruye, día por día, lo que la app mostraba antes y durante el evento.
// Sin olas: no existen pronósticos de oleaje archivados.
export function simularApp(evento: Evento, previas: Previas, reglas: Reglas = UMBRALES, maxima = 4): ResultadoApp {
  const sinOlas = reglasSinOlas(reglas);
  const fin = finDelEvento(evento);
  const vistas: Vista[] = [];

  for (let emision = sumarDias(evento.fecha, -maxima); emision <= fin; emision = sumarDias(emision, 1)) {
    const dias: DiaVisto[] = [];
    for (let fecha = emision > evento.fecha ? emision : evento.fecha; fecha <= fin; fecha = sumarDias(fecha, 1)) {
      const anticipacion = diasEntre(emision, fecha);
      if (anticipacion > maxima) break;
      dias.push({
        fecha,
        anticipacion,
        puedeCambiar: puedeCambiar(fecha, emision),
        nivel: evaluarDia(diaVisto(previas, emision, fecha), sinOlas).nivel,
      });
    }
    vistas.push({ emision, dias });
  }

  const primera = (cumple: (d: DiaVisto) => boolean) => {
    const vista = vistas.find((v) => v.dias.some(cumple));
    return vista ? diasEntre(vista.emision, evento.fecha) : null;
  };
  return {
    evento,
    vistas,
    anticipacion: primera((d) => esAlerta(d.nivel)),
    anticipacionConfiable: primera((d) => esAlerta(d.nivel) && !d.puedeCambiar),
    anticipacionRojo: primera((d) => d.nivel === "rojo"),
  };
}
