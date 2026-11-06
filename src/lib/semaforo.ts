// Semáforo por día: convierte un pronóstico en verde, amarillo o rojo.
// Función pura: no usa la red ni la consola, para poder probarla y reutilizarla en la web.

import type { PronosticoDia } from "./open-meteo.ts";
import { UMBRALES } from "../config/reglas.ts";

export type Nivel = "verde" | "amarillo" | "rojo";

// El orden define en qué orden se listan razones y faltantes: primero lo que más importa
// a los hogares (lluvia e inundación), al final el dato secundario (olas).
export const VARIABLES = ["lluvia", "lluvia3d", "rachas", "olas"] as const;
export type Variable = (typeof VARIABLES)[number];

export type Regla = {
  amarillo: number;
  rojo: number;
  unidad: string;
  mueveElColor: boolean; // false = se muestra como dato, pero no cuenta para el color
  porValidar: boolean; // umbral provisional, pendiente de validar con datos reales
};
export type Reglas = Record<Variable, Regla>;

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

function nivelDe(valor: number, regla: Regla): Nivel {
  if (valor >= regla.rojo) return "rojo";
  if (valor >= regla.amarillo) return "amarillo";
  return "verde";
}

// El peor manda. Partir de null (y no de "verde") evita suponer que todo está bien sin datos.
function peor(actual: Nivel | null, nuevo: Nivel): Nivel {
  if (actual === null) return nuevo;
  return ORDEN.indexOf(nuevo) > ORDEN.indexOf(actual) ? nuevo : actual;
}

// Las reglas llegan como parámetro (por defecto, las de la configuración) para poder
// probar otras y comparar umbrales sobre los mismos datos históricos.
export function evaluarDia(dia: PronosticoDia, reglas: Reglas = UMBRALES): Evaluacion {
  const valores: Record<Variable, number | null> = {
    lluvia: dia.lluviaMm,
    lluvia3d: dia.lluvia3dMm,
    rachas: dia.rachasMaxKmh,
    olas: dia.olasMaxM,
  };

  let nivel: Nivel | null = null;
  const razones: Razon[] = [];
  const faltantes: Variable[] = [];

  for (const variable of VARIABLES) {
    const regla = reglas[variable];
    // Si no cuenta para el color, tampoco cuenta que falte su dato.
    if (!regla.mueveElColor) continue;

    const valor = valores[variable];
    if (valor === null) {
      faltantes.push(variable);
      continue;
    }
    const nivelVariable = nivelDe(valor, regla);
    if (nivelVariable !== "verde") {
      razones.push({ variable, valor, umbral: regla[nivelVariable], nivel: nivelVariable });
    }
    nivel = peor(nivel, nivelVariable);
  }

  return { nivel, razones, completo: faltantes.length === 0, faltantes };
}
