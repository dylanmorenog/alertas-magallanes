// Muestra en consola el pronóstico de los próximos 3 días para Sánchez Magallanes.
// Uso: npm run pronostico

import { obtenerPronostico } from "../src/lib/open-meteo.ts";
import { evaluarDia, type Evaluacion } from "../src/lib/semaforo.ts";
import { UMBRALES } from "../src/config/reglas.ts";

const COLORES = { verde: "🟢 verde", amarillo: "🟡 amarillo", rojo: "🔴 rojo" };

function formatear(valor: number | null, unidad: string): string {
  return valor === null ? "sin dato" : `${valor} ${unidad}`;
}

function textoSemaforo(evaluacion: Evaluacion): string {
  if (evaluacion.nivel === null) return "⚪ sin datos";
  const color = COLORES[evaluacion.nivel];
  return evaluacion.completo ? color : `${color} (incompleto)`;
}

// Explica en frases cortas por qué un día no es un verde completo.
function motivos(evaluacion: Evaluacion): string[] {
  const lineas = evaluacion.razones.map(({ variable, valor, umbral, nivel }) => {
    const unidad = UMBRALES[variable].unidad;
    return `${variable}: ${valor} ${unidad} (${nivel} desde ${umbral} ${unidad})`;
  });
  if (evaluacion.faltantes.length > 0) {
    lineas.push(`sin dato de: ${evaluacion.faltantes.join(", ")}`);
  }
  if (evaluacion.nivel === null) {
    lineas.push("no hay color confiable para este día; consulta a Capitanía de Puerto");
  } else if (evaluacion.nivel === "verde" && !evaluacion.completo) {
    lineas.push("verde con datos incompletos: no lo tomes como un sí seguro");
  }
  return lineas;
}

try {
  const dias = (await obtenerPronostico()).map((dia) => ({ dia, evaluacion: evaluarDia(dia) }));

  console.log("Pronóstico para Sánchez Magallanes, Tabasco\n");
  console.table(
    Object.fromEntries(
      dias.map(({ dia, evaluacion }) => [
        dia.fecha,
        {
          Semáforo: textoSemaforo(evaluacion),
          Lluvia: formatear(dia.lluviaMm, "mm"),
          "Viento máx": formatear(dia.vientoMaxKmh, "km/h"),
          "Rachas máx": formatear(dia.rachasMaxKmh, "km/h"),
          "Olas máx": formatear(dia.olasMaxM, "m"),
        },
      ]),
    ),
  );

  for (const { dia, evaluacion } of dias) {
    const lineas = motivos(evaluacion);
    if (lineas.length > 0) {
      console.log(`\n${dia.fecha}:`);
      for (const linea of lineas) console.log(`  - ${linea}`);
    }
  }

  console.log("\nDatos: Open-Meteo.com");
} catch (error) {
  console.error("No se pudo obtener el pronóstico:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
