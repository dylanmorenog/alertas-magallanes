import { test } from "node:test";
import assert from "node:assert/strict";
import { copiarTexto } from "./copiar.ts";

const nunca = () => {
  throw new Error("no debía usarse el respaldo");
};

test("con portapapeles moderno, copia y no usa el respaldo", async () => {
  let copiado = "";
  const r = await copiarTexto("hola", {
    portapapeles: { writeText: async (t) => void (copiado = t) },
    seleccionarYCopiar: nunca,
  });
  assert.equal(r, "copiado");
  assert.equal(copiado, "hola");
});

test("si el portapapeles falla (sin permiso), usa el respaldo", async () => {
  let usoRespaldo = false;
  const r = await copiarTexto("hola", {
    portapapeles: { writeText: async () => Promise.reject(new Error("NotAllowedError")) },
    seleccionarYCopiar: () => (usoRespaldo = true),
  });
  assert.equal(r, "copiado");
  assert.ok(usoRespaldo);
});

test("sin portapapeles (navegador viejo o http), usa el respaldo", async () => {
  assert.equal(await copiarTexto("hola", { seleccionarYCopiar: () => true }), "copiado");
});

test("si nada funciona, pide copiar a mano", async () => {
  assert.equal(await copiarTexto("hola", { seleccionarYCopiar: () => false }), "a-mano");
  assert.equal(
    await copiarTexto("hola", {
      seleccionarYCopiar: () => {
        throw new Error("execCommand no existe");
      },
    }),
    "a-mano",
  );
});
