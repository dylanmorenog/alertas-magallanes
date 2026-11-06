// Respuesta general a la PREGUNTA ("¿Viene mal tiempo a Magallanes?") para todos los días.
// La usan la página y el mensaje de Facebook: si salen de la misma función, no pueden
// contradecirse.

import type { PronosticoDia } from "./open-meteo.ts";
import { evaluarDia, VARIABLES, type Evaluacion, type Nivel, type Reglas } from "./semaforo.ts";
import { categoriaLluvia } from "./lluvia.ts";
import { diasEntre, elDia, puedeCambiar } from "./tiempo.ts";
import { lista, listaDeFaltantes, type Tono } from "./respuesta.ts";
import {
  FALTAN_DATOS_PARA,
  NOMBRES_SIN_ALERTA,
  QUE_HACER,
  QUE_VIENE,
  RESPUESTA_GENERAL,
  SIN_DATOS_PARA,
  UMBRALES,
} from "../config/reglas.ts";

export type DiaEvaluado = { dia: PronosticoDia; evaluacion: Evaluacion; puedeCambiar: boolean };

export type RespuestaGeneral = {
  tono: Tono;
  titulo: string;
  detalle: string;
  nota: string | null; // datos faltantes, cuando hay alerta
};

export function evaluarPronostico(dias: PronosticoDia[], hoy: string, reglas: Reglas = UMBRALES): DiaEvaluado[] {
  return dias.map((dia) => ({
    dia,
    evaluacion: evaluarDia(dia, reglas),
    puedeCambiar: puedeCambiar(dia.fecha, hoy),
  }));
}

const GRAVEDAD: Nivel[] = ["verde", "amarillo", "rojo"];

function conAlerta(dias: DiaEvaluado[]): DiaEvaluado[] {
  return dias.filter(({ evaluacion }) => evaluacion.nivel === "amarillo" || evaluacion.nivel === "rojo");
}

