// Muestra en consola el pronóstico de hoy y los próximos 4 días para Sánchez Magallanes.
// Uso: npm run pronostico

import { obtenerPronostico } from "../src/lib/open-meteo.ts";
import { explicarRazon, notaUmbralesEnPrueba, respuestaDelDia } from "../src/lib/respuesta.ts";
import { evaluarPronostico, queHacer, respuestaGeneral } from "../src/lib/resumen.ts";
import { fechaEnMexico } from "../src/lib/tiempo.ts";
import { PREGUNTA } from "../src/config/reglas.ts";

const COLORES = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚪" };

function formatear(valor: number | null, unidad: string): string {
  return valor === null ? "sin dato" : `${valor} ${unidad}`;
}

try {
  const hoy = fechaEnMexico(new Date());
  const dias = evaluarPronostico(await obtenerPronostico(), hoy);
  const general = respuestaGeneral(dias, hoy);

  console.log(`${PREGUNTA}\n`);
  console.log(`${COLORES[general.tono]} ${general.titulo}`);
  console.log(`   ${general.detalle}`);
  if (general.nota) console.log(`   ${general.nota}`);

  console.log();
  console.table(
    Object.fromEntries(
      dias.map(({ dia, evaluacion, puedeCambiar }) => {
        const respuesta = respuestaDelDia(evaluacion);
        return [
          dia.fecha,
          {
            Semáforo: `${COLORES[respuesta.tono]} ${respuesta.titulo}${puedeCambiar ? " · puede cambiar" : ""}`,
            Lluvia: formatear(dia.lluviaMm, "mm"),
            "Lluvia 3 días": formatear(dia.lluvia3dMm, "mm"),
            "Viento máx": formatear(dia.vientoMaxKmh, "km/h"),
            "Rachas máx": formatear(dia.rachasMaxKmh, "km/h"),
            "Olas máx": formatear(dia.olasMaxM, "m"),
          },
        ];
      }),
    ),
  );

  for (const { dia, evaluacion } of dias) {
    const respuesta = respuestaDelDia(evaluacion);
    const lineas = evaluacion.razones.map((razon) => explicarRazon(razon, { fecha: dia.fecha, hoy }));
    if (respuesta.faltan) lineas.push(respuesta.faltan);
    if (lineas.length > 0) {
      console.log(`\n${dia.fecha}:`);
      for (const linea of lineas) console.log(`  - ${linea}`);
    }
  }

  const { principales, mas } = queHacer(dias);
  if (principales.length > 0) {
    console.log("\nQué hacer:");
    for (const consejo of principales) console.log(`  - ${consejo}`);
  }
  if (mas.length > 0) {
    console.log("\nMás consejos (en la página, plegados; no van en el mensaje):");
    for (const consejo of mas) console.log(`  - ${consejo}`);
  }

  const nota = notaUmbralesEnPrueba();
  if (nota) console.log(`\n${nota}`);
  console.log("\nDatos: Open-Meteo.com");
} catch (error) {
  console.error("No se pudo obtener el pronóstico:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
