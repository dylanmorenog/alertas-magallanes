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

// Atajos para leer las pruebas de "qué hacer" (con la configuración actual: máximo 5).
const [desagues, documentos, noCruces, adondeIr] = QUE_HACER.lluvia;
const [techos, arboles] = QUE_HACER.viento;
const [agua] = QUE_HACER.generales;
const [celulares, numeros] = QUE_HACER.siempre;

function consejos(cambios: Record<number, Partial<PronosticoDia>>) {
  return queHacer(evaluarPronostico(semana(cambios), hoy));
}

test("qué hacer: sin alertas no hay consejos", () => {
  assert.deepEqual(consejos({}), { principales: [], mas: [] });
});

test("qué hacer: solo lluvia → 3 de lluvia y los de siempre; el resto, plegado", () => {
  assert.deepEqual(consejos({ 2: { lluvia3dMm: 150 } }), {
    principales: [desagues, documentos, noCruces, celulares, numeros],
    mas: [adondeIr, agua],
  });
});

test("qué hacer: lluvia y viento → los dos tipos tienen consejos visibles", () => {
  assert.deepEqual(consejos({ 0: { lluviaMm: 60 }, 1: { rachasMaxKmh: 55 } }), {
    principales: [desagues, documentos, techos, celulares, numeros],
    mas: [noCruces, adondeIr, arboles, agua],
  });
});

test("qué hacer: solo viento → los de viento y, en el lugar que sobra, los generales", () => {
  assert.deepEqual(consejos({ 1: { rachasMaxKmh: 55 } }), {
    principales: [techos, arboles, agua, celulares, numeros],
    mas: [],
  });
});

test("qué hacer: solo olas (sin consejos propios) → generales y los de siempre", () => {
  assert.deepEqual(consejos({ 1: { olasMaxM: 2 } }), { principales: [agua, celulares, numeros], mas: [] });
});

// Propiedades que deben cumplirse con cualquier combinación de alertas y cualquier tope:
// si alguien cambia el máximo o agrega consejos, estas pruebas siguen cuidando las reglas.
test("qué hacer: con cualquier alerta y cualquier tope, la lista visible respeta las reglas", () => {
  const alertas: Record<string, Partial<PronosticoDia>> = {
    lluvia: { lluviaMm: 60 },
    lluvia3d: { lluvia3dMm: 150 },
    viento: { rachasMaxKmh: 55 },
    olas: { olasMaxM: 2 },
  };
  const nombres = Object.keys(alertas);
  // Todas las combinaciones no vacías de alertas, cada una en un día distinto.
  for (let mascara = 1; mascara < 1 << nombres.length; mascara++) {
    const elegidas = nombres.filter((_, i) => mascara & (1 << i));
    const cambios = Object.fromEntries(elegidas.map((nombre, i) => [i, alertas[nombre]]));
    const dias = evaluarPronostico(semana(cambios), hoy);

    for (let maximo = 2; maximo <= 10; maximo++) {
      const { principales, mas } = queHacer(dias, { ...QUE_HACER, maximo });
      const caso = `${elegidas.join("+")}, máximo ${maximo}`;
      assert.ok(principales.length <= maximo, `${caso}: ${principales.length} consejos visibles`);
      for (const fijo of QUE_HACER.siempre) assert.ok(principales.includes(fijo), `${caso}: falta "${fijo}"`);
      const todos = [...principales, ...mas];
      assert.equal(new Set(todos).size, todos.length, `${caso}: hay consejos repetidos`);
      // Nunca un consejo de un tipo de alerta que no está.
      const hayLluvia = elegidas.includes("lluvia") || elegidas.includes("lluvia3d");
      if (!hayLluvia) assert.ok(!todos.some((c) => QUE_HACER.lluvia.includes(c)), `${caso}: consejo de lluvia`);
      if (!elegidas.includes("viento")) assert.ok(!todos.some((c) => QUE_HACER.viento.includes(c)), `${caso}: consejo de viento`);
    }
  }
});