// El nivel más grave entre días con alerta (o null si no hay ninguno).
function peorNivel(dias: DiaEvaluado[]): "amarillo" | "rojo" | null {
  if (dias.some(({ evaluacion }) => evaluacion.nivel === "rojo")) return "rojo";
  if (dias.length > 0) return "amarillo";
  return null;
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "Lluvia intensa y viento fuerte desde mañana; lo más fuerte el sábado 8."
// `dias` son solo los días con alerta, en orden.
function describirAlerta(dias: DiaEvaluado[], hoy: string, posible: boolean): string {
  const razones = dias.flatMap(({ evaluacion }) => evaluacion.razones);
  const lluviaMaxima = Math.max(0, ...razones.filter((r) => r.variable === "lluvia").map((r) => r.valor));
  // Sin repetir: la lluvia de un día y la de 3 días pueden coincidir.
  const queViene = [
    ...new Set(
      VARIABLES.filter((variable) => razones.some((r) => r.variable === variable)).map((variable) =>
        QUE_VIENE[variable](categoriaLluvia(lluviaMaxima)),
      ),
    ),
  ];

  const nivel = peorNivel(dias);
  const inicio = dias[0];
  const pico = dias.find(({ evaluacion }) => evaluacion.nivel === nivel) ?? inicio;
  const cuando =
    inicio === pico
      ? elDia(pico.dia.fecha, hoy)
      : `desde ${elDia(inicio.dia.fecha, hoy)}; lo más fuerte ${elDia(pico.dia.fecha, hoy)}`;

  const que = lista.format(queViene);
  const texto = posible ? `Posible ${que} ${cuando}` : `${mayuscula(que)} ${cuando}`;
  return pico.puedeCambiar ? `${texto} ${RESPUESTA_GENERAL.puedeCambiar}.` : `${texto}.`;
}

// Alerta en los días que pueden cambiar, igual o menor que la de los días confiables.
// "Podría seguir el domingo 8 (puede cambiar)." si empieza justo después de la última
// alerta confiable; "Podría volver el lunes 9 (puede cambiar)." si hay un día sin alerta
// de por medio (decir "seguir" sería falso).
function describirContinuacion(confiables: DiaEvaluado[], lejanos: DiaEvaluado[], hoy: string): string {
  const ultimo = confiables[confiables.length - 1];
  const primero = lejanos[0];
  const cuando = lista.format(lejanos.map(({ dia }) => elDia(dia.fecha, hoy)));
  return diasEntre(ultimo.dia.fecha, primero.dia.fecha) === 1
    ? RESPUESTA_GENERAL.podriaSeguir(cuando)
    : RESPUESTA_GENERAL.podriaVolver(cuando);
}

// "Faltan datos de olas para el sábado 8 y el domingo 9. No hay datos para el domingo 9."
function describirFaltantes(dias: DiaEvaluado[], hoy: string): string | null {
  const sinDatos: string[] = [];
  const porFaltantes = new Map<string, string[]>();
  for (const { dia, evaluacion } of dias) {
    if (evaluacion.completo) continue;
    const cuando = elDia(dia.fecha, hoy);
    if (evaluacion.nivel === null) {
      sinDatos.push(cuando);
    } else {
      const faltan = listaDeFaltantes(evaluacion.faltantes);
      porFaltantes.set(faltan, [...(porFaltantes.get(faltan) ?? []), cuando]);
    }
  }
  const frases = [...porFaltantes].map(([faltan, cuando]) => FALTAN_DATOS_PARA(faltan, lista.format(cuando)));
  if (sinDatos.length > 0) frases.push(SIN_DATOS_PARA(lista.format(sinDatos)));
  return frases.length > 0 ? frases.join(" ") : null;
}

// "lluvia, viento ni olas", solo con las variables que cuentan para el color.
function variablesSinAlerta(reglas: Reglas): string {
  const nombres = [
    ...new Set(VARIABLES.filter((variable) => reglas[variable].mueveElColor).map((v) => NOMBRES_SIN_ALERTA[v])),
  ];
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} ni ${nombres.at(-1)}`;
}

export function respuestaGeneral(dias: DiaEvaluado[], hoy: string, reglas: Reglas = UMBRALES): RespuestaGeneral {
  if (dias.every(({ evaluacion }) => evaluacion.nivel === null)) {
    return { tono: "gris", titulo: RESPUESTA_GENERAL.sinDatos, detalle: RESPUESTA_GENERAL.sinDatosDetalle, nota: null };
  }

  const faltantes = describirFaltantes(dias, hoy);
  const alertaConfiable = conAlerta(dias.filter((d) => !d.puedeCambiar));
  const alertaLejana = conAlerta(dias.filter((d) => d.puedeCambiar));
  const nivelConfiable = peorNivel(alertaConfiable);
  const nivelLejano = peorNivel(alertaLejana);

  // Hay alerta en los días confiables: el título lo pone lo que es más seguro.
  // Si los días que pueden cambiar también traen alerta, se menciona: como "posible"
  // si es peor, o como "podría seguir / volver" si no lo es.
  if (nivelConfiable !== null) {
    let detalle = describirAlerta(alertaConfiable, hoy, false);
    if (nivelLejano !== null) {
      detalle +=
        GRAVEDAD.indexOf(nivelLejano) > GRAVEDAD.indexOf(nivelConfiable)
          ? ` ${describirAlerta(alertaLejana, hoy, true)}`
          : ` ${describirContinuacion(alertaConfiable, alertaLejana, hoy)}`;
    }
    return { tono: nivelConfiable, titulo: RESPUESTA_GENERAL[nivelConfiable], detalle, nota: faltantes };
  }

  // La alerta solo está en los días que pueden cambiar.
  if (nivelLejano !== null) {
    return {
      tono: nivelLejano,
      titulo: nivelLejano === "rojo" ? RESPUESTA_GENERAL.rojoPosible : RESPUESTA_GENERAL.amarilloPosible,
      detalle: describirAlerta(alertaLejana, hoy, false),
      nota: faltantes,
    };
  }

  // Sin alertas: completo o con datos faltantes.
  if (faltantes === null) {
    return {
      tono: "verde",
      titulo: RESPUESTA_GENERAL.verde,
      detalle: RESPUESTA_GENERAL.sinAlertas(variablesSinAlerta(reglas), dias.length),
      nota: null,
    };
  }
  return { tono: "verde", titulo: RESPUESTA_GENERAL.verdeIncompleto, detalle: faltantes, nota: null };
}

// Consejos según el tipo de alerta; vacío si no hay ninguna.
export function queHacer(dias: DiaEvaluado[]): string[] {
  const variables = new Set(dias.flatMap(({ evaluacion }) => evaluacion.razones.map((r) => r.variable)));
  if (variables.size === 0) return [];
  return [
    ...(variables.has("lluvia") || variables.has("lluvia3d") ? QUE_HACER.lluvia : []),
    ...(variables.has("rachas") ? QUE_HACER.viento : []),
    ...QUE_HACER.siempre,
  ];
}
