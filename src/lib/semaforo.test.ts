import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarDia } from "./semaforo.ts";
import type { PronosticoDia } from "./open-meteo.ts";

// Un día tranquilo; cada prueba cambia solo lo que le interesa.
function dia(cambios: Partial<PronosticoDia> = {}): PronosticoDia {
  return {
    fecha: "2026-11-05",
    lluviaMm: 0,
    vientoMaxKmh: 10,
    rachasMaxKmh: 20,
    olasMaxM: 0.5,
    ...cambios,
  };
}

test("todo bajo los umbrales → verde y completo", () => {
  const e = evaluarDia(dia());
  assert.equal(e.nivel, "verde");
  assert.equal(e.completo, true);
  assert.deepEqual(e.faltantes, []);
  assert.deepEqual(e.razones, []);
});

// Bordes: el umbral exacto ya cuenta (≥), un poco menos no.
const bordes: [Partial<PronosticoDia>, string][] = [
  [{ rachasMaxKmh: 49.9 }, "verde"],
  [{ rachasMaxKmh: 50 }, "amarillo"],
  [{ rachasMaxKmh: 69.9 }, "amarillo"],
  [{ rachasMaxKmh: 70 }, "rojo"],
  [{ olasMaxM: 1.49 }, "verde"],
  [{ olasMaxM: 1.5 }, "amarillo"],
  [{ olasMaxM: 2.5 }, "rojo"],
  [{ lluviaMm: 49.9 }, "verde"],
  [{ lluviaMm: 50 }, "amarillo"],
  [{ lluviaMm: 100 }, "rojo"],
];

for (const [cambios, esperado] of bordes) {
  test(`borde ${JSON.stringify(cambios)} → ${esperado}`, () => {
    assert.equal(evaluarDia(dia(cambios)).nivel, esperado);
  });
}

test("una sola variable en rojo vuelve rojo el día", () => {
  const e = evaluarDia(dia({ olasMaxM: 3 }));
  assert.equal(e.nivel, "rojo");
  assert.deepEqual(e.razones, [{ variable: "olas", valor: 3, umbral: 2.5, nivel: "rojo" }]);
});

test("cada variable que supera un umbral aparece en las razones", () => {
  const e = evaluarDia(dia({ rachasMaxKmh: 55, lluviaMm: 120 }));
  assert.equal(e.nivel, "rojo");
  assert.deepEqual(
    e.razones.map((r) => [r.variable, r.nivel]),
    [
      ["rachas", "amarillo"],
      ["lluvia", "rojo"],
    ],
  );
});

test("rachas 75 + olas null → rojo e incompleto", () => {
  const e = evaluarDia(dia({ rachasMaxKmh: 75, olasMaxM: null }));
  assert.equal(e.nivel, "rojo");
  assert.equal(e.completo, false);
  assert.deepEqual(e.faltantes, ["olas"]);
});

test("todo bajo umbral + olas null → verde e incompleto", () => {
  const e = evaluarDia(dia({ olasMaxM: null }));
  assert.equal(e.nivel, "verde");
  assert.equal(e.completo, false);
  assert.deepEqual(e.faltantes, ["olas"]);
});

test("todos los datos null → incompleto y sin color", () => {
  const e = evaluarDia(dia({ rachasMaxKmh: null, olasMaxM: null, lluviaMm: null }));
  assert.equal(e.nivel, null);
  assert.equal(e.completo, false);
  assert.deepEqual(e.faltantes, ["rachas", "olas", "lluvia"]);
  assert.deepEqual(e.razones, []);
});
