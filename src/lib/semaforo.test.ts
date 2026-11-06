import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarDia, type Reglas } from "./semaforo.ts";
import { UMBRALES } from "../config/reglas.ts";
import type { PronosticoDia } from "./open-meteo.ts";

// Un día tranquilo; cada prueba cambia solo lo que le interesa.
function dia(cambios: Partial<PronosticoDia> = {}): PronosticoDia {
  return {
    fecha: "2026-11-05",
    lluviaMm: 0,
    lluvia3dMm: 0,
    vientoMaxKmh: 10,
    rachasMaxKmh: 20,
    olasMaxM: 0.5,
    ...cambios,
  };
}

// Las mismas reglas de la configuración, pero con las olas solo como dato.
const sinOlas: Reglas = { ...UMBRALES, olas: { ...UMBRALES.olas, mueveElColor: false } };

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
  [{ lluvia3dMm: 99.9 }, "verde"],
  [{ lluvia3dMm: 100 }, "amarillo"],
  [{ lluvia3dMm: 199.9 }, "amarillo"],
  [{ lluvia3dMm: 200 }, "rojo"],
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

test("las razones salen en orden: lluvia, lluvia en 3 días, rachas, olas", () => {
  const e = evaluarDia(dia({ olasMaxM: 2, rachasMaxKmh: 55, lluvia3dMm: 210, lluviaMm: 60 }));
  assert.equal(e.nivel, "rojo");
  assert.deepEqual(
    e.razones.map((r) => [r.variable, r.nivel]),
    [
      ["lluvia", "amarillo"],
      ["lluvia3d", "rojo"],
      ["rachas", "amarillo"],
      ["olas", "amarillo"],
    ],
  );
});

test("lluvia en 3 días sin dato → incompleto", () => {
  const e = evaluarDia(dia({ lluvia3dMm: null }));
  assert.equal(e.nivel, "verde");
  assert.equal(e.completo, false);
  assert.deepEqual(e.faltantes, ["lluvia3d"]);
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
  const e = evaluarDia(dia({ lluviaMm: null, lluvia3dMm: null, rachasMaxKmh: null, olasMaxM: null }));
  assert.equal(e.nivel, null);
  assert.equal(e.completo, false);
  assert.deepEqual(e.faltantes, ["lluvia", "lluvia3d", "rachas", "olas"]);
  assert.deepEqual(e.razones, []);
});

test("olas desactivadas: olas altas no cambian el color", () => {
  const e = evaluarDia(dia({ olasMaxM: 3 }), sinOlas);
  assert.equal(e.nivel, "verde");
  assert.deepEqual(e.razones, []);
});

test("olas desactivadas: que falte su dato no vuelve incompleta la evaluación", () => {
  const e = evaluarDia(dia({ olasMaxM: null }), sinOlas);
  assert.equal(e.completo, true);
  assert.deepEqual(e.faltantes, []);
});

test("olas desactivadas: las demás variables siguen contando", () => {
  assert.equal(evaluarDia(dia({ rachasMaxKmh: 75, olasMaxM: null }), sinOlas).nivel, "rojo");
});

test("reglas inyectadas: el mismo día cambia de color con otros umbrales", () => {
  const masEstrictas: Reglas = { ...UMBRALES, lluvia3d: { ...UMBRALES.lluvia3d, amarillo: 80, rojo: 150 } };
  const tormenta = dia({ lluvia3dMm: 160 });
  assert.equal(evaluarDia(tormenta).nivel, "amarillo");
  assert.equal(evaluarDia(tormenta, masEstrictas).nivel, "rojo");
});
