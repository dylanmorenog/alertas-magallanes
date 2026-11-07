// Carga y evalúa el pronóstico para las páginas (`/` y `/mensaje`). Las dos lo obtienen con
// esta misma función, así que no pueden mostrar cosas distintas.

import { obtenerPronosticoConFecha } from "./open-meteo.ts";
import { escenarioDeEjemplo, pronosticoDeEjemplo, type Escenario } from "./ejemplos.ts";
import { evaluarPronostico, type DiaEvaluado } from "./resumen.ts";
import { fechaEnMexico } from "./tiempo.ts";

export type PronosticoCargado = {
  dias: DiaEvaluado[];
  hoy: string; // fecha en México de los datos
  generadoEn: Date; // de cuándo son los datos (no la hora de la visita)
  ejemplo: Escenario | null; // escenario de datos de ejemplo; siempre null en producción
};

export async function cargarPronostico(): Promise<PronosticoCargado> {
  // Datos de ejemplo: solo en desarrollo y solo con la variable de entorno (ver ejemplos.ts).
  // En producción esto siempre es null, sin importar la URL ni las variables de Railway.
  const ejemplo = escenarioDeEjemplo({
    nodeEnv: process.env.NODE_ENV,
    escenario: process.env.PRONOSTICO_DE_EJEMPLO,
  });

  let generadoEn: Date;
  let pronostico;
  if (ejemplo) {
    generadoEn = new Date();
    pronostico = pronosticoDeEjemplo(ejemplo, fechaEnMexico(generadoEn));
  } else {
    ({ dias: pronostico, obtenidoEn: generadoEn } = await obtenerPronosticoConFecha());
  }

  // "Hoy" es el día de los datos. Se elige por fecha, no por posición en la lista.
  const hoy = fechaEnMexico(generadoEn);
  const dias = evaluarPronostico(
    pronostico.filter((dia) => dia.fecha >= hoy),
    hoy,
  );
  if (dias[0]?.dia.fecha !== hoy) {
    throw new Error(`El pronóstico no incluye el día de hoy (${hoy})`);
  }
  return { dias, hoy, generadoEn, ejemplo };
}
