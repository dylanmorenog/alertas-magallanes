// Textos por día: la etiqueta de cada día y la explicación sencilla de sus razones.

import { VARIABLES, type Evaluacion, type Nivel, type Razon, type Reglas, type Variable } from "./semaforo.ts";
import { categoriaLluvia } from "./lluvia.ts";
import { delDia } from "./tiempo.ts";
import {
  FALTAN_DATOS,
  FALTAN_DATOS_PODRIA_SER_PEOR,
  FRASES,
  NIVELES_DIA,
  NOMBRES,
  NOTA_EN_PRUEBA,
  PALABRA_NIVEL,
  TEXTO_EN_PRUEBA,
  UMBRALES,
} from "../config/reglas.ts";

// "gris" solo existe en la presentación: no es un nivel del semáforo, es la ausencia de uno.
export type Tono = Nivel | "gris";

export type RespuestaDia = {
  tono: Tono;
  titulo: string;
  faltan: string | null; // qué datos faltan, si la evaluación está incompleta
};

const numero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
export const lista = new Intl.ListFormat("es", { type: "conjunction" });

// ["olas", "lluvia"] → "olas y lluvia"
export function listaDeFaltantes(faltantes: Variable[]): string {
  return lista.format(faltantes.map((variable) => NOMBRES[variable]));
}

export function respuestaDelDia(evaluacion: Evaluacion): RespuestaDia {
  const faltan = evaluacion.completo ? null : listaDeFaltantes(evaluacion.faltantes);

  switch (evaluacion.nivel) {
    case null:
      return { tono: "gris", titulo: NIVELES_DIA.sinDatos, faltan: null };
    case "verde":
      return { tono: "verde", titulo: NIVELES_DIA.verde, faltan: faltan && FALTAN_DATOS(faltan) };
    case "amarillo":
    case "rojo":
      return {
        tono: evaluacion.nivel,
        titulo: NIVELES_DIA[evaluacion.nivel],
        faltan: faltan && FALTAN_DATOS_PODRIA_SER_PEOR(faltan),
      };
  }
}

// "Lluvia intensa: 90 mm en el día (precaución desde 50 mm)."
// "Lluvia de hoy y los 2 días anteriores: 120 mm (precaución desde 100 mm, umbral en prueba)."
export function explicarRazon(
  razon: Razon,
  cuando: { fecha: string; hoy: string },
  reglas: Reglas = UMBRALES,
): string {
  const regla = reglas[razon.variable];
  const frase = FRASES[razon.variable]({
    valor: numero.format(razon.valor),
    delDia: delDia(cuando.fecha, cuando.hoy),
    categoria: razon.variable === "lluvia" ? categoriaLluvia(razon.valor) : null,
  });
  const enPrueba = regla.porValidar ? `, ${TEXTO_EN_PRUEBA}` : "";
  return `${frase} (${PALABRA_NIVEL[razon.nivel]} desde ${numero.format(razon.umbral)} ${regla.unidad}${enPrueba}).`;
}

// Versión corta, sin umbrales, para el mensaje de Facebook:
// "lluvia intensa (120 mm)", "lluvia de 3 días (210 mm, umbral en prueba)".
export function razonCorta(razon: Razon, reglas: Reglas = UMBRALES): string {
  const regla = reglas[razon.variable];
  const nombre = razon.variable === "lluvia" ? (categoriaLluvia(razon.valor) ?? "lluvia") : NOMBRES[razon.variable];
  const enPrueba = regla.porValidar ? `, ${TEXTO_EN_PRUEBA}` : "";
  return `${nombre} (${numero.format(razon.valor)} ${regla.unidad}${enPrueba})`;
}

// Nota al pie con los umbrales por validar, o null si ya no queda ninguno.
export function notaUmbralesEnPrueba(reglas: Reglas = UMBRALES): string | null {
  const enPrueba = VARIABLES.filter((variable) => reglas[variable].porValidar && reglas[variable].mueveElColor);
  if (enPrueba.length === 0) return null;
  const detalle = enPrueba.map((variable) => {
    const { amarillo, rojo, unidad } = reglas[variable];
    return `${NOMBRES[variable]} (amarillo desde ${numero.format(amarillo)} ${unidad}, rojo desde ${numero.format(rojo)} ${unidad})`;
  });
  return NOTA_EN_PRUEBA(lista.format(detalle));
}
