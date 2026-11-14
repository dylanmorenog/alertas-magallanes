// Contrato con los monitores de UptimeRobot, que viven fuera del código: buscan estos textos
// exactos en la página para avisar cuándo publicar en Facebook ("Sí, viene mal tiempo",
// "Posible mal tiempo") y cuándo no hay datos ("No sabemos"). Si esta prueba falla, alguien
// cambió un encabezado: actualiza también los monitores, o dejarán de avisar sin que nadie
// se entere.

import { test } from "node:test";
import assert from "node:assert/strict";
import { RESPUESTA_GENERAL } from "../config/reglas.ts";

const MONITOREADOS = {
  rojo: "Sí, viene mal tiempo",
  rojoPosible: "Posible mal tiempo",
  sinDatos: "No sabemos",
} as const;

for (const [clave, texto] of Object.entries(MONITOREADOS)) {
  test(`el encabezado «${texto}» no cambió (lo busca un monitor de UptimeRobot)`, () => {
    assert.equal(RESPUESTA_GENERAL[clave as keyof typeof MONITOREADOS], texto);
  });
}

// "Sí" debe usar la í ya acentuada (un solo carácter, U+00ED), que es la que produce el
// teclado. Si alguien la escribiera como "i" + acento combinado (dos caracteres), se vería
// igual, pero la búsqueda del monitor no la encontraría.
test("los textos monitoreados usan caracteres acentuados de un solo código (NFC)", () => {
  for (const texto of Object.values(MONITOREADOS)) assert.equal(texto, texto.normalize("NFC"));
  assert.equal(RESPUESTA_GENERAL.rojo.codePointAt(1), 0xed);
});
