import { test } from "node:test";
import assert from "node:assert/strict";
import { explicarRazon, listaDeFaltantes, notaUmbralesEnPrueba, respuestaDelDia } from "./respuesta.ts";
import type { Evaluacion, Reglas } from "./semaforo.ts";
import { UMBRALES } from "../config/reglas.ts";

function evaluacion(cambios: Partial<Evaluacion> = {}): Evaluacion {
  return { nivel: "verde", razones: [], completo: true, faltantes: [], ...cambios };
}

const hoy = "2026-11-05";

test("día verde completo → Sin alertas", () => {
  assert.deepEqual(respuestaDelDia(evaluacion()), { tono: "verde", titulo: "Sin alertas", faltan: null });
});

test("día verde incompleto → Sin alertas, diciendo qué falta", () => {
  const r = respuestaDelDia(evaluacion({ completo: false, faltantes: ["olas"] }));
  assert.equal(r.titulo, "Sin alertas");
  assert.equal(r.faltan, "Faltan datos de olas.");
});

test("día rojo incompleto → Peligro, y lo que falta podría empeorarlo", () => {
  const r = respuestaDelDia(evaluacion({ nivel: "rojo", completo: false, faltantes: ["lluvia3d"] }));
  assert.equal(r.titulo, "Peligro");
  assert.equal(r.faltan, "Faltan datos de lluvia de 3 días; podría ser peor.");
});

test("día sin datos → gris, nunca un color del semáforo", () => {
  const r = respuestaDelDia(evaluacion({ nivel: null, completo: false, faltantes: ["lluvia", "olas"] }));
  assert.deepEqual(r, { tono: "gris", titulo: "Sin datos", faltan: null });
});

test("varios faltantes se unen en español", () => {
  assert.equal(listaDeFaltantes(["rachas", "olas", "lluvia"]), "rachas de viento, olas y lluvia");
});

test("la lluvia del día usa la categoría del SMN", () => {
  assert.equal(
    explicarRazon({ variable: "lluvia", valor: 90, umbral: 50, nivel: "amarillo" }, { fecha: hoy, hoy }),
    "Lluvia intensa: 90 mm en el día (precaución desde 50 mm).",
  );
});

test("la lluvia de 3 días se explica según el día", () => {
  const razon = { variable: "lluvia3d", valor: 120, umbral: 100, nivel: "amarillo" } as const;
  assert.equal(
    explicarRazon(razon, { fecha: hoy, hoy }),
    "Lluvia de hoy y los 2 días anteriores: 120 mm (precaución desde 100 mm, umbral en prueba).",
  );
  assert.equal(
    explicarRazon(razon, { fecha: "2026-11-07", hoy }),
    "Lluvia del sábado 7 y los 2 días anteriores: 120 mm (precaución desde 100 mm, umbral en prueba).",
  );
});

test("viento y olas en lenguaje sencillo", () => {
  assert.equal(
    explicarRazon({ variable: "rachas", valor: 75, umbral: 70, nivel: "rojo" }, { fecha: hoy, hoy }),
    "Rachas de viento de hasta 75 km/h (peligro desde 70 km/h).",
  );
  assert.equal(
    explicarRazon({ variable: "olas", valor: 1.63, umbral: 1.5, nivel: "amarillo" }, { fecha: hoy, hoy }),
    "Olas de hasta 1.6 m en el mar (precaución desde 1.5 m).",
  );
});

test("la nota al pie lista los umbrales por validar", () => {
  assert.equal(
    notaUmbralesEnPrueba(),
    "Umbrales en prueba: lluvia de 3 días (amarillo desde 100 mm, rojo desde 200 mm). " +
      "Se ajustarán con datos de inundaciones reales del pueblo.",
  );
});

test("sin umbrales por validar no hay nota", () => {
  const validadas: Reglas = { ...UMBRALES, lluvia3d: { ...UMBRALES.lluvia3d, porValidar: false } };
  assert.equal(notaUmbralesEnPrueba(validadas), null);
});
