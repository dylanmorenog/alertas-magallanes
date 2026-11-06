import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaLluvia, lluviaAcumulada } from "./lluvia.ts";

test("suma cada día con los 2 anteriores", () => {
  assert.deepEqual(lluviaAcumulada([10, 20, 30, 40, 0], 3), [null, null, 60, 90, 70]);
});

test("los primeros días no tienen suficientes anteriores → null", () => {
  assert.deepEqual(lluviaAcumulada([5, 5], 3), [null, null]);
});

test("si falta un día, toda ventana que lo incluye es null", () => {
  assert.deepEqual(lluviaAcumulada([10, null, 30, 40, 50, 60], 3), [null, null, null, null, 120, 150]);
});

test("redondea a un decimal sin errores de punto flotante", () => {
  assert.deepEqual(lluviaAcumulada([1.6, 0.6, 2.4], 3), [null, null, 4.6]);
});

test("serie vacía → lista vacía", () => {
  assert.deepEqual(lluviaAcumulada([], 3), []);
});

// Escala del SMN: cada límite exacto pertenece a la categoría de abajo.
const categorias: [number, string | null][] = [
  [0, null],
  [0.1, "lluvia"],
  [25, "lluvia"],
  [25.05, "lluvia fuerte"],
  [25.1, "lluvia fuerte"],
  [50, "lluvia fuerte"],
  [50.1, "lluvia muy fuerte"],
  [75, "lluvia muy fuerte"],
  [75.1, "lluvia intensa"],
  [150, "lluvia intensa"],
  [150.1, "lluvia torrencial"],
  [250, "lluvia torrencial"],
  [250.1, "lluvia extraordinaria"],
];

for (const [mm, esperada] of categorias) {
  test(`categoriaLluvia(${mm}) → ${esperada}`, () => {
    assert.equal(categoriaLluvia(mm), esperada);
  });
}
