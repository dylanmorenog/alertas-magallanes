import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarPronostico, queHacer, respuestaGeneral } from "./resumen.ts";
import type { PronosticoDia } from "./open-meteo.ts";
import type { Reglas } from "./semaforo.ts";
import { QUE_HACER, UMBRALES } from "../config/reglas.ts";

const hoy = "2026-11-05"; // jueves
const FECHAS = ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"];

// Cinco días tranquilos; `cambios[i]` modifica el día i (0 = hoy, 3 y 4 = pueden cambiar).
function semana(cambios: Record<number, Partial<PronosticoDia>> = {}): PronosticoDia[] {
  return FECHAS.map((fecha, i) => ({
    fecha,
    lluviaMm: 0,
    lluvia3dMm: 0,
    vientoMaxKmh: 10,
    rachasMaxKmh: 20,
    olasMaxM: 0.5,
    ...cambios[i],
  }));
}

function responder(cambios: Record<number, Partial<PronosticoDia>> = {}, reglas: Reglas = UMBRALES) {
  return respuestaGeneral(evaluarPronostico(semana(cambios), hoy, reglas), hoy, reglas);
}

const sinDatos: Partial<PronosticoDia> = { lluviaMm: null, lluvia3dMm: null, rachasMaxKmh: null, olasMaxM: null };

test("todo verde y completo → NO SE ESPERA MAL TIEMPO", () => {
  assert.deepEqual(responder(), {
    tono: "verde",
    titulo: "NO SE ESPERA MAL TIEMPO",
    detalle: "Sin alertas de lluvia, viento ni olas en los próximos 5 días.",
    nota: null,
  });
});

test("con las olas desactivadas, la frase ya no las menciona", () => {
  const sinOlas: Reglas = { ...UMBRALES, olas: { ...UMBRALES.olas, mueveElColor: false } };
  assert.equal(responder({}, sinOlas).detalle, "Sin alertas de lluvia ni viento en los próximos 5 días.");
});

test("verde con faltantes → PROBABLEMENTE NO, agrupando por días", () => {
  const r = responder({ 2: { olasMaxM: null }, 3: { olasMaxM: null }, 4: sinDatos });
  assert.equal(r.titulo, "PROBABLEMENTE NO");
  assert.equal(r.detalle, "Faltan datos de olas para el sábado 7 y el domingo 8. No hay datos para el lunes 9.");
});

test("todos los días sin datos → NO SABEMOS en gris", () => {
  const r = responder({ 0: sinDatos, 1: sinDatos, 2: sinDatos, 3: sinDatos, 4: sinDatos });
  assert.equal(r.tono, "gris");
  assert.equal(r.titulo, "NO SABEMOS");
});

test("rojo en los días confiables → SÍ, VIENE MAL TIEMPO FUERTE, sin 'posible'", () => {
  const r = responder({ 1: { rachasMaxKmh: 75 } });
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO FUERTE");
  assert.equal(r.detalle, "Viento fuerte mañana.");
});

test("amarillo en los días confiables → SÍ, VIENE MAL TIEMPO", () => {
  const r = responder({ 0: { lluviaMm: 60 } });
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO");
  assert.equal(r.detalle, "Lluvia muy fuerte hoy.");
});

test("dice desde cuándo y cuándo es lo más fuerte", () => {
  const r = responder({ 1: { lluviaMm: 60 }, 2: { lluviaMm: 120, lluvia3dMm: 190 } });
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO FUERTE");
  assert.equal(r.detalle, "Lluvia intensa y mucha lluvia acumulada desde mañana; lo más fuerte el sábado 7.");
});

test("lo peor solo en el día 5 → POSIBLE y (puede cambiar)", () => {
  const r = responder({ 4: { lluviaMm: 160 } });
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "POSIBLE MAL TIEMPO FUERTE");
  assert.equal(r.detalle, "Lluvia torrencial el lunes 9 (puede cambiar).");
});

test("amarillo seguro y rojo posible: el título lo pone lo seguro, lo peor se menciona como posible", () => {
  const r = responder({ 1: { rachasMaxKmh: 55 }, 4: { lluviaMm: 160 } });
  assert.equal(r.tono, "amarillo");
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO");
  assert.equal(r.detalle, "Viento fuerte mañana. Posible lluvia torrencial el lunes 9 (puede cambiar).");
});

test("alerta que continúa al día siguiente en los días lejanos → podría seguir", () => {
  const r = responder({ 2: { lluviaMm: 120 }, 3: { lluvia3dMm: 150 } });
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO FUERTE");
  assert.equal(r.detalle, "Lluvia intensa el sábado 7. Podría seguir el domingo 8 (puede cambiar).");
});

test("alerta lejana con un día tranquilo de por medio → podría volver, no seguir", () => {
  const r = responder({ 0: { rachasMaxKmh: 75 }, 3: { lluviaMm: 60 } });
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO FUERTE");
  assert.equal(r.detalle, "Viento fuerte hoy. Podría volver el domingo 8 (puede cambiar).");
});

test("podría seguir varios días", () => {
  const r = responder({ 2: { rachasMaxKmh: 55 }, 3: { rachasMaxKmh: 55 }, 4: { rachasMaxKmh: 52 } });
  assert.equal(r.detalle, "Viento fuerte el sábado 7. Podría seguir el domingo 8 y el lunes 9 (puede cambiar).");
});

test("lo lejano peor incluye todos sus días con alerta, desde el primero", () => {
  const r = responder({ 1: { rachasMaxKmh: 55 }, 3: { rachasMaxKmh: 55 }, 4: { lluviaMm: 160 } });
  assert.equal(r.titulo, "SÍ, VIENE MAL TIEMPO");
  assert.equal(
    r.detalle,
    "Viento fuerte mañana. Posible lluvia torrencial y viento fuerte desde el domingo 8; " +
      "lo más fuerte el lunes 9 (puede cambiar).",
  );
});

test("con alerta, los datos faltantes van en la nota", () => {
  const r = responder({ 0: { rachasMaxKmh: 75 }, 1: { olasMaxM: null } });
  assert.equal(r.nota, "Faltan datos de olas para mañana.");
});

test("qué hacer: sin alertas no hay consejos", () => {
  assert.deepEqual(queHacer(evaluarPronostico(semana(), hoy)), []);
});

test("qué hacer: lluvia → consejos de lluvia y los de siempre", () => {
  assert.deepEqual(queHacer(evaluarPronostico(semana({ 2: { lluvia3dMm: 150 } }), hoy)), [
    ...QUE_HACER.lluvia,
    ...QUE_HACER.siempre,
  ]);
});

test("qué hacer: lluvia y viento → los dos grupos, sin repetir los de siempre", () => {
  assert.deepEqual(queHacer(evaluarPronostico(semana({ 0: { lluviaMm: 60 }, 1: { rachasMaxKmh: 55 } }), hoy)), [
    ...QUE_HACER.lluvia,
    ...QUE_HACER.viento,
    ...QUE_HACER.siempre,
  ]);
});
