// Lluvia acumulada en una ventana de días, para estimar riesgo de inundación.
// No sabe de dónde vienen los datos (pronóstico o histórico): solo recibe una serie diaria.

import { ESCALA_LLUVIA_24H } from "../config/reglas.ts";

// Categoría de la escala del SMN para la lluvia de un día, o null si no llovió.
// Se usa "más de" el límite y no "desde el límite + 0.1": así 25.05 mm (posible tras
// redondeos) también tiene categoría, sin huecos entre 25.0 y 25.1.
export function categoriaLluvia(mm: number): string | null {
  let categoria: string | null = null;
  for (const { masDe, nombre } of ESCALA_LLUVIA_24H.categorias) {
    if (mm > masDe) categoria = nombre;
  }
  return categoria;
}

// Para cada día, la suma de ese día y los (dias - 1) anteriores.
// Si falta cualquier día de la ventana, o no hay suficientes días anteriores, el resultado
// es null: una suma parcial afirmaría un total que no conocemos.
export function lluviaAcumulada(serie: (number | null)[], dias: number): (number | null)[] {
  return serie.map((_, i) => {
    if (i < dias - 1) return null;
    let suma = 0;
    for (const valor of serie.slice(i - dias + 1, i + 1)) {
      if (valor === null) return null;
      suma += valor;
    }
    // Redondear a un decimal: en binario, 1.6 + 0.6 + 2.4 da 4.6000000000000005.
    return Math.round(suma * 10) / 10;
  });
}
