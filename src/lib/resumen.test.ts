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

test("todo verde y completo → No, no se espera mal tiempo", () => {
  assert.deepEqual(responder(), {
    tono: "verde",
    titulo: "No, no se espera mal tiempo",
    detalle: "Sin alertas de lluvia, viento ni olas en los próximos 5 días.",
    nota: null,
  });
});

test("con las olas desactivadas, la frase ya no las menciona", () => {
  const sinOlas: Reglas = { ...UMBRALES, olas: { ...UMBRALES.olas, mueveElColor: false } };
  assert.equal(responder({}, sinOlas).detalle, "Sin alertas de lluvia ni viento en los próximos 5 días.");
});

test("verde con faltantes → encabezado neutral, agrupando por días", () => {
  const r = responder({ 2: { olasMaxM: null }, 3: { olasMaxM: null }, 4: sinDatos });
  assert.equal(r.titulo, "Sin alertas con los datos disponibles");
  assert.equal(r.detalle, "Faltan datos de olas para el sábado 7 y el domingo 8. No hay datos para el lunes 9.");
});

test("todos los días sin datos → No sabemos en gris", () => {
  const r = responder({ 0: sinDatos, 1: sinDatos, 2: sinDatos, 3: sinDatos, 4: sinDatos });
  assert.equal(r.tono, "gris");
  assert.equal(r.titulo, "No sabemos");
});

test("amarillo → Precaución, con un motivo corto y tranquilo", () => {
  // El ejemplo exacto con el que se pidió el cambio.
  assert.deepEqual(responder({ 0: { olasMaxM: 1.5 } }), {
    tono: "amarillo",
    titulo: "Precaución",
    detalle: "Olas de hasta 1.5 m en el mar hoy.",
    nota: null,
  });
  assert.equal(responder({ 0: { lluviaMm: 60 } }).detalle, "Lluvia de hasta 60 mm hoy.");
});

test("rojo en los días confiables → Sí, viene mal tiempo, con un motivo corto", () => {
  const r = responder({ 1: { rachasMaxKmh: 75 } });
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "Sí, viene mal tiempo");
  assert.equal(r.detalle, "Viento muy fuerte mañana.");
});

test("rojo: nombra solo lo que está en rojo, sin números", () => {
  // Mañana lluvia amarilla; el sábado lluvia roja y lluvia de 3 días amarilla.
  const r = responder({ 1: { lluviaMm: 60 }, 2: { lluviaMm: 120, lluvia3dMm: 190 } });
  assert.equal(r.titulo, "Sí, viene mal tiempo");
  assert.equal(r.detalle, "Lluvia muy fuerte el sábado 7.");
});

test("rojo en varios días: dice cuándo es lo peor (el día con más cosas en rojo)", () => {
  const r = responder({ 0: { lluviaMm: 120 }, 1: { lluviaMm: 120, rachasMaxKmh: 80, olasMaxM: 3 } });
  assert.equal(r.detalle, "Lluvia, viento y olas muy fuertes; lo peor, mañana.");
});

test("rojo solo por olas: concordancia en plural", () => {
  assert.equal(responder({ 1: { olasMaxM: 3 } }).detalle, "Olas muy fuertes mañana.");
});

test("varios días con el mismo nivel: se nombran todos, no solo el primero", () => {
  const r = responder({ 1: { lluviaMm: 65 }, 2: { rachasMaxKmh: 55 } });
  assert.equal(r.detalle, "Lluvia de hasta 65 mm y rachas de viento de hasta 55 km/h mañana y el sábado 7.");
});

test("rojo solo en el día 5 → Posible mal tiempo y (puede cambiar)", () => {
  const r = responder({ 4: { lluviaMm: 160 } });
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "Posible mal tiempo");
  assert.equal(r.detalle, "Lluvia muy fuerte el lunes 9 (puede cambiar).");
});

test("amarillo solo en los días que pueden cambiar → Precaución, con (puede cambiar)", () => {
  const r = responder({ 3: { olasMaxM: 1.6 } });
  assert.equal(r.titulo, "Precaución");
  assert.equal(r.detalle, "Olas de hasta 1.6 m en el mar el domingo 8 (puede cambiar).");
});

test("amarillo seguro y rojo posible: manda el nivel más alto, como posible", () => {
  const r = responder({ 1: { rachasMaxKmh: 55 }, 4: { lluviaMm: 160 } });
  assert.equal(r.tono, "rojo");
  assert.equal(r.titulo, "Posible mal tiempo");
  // Solo lo que está en rojo; el viento amarillo de mañana se ve en "Día por día".
  assert.equal(r.detalle, "Lluvia muy fuerte el lunes 9 (puede cambiar).");
});

