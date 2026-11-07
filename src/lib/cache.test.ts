// La página principal y /mensaje comparten la caché de datos de Open-Meteo. Next exige que
// `revalidate` de la página sea un número escrito tal cual (no puede importar la
// constante), así que esta prueba revisa que los dos valores coincidan.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SEGUNDOS_CACHE, fechaMasVieja } from "./open-meteo.ts";

test("revalidate de la página principal coincide con la caché de Open-Meteo", () => {
  const pagina = readFileSync(join(import.meta.dirname, "..", "..", "app", "page.tsx"), "utf8");
  const revalidate = pagina.match(/export const revalidate = (\d+);/)?.[1];
  assert.equal(Number(revalidate), SEGUNDOS_CACHE);
});

test("los datos son tan viejos como la respuesta más vieja", () => {
  const ahora = new Date("2026-11-06T20:00:00Z");
  const clima = new Date("2026-11-06T19:40:00Z");
  const mar = new Date("2026-11-06T19:35:00Z");
  assert.deepEqual(fechaMasVieja([clima, mar], ahora), mar);
  assert.deepEqual(fechaMasVieja([clima, null], ahora), clima);
  assert.deepEqual(fechaMasVieja([null, null], ahora), ahora);
});
