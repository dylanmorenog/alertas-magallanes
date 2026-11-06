// Datos de ejemplo para revisar la página en todos sus estados (amarillo, rojo, sin datos...)
// sin esperar a que haga mal tiempo de verdad. SOLO en desarrollo:
//
//   PRONOSTICO_DE_EJEMPLO=rojo npm run dev
//
// Tres decisiones para que nunca aparezcan en producción:
// 1. Se activan con una variable de entorno, no con un parámetro en la URL. La página no lee
//    la URL, así que nadie puede activarlos desde un enlace. (Leerla además volvería dinámica
//    la página y perdería el caché de 30 minutos.)
// 2. Se exige NODE_ENV === "development" (lista blanca), en vez de "distinto de producción":
//    si algún día NODE_ENV llega con otro valor o vacío, quedan apagados.
// 3. La página muestra una franja fija de "DATOS DE EJEMPLO" mientras están activos.

import type { PronosticoDia } from "./open-meteo.ts";
import { lluviaAcumulada } from "./lluvia.ts";
import { sumarDias } from "./tiempo.ts";
import { DIAS_LLUVIA_ACUMULADA } from "../config/reglas.ts";

type DiaDeEjemplo = Partial<Omit<PronosticoDia, "fecha" | "lluvia3dMm">>;

const TRANQUILO: Required<DiaDeEjemplo> = { lluviaMm: 2, vientoMaxKmh: 15, rachasMaxKmh: 25, olasMaxM: 0.6 };
const SIN_DATOS: DiaDeEjemplo = { lluviaMm: null, vientoMaxKmh: null, rachasMaxKmh: null, olasMaxM: null };

// Cada escenario: lluvia de los 2 días anteriores (para la lluvia de 3 días) y los cambios
// sobre un día tranquilo para hoy y los 4 siguientes. Los nombres dicen qué respuesta
// general deben producir; una prueba lo verifica.
const ESCENARIOS = {
  verde: { lluviaPasada: [0, 3], dias: [{}, {}, {}, {}, {}] },
  amarillo: {
    lluviaPasada: [0, 5],
    dias: [{}, { lluviaMm: 65 }, { lluviaMm: 30, rachasMaxKmh: 55 }, {}, {}],
  },
  rojo: {
    lluviaPasada: [20, 40],
    dias: [
      { lluviaMm: 60 },
      { lluviaMm: 120, rachasMaxKmh: 75, olasMaxM: 2.8 },
      { lluviaMm: 45, rachasMaxKmh: 55 },
      { lluviaMm: 30 },
      {},
    ],
  },
  // La alerta solo está en los días que pueden cambiar.
  posible: { lluviaPasada: [0, 0], dias: [{}, {}, {}, { rachasMaxKmh: 72 }, { lluviaMm: 55 }] },
  incompleto: {
    lluviaPasada: [0, 0],
    dias: [{}, {}, { olasMaxM: null }, { olasMaxM: null }, SIN_DATOS],
  },
  sindatos: { lluviaPasada: [null, null], dias: [SIN_DATOS, SIN_DATOS, SIN_DATOS, SIN_DATOS, SIN_DATOS] },
} satisfies Record<string, { lluviaPasada: (number | null)[]; dias: DiaDeEjemplo[] }>;

export type Escenario = keyof typeof ESCENARIOS;
export const NOMBRES_ESCENARIOS = Object.keys(ESCENARIOS) as Escenario[];

// Recibe los valores ya leídos (y no `process.env` completo) para poder probarla con
// cualquier combinación sin tocar el entorno real.
export function escenarioDeEjemplo(entorno: {
  nodeEnv: string | undefined;
  escenario: string | undefined;
}): Escenario | null {
  if (entorno.nodeEnv !== "development") return null;
  if (!entorno.escenario) return null;
  if (!(NOMBRES_ESCENARIOS as string[]).includes(entorno.escenario)) {
    // En desarrollo es mejor fallar fuerte que mostrar en silencio el pronóstico real.
    throw new Error(
      `PRONOSTICO_DE_EJEMPLO="${entorno.escenario}" no existe. Opciones: ${NOMBRES_ESCENARIOS.join(", ")}.`,
    );
  }
  return entorno.escenario as Escenario;
}

// Pronóstico de hoy y los 4 días siguientes. Las fechas parten de `hoy` para que la página
// funcione cualquier día, y la lluvia de 3 días se calcula con la misma función que los
// datos reales.
export function pronosticoDeEjemplo(escenario: Escenario, hoy: string): PronosticoDia[] {
  const { lluviaPasada, dias } = ESCENARIOS[escenario];
  const completos = dias.map((cambios: DiaDeEjemplo) => ({ ...TRANQUILO, ...cambios }));
  const lluvia3d = lluviaAcumulada([...lluviaPasada, ...completos.map((d) => d.lluviaMm)], DIAS_LLUVIA_ACUMULADA);

  return completos.map((dia, i) => ({
    fecha: sumarDias(hoy, i),
    ...dia,
    lluvia3dMm: lluvia3d[i + lluviaPasada.length] ?? null,
  }));
}