test("amarillo que continúa al día siguiente en los días lejanos → podría seguir", () => {
  const r = responder({ 2: { lluviaMm: 60 }, 3: { lluvia3dMm: 150 } });
  assert.equal(r.titulo, "Precaución");
  assert.equal(r.detalle, "Lluvia de hasta 60 mm el sábado 7. Podría seguir el domingo 8 (puede cambiar).");
});

test("amarillo lejano con un día tranquilo de por medio → podría volver, no seguir", () => {
  const r = responder({ 0: { rachasMaxKmh: 55 }, 3: { lluviaMm: 60 } });
  assert.equal(r.titulo, "Precaución");
  assert.equal(r.detalle, "Rachas de viento de hasta 55 km/h hoy. Podría volver el domingo 8 (puede cambiar).");
});

test("podría seguir varios días", () => {
  const r = responder({ 2: { rachasMaxKmh: 55 }, 3: { rachasMaxKmh: 55 }, 4: { rachasMaxKmh: 52 } });
  assert.equal(r.titulo, "Precaución");
  assert.equal(
    r.detalle,
    "Rachas de viento de hasta 55 km/h el sábado 7. Podría seguir el domingo 8 y el lunes 9 (puede cambiar).",
  );
});

test("rojo con un día seguro y otro que puede cambiar: lo peor es el que tiene más en rojo", () => {
  const r = responder({ 1: { rachasMaxKmh: 80 }, 3: { lluviaMm: 120, rachasMaxKmh: 80 } });
  assert.equal(r.titulo, "Sí, viene mal tiempo");
  assert.equal(r.detalle, "Lluvia y viento muy fuertes; lo peor, el domingo 8 (puede cambiar).");
});

test("con alerta, los datos faltantes van en la nota", () => {
  const r = responder({ 0: { rachasMaxKmh: 75 }, 1: { olasMaxM: null } });
  assert.equal(r.nota, "Faltan datos de olas para mañana.");
});

// Propiedades que deben cumplirse en CUALQUIER semana, no solo en los ejemplos de arriba.
// Se prueban todas las combinaciones de una o dos alertas (cada una amarilla o roja, por
// cualquier variable) en cualquier día o par de días, más la semana tranquila: 681 semanas.
const ALERTAS: Partial<PronosticoDia>[] = [
  { lluviaMm: 60 }, { lluvia3dMm: 150 }, { rachasMaxKmh: 55 }, { olasMaxM: 1.8 }, // amarillas
  { lluviaMm: 120 }, { lluvia3dMm: 250 }, { rachasMaxKmh: 80 }, { olasMaxM: 3 }, // rojas
];
const semanas: Record<number, Partial<PronosticoDia>>[] = [{}];
for (let i = 0; i < 5; i++) {
  for (const a of ALERTAS) {
    semanas.push({ [i]: a });
    for (let j = i + 1; j < 5; j++) for (const b of ALERTAS) semanas.push({ [i]: a, [j]: b });
  }
}

test("en amarillo nunca se dice «mal tiempo»", () => {
  for (const cambios of semanas) {
    const r = responder(cambios);
    if (r.tono !== "amarillo") continue;
    const texto = `${r.titulo} ${r.detalle} ${r.nota ?? ""}`;
    assert.doesNotMatch(texto, /mal tiempo/i, JSON.stringify(cambios));
  }
});

test("el motivo del rojo es corto y sin números (el detalle va en «Día por día»)", () => {
  // Peor caso de largo: lluvia, viento y olas en rojo, lo peor en un día que puede cambiar.
  const peor = responder({ 3: { lluviaMm: 120, rachasMaxKmh: 80, olasMaxM: 3 }, 4: { lluviaMm: 120 } });
  assert.equal(peor.detalle, "Lluvia, viento y olas muy fuertes; lo peor, el domingo 8 (puede cambiar).");
  for (const cambios of semanas) {
    const r = responder(cambios);
    if (r.tono !== "rojo") continue;
    assert.doesNotMatch(r.detalle, /\d+\s?(mm|km\/h|m)\b/, JSON.stringify(cambios));
    assert.ok(r.detalle.length <= peor.detalle.length, `${r.detalle.length}: ${r.detalle}`);
  }
});

test("«Sí, viene mal tiempo» solo cuando hay rojo en hoy, mañana o pasado", () => {
  for (const cambios of semanas) {
    const dias = evaluarPronostico(semana(cambios), hoy);
    const rojoConfiable = dias.some((d) => d.evaluacion.nivel === "rojo" && !d.puedeCambiar);
    const rojoLejano = dias.some((d) => d.evaluacion.nivel === "rojo" && d.puedeCambiar);
    const { titulo } = respuestaGeneral(dias, hoy);
    assert.equal(titulo === "Sí, viene mal tiempo", rojoConfiable, JSON.stringify(cambios));
    assert.equal(titulo === "Posible mal tiempo", !rojoConfiable && rojoLejano, JSON.stringify(cambios));
  }
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
