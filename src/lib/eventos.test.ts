import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validarEventos } from "./eventos.ts";

const valido = {
  id: "2026-10-frente-frio-2",
  fecha: "2026-10-17",
  hasta: "2026-10-18",
  descripcion: "Frente frío 2",
  alcance: "cardenas",
  fuentes: [{ nombre: "Publimetro", url: "https://example.org/nota" }],
  verificadoEl: "2026-11-06",
  notas: null,
};

const errorDe = (datos: unknown) => {
  try {
    validarEventos(datos);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

test("el archivo real de eventos es válido", () => {
  const ruta = join(import.meta.dirname, "..", "..", "datos", "eventos.json");
  const eventos = validarEventos(JSON.parse(readFileSync(ruta, "utf8")));
  assert.ok(eventos.length >= 2);
});

test("un evento correcto pasa tal cual", () => {
  assert.deepEqual(validarEventos([valido]), [valido]);
});

test("fecha con formato malo o que no existe", () => {
  assert.match(errorDe([{ ...valido, fecha: "2026-10-7" }]), /`fecha` debe ser AAAA-MM-DD/);
  assert.match(errorDe([{ ...valido, fecha: "2026-02-30", hasta: null }]), /`fecha` debe ser AAAA-MM-DD/);
});

test("`hasta` anterior a `fecha`", () => {
  assert.match(errorDe([{ ...valido, hasta: "2026-10-16" }]), /`hasta` es anterior a `fecha`/);
});

test("sin fuentes, o con una fuente sin enlace https", () => {
  assert.match(errorDe([{ ...valido, fuentes: [] }]), /necesita al menos una fuente/);
  assert.match(
    errorDe([{ ...valido, fuentes: [{ nombre: "X", url: "http://inseguro.org" }] }]),
    /fuente 1: `url` debe empezar con https:\/\//,
  );
});

test("ids repetidos", () => {
  assert.match(errorDe([valido, valido]), /evento 2 \(«2026-10-frente-frio-2»\): `id` repetido/);
});

test("reúne todos los errores en un solo mensaje", () => {
  const mensaje = errorDe([{ ...valido, alcance: "pais", descripcion: "" }]);
  assert.match(mensaje, /`alcance` debe ser/);
  assert.match(mensaje, /falta `descripcion`/);
});
