import { test } from "node:test";
import assert from "node:assert/strict";
import { explicarRazon, listaDeFaltantes, respuestaDelDia } from "./respuesta.ts";
import type { Evaluacion } from "./semaforo.ts";

function evaluacion(cambios: Partial<Evaluacion> = {}): Evaluacion {
  return { nivel: "verde", razones: [], completo: true, faltantes: [], ...cambios };
}

test("verde completo → SÍ, diciendo solo lo que sabemos", () => {
  const r = respuestaDelDia(evaluacion());
  assert.equal(r.tono, "verde");
  assert.equal(r.titulo, "SÍ");
  assert.equal(r.detalle, "Sin alertas de viento, olas ni lluvia.");
  assert.equal(r.nota, null);
});

test("verde incompleto → PROBABLEMENTE SÍ, nombrando lo que falta", () => {
  const r = respuestaDelDia(evaluacion({ completo: false, faltantes: ["olas"] }));
  assert.equal(r.titulo, "PROBABLEMENTE SÍ");
  assert.match(r.detalle, /Faltan datos de olas;/);
});

test("el texto de faltantes se arma con lo que falta, no con un texto fijo", () => {
  const r = respuestaDelDia(evaluacion({ completo: false, faltantes: ["lluvia"] }));
  assert.match(r.detalle, /Faltan datos de lluvia;/);
  assert.doesNotMatch(r.detalle, /olas/);
});

test("varios faltantes se unen en español", () => {
  assert.equal(listaDeFaltantes(["rachas", "olas", "lluvia"]), "rachas de viento, olas y lluvia");
});

test("amarillo → CON MUCHO CUIDADO", () => {
  const r = respuestaDelDia(evaluacion({ nivel: "amarillo" }));
  assert.equal(r.tono, "amarillo");
  assert.equal(r.titulo, "CON MUCHO CUIDADO");
  assert.equal(r.nota, null);
});

test("rojo incompleto → NO, con nota de que podría ser peor", () => {
  const r = respuestaDelDia(evaluacion({ nivel: "rojo", completo: false, faltantes: ["olas"] }));
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "NO");
  assert.match(r.nota ?? "", /Faltan datos de olas; las condiciones podrían ser peores/);
});

test("sin datos → NO SABEMOS en gris, nunca un color del semáforo", () => {
  const r = respuestaDelDia(
    evaluacion({ nivel: null, completo: false, faltantes: ["rachas", "olas", "lluvia"] }),
  );
  assert.equal(r.tono, "gris");
  assert.equal(r.titulo, "NO SABEMOS");
});

test("explicarRazon usa lenguaje sencillo y el umbral superado", () => {
  assert.equal(
    explicarRazon({ variable: "rachas", valor: 75, umbral: 70, nivel: "rojo" }),
    "Rachas de viento de hasta 75 km/h (peligro desde 70 km/h).",
  );
  assert.equal(
    explicarRazon({ variable: "olas", valor: 1.63, umbral: 1.5, nivel: "amarillo" }),
    "Olas de hasta 1.6 m en el mar (precaución desde 1.5 m).",
  );
});
