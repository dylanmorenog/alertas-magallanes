// Semáforo por día: convierte un pronóstico en verde, amarillo o rojo.
// Función pura: no usa la red ni la consola, para poder probarla y reutilizarla en la web.

import type { PronosticoDia } from "./open-meteo.ts";
import { UMBRALES } from "../config/reglas.ts";

export type Nivel = "verde" | "amarillo" | "rojo";

export const VARIABLES = ["rachas", "olas", "lluvia"] as const;
export type Variable = (typeof VARIABLES)[number];

// Por qué un día no es verde: qué variable, cuánto marcó y qué umbral superó.
export type Razon = {
  variable: Variable;
  valor: number;
  umbral: number;
  nivel: Exclude<Nivel, "verde">;
};

export type Evaluacion = {
  nivel: Nivel | null; // null = no llegó ningún dato, no hay color confiable
  razones: Razon[];
  completo: boolean;
  faltantes: Variable[];
};

const ORDEN: Nivel[] = ["verde", "amarillo", "rojo"];

function nivelDe(valor: number, umbral: { amarillo: number; rojo: number }): Nivel {
  if (valor >= umbral.rojo) return "rojo";
  if (valor >= umbral.amarillo) return "amarillo";
  return "verde";
}

// El peor manda. Partir de null (y no de "verde") evita suponer que todo está bien sin datos.
function peor(actual: Nivel | null, nuevo: Nivel): Nivel {
  if (actual === null) return nuevo;
  return ORDEN.indexOf(nuevo) > ORDEN.indexOf(actual) ? nuevo : actual;
}

export function evaluarDia(dia: PronosticoDia): Evaluacion {
  const valores: Record<Variable, number | null> = {
    rachas: dia.rachasMaxKmh,
    olas: dia.olasMaxM,
    lluvia: dia.lluviaMm,
  };

  let nivel: Nivel | null = null;
  const razones: Razon[] = [];
  const faltantes: Variable[] = [];

  for (const variable of VARIABLES) {
    const valor = valores[variable];
    if (valor === null) {
      faltantes.push(variable);
      continue;
    }
    const nivelVariable = nivelDe(valor, UMBRALES[variable]);
    if (nivelVariable !== "verde") {
      razones.push({ variable, valor, umbral: UMBRALES[variable][nivelVariable], nivel: nivelVariable });
    }
    nivel = peor(nivel, nivelVariable);
  }

  return { nivel, razones, completo: faltantes.length === 0, faltantes };
}
