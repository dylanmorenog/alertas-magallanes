// Decisión de la comunidad: la app no predice suspensión de clases.
// Se revisa el código fuente (no solo los textos generados) porque muchos textos son
// funciones; así también se detecta una frase nueva que nadie ha llegado a mostrar.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "..");
const CARPETAS = ["src/config", "src/lib", "app"];
const PROHIBIDAS = /\b(clases?|escuelas?|escolar(es)?)\b/i;

const archivos = CARPETAS.flatMap((carpeta) =>
  readdirSync(join(RAIZ, carpeta))
    .filter((nombre) => /\.tsx?$/.test(nombre) && !nombre.endsWith(".test.ts"))
    .map((nombre) => join(carpeta, nombre)),
);

test("hay archivos que revisar (la prueba no pasa en vacío)", () => {
  assert.ok(archivos.length >= 10, `solo se encontraron ${archivos.length} archivos`);
});

for (const archivo of archivos) {
  test(`${archivo} no menciona clases ni escuela`, () => {
    const lineas = readFileSync(join(RAIZ, archivo), "utf8").split("\n");
    const encontradas = lineas
      .map((linea, i) => [i + 1, linea] as const)
      .filter(([, linea]) => PROHIBIDAS.test(linea))
      .map(([n, linea]) => `${archivo}:${n}: ${linea.trim()}`);
    assert.deepEqual(encontradas, []);
  });
}
