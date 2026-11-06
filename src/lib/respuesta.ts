// Traduce una evaluación del semáforo a lo que ve la gente: la respuesta grande y sus explicaciones.

import type { Evaluacion, Nivel, Razon, Variable } from "./semaforo.ts";
import { FRASES, NOMBRES, PALABRA_NIVEL, RESPUESTAS, UMBRALES } from "../config/reglas.ts";

// "gris" solo existe en la presentación: no es un nivel del semáforo, es la ausencia de uno.
export type Tono = Nivel | "gris";

export type Respuesta = {
  tono: Tono;
  titulo: string;
  detalle: string;
  nota: string | null; // datos faltantes en un día amarillo o rojo
};

const numero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const lista = new Intl.ListFormat("es", { type: "conjunction" });

// ["olas", "lluvia"] → "olas y lluvia"
export function listaDeFaltantes(faltantes: Variable[]): string {
  return lista.format(faltantes.map((variable) => NOMBRES[variable]));
}

export function respuestaDelDia(evaluacion: Evaluacion): Respuesta {
  const faltan = listaDeFaltantes(evaluacion.faltantes);

  switch (evaluacion.nivel) {
    case null:
      return { tono: "gris", ...RESPUESTAS.sinDatos, nota: null };
    case "verde":
      if (evaluacion.completo) return { tono: "verde", ...RESPUESTAS.verde, nota: null };
      return {
        tono: "verde",
        titulo: RESPUESTAS.verdeIncompleto.titulo,
        detalle: RESPUESTAS.verdeIncompleto.detalle(faltan),
        nota: null,
      };
    case "amarillo":
    case "rojo":
      return {
        tono: evaluacion.nivel,
        ...RESPUESTAS[evaluacion.nivel],
        nota: evaluacion.completo ? null : RESPUESTAS.faltanDatos(faltan),
      };
  }
}

// { rachas, 75, 70, rojo } → "Rachas de viento de hasta 75 km/h (peligro desde 70 km/h)."
export function explicarRazon(razon: Razon): string {
  const unidad = UMBRALES[razon.variable].unidad;
  const frase = FRASES[razon.variable](numero.format(razon.valor));
  return `${frase} (${PALABRA_NIVEL[razon.nivel]} desde ${numero.format(razon.umbral)} ${unidad}).`;
}
