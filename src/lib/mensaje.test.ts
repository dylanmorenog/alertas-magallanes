import { test } from "node:test";
import assert from "node:assert/strict";
import { mensajeFacebook } from "./mensaje.ts";
import { evaluarPronostico } from "./resumen.ts";
import { NOMBRES_ESCENARIOS, pronosticoDeEjemplo } from "./ejemplos.ts";
import type { PronosticoDia } from "./open-meteo.ts";
import { CONSEJO_NO_CRUCES, CONSEJOS_MENSAJE, MENSAJE } from "../config/reglas.ts";

const hoy = "2026-11-06"; // viernes
const generadoEn = new Date("2026-11-07T01:20:00Z"); // viernes 6, 7:20 p.m. en México
const URL = "https://alertas.example";
const FECHAS = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];

// Cinco días tranquilos; `cambios[i]` modifica el día i (0 = hoy, 3 y 4 = pueden cambiar).
function mensaje(cambios: Record<number, Partial<PronosticoDia>> = {}, url: string | null = URL) {
  const dias = FECHAS.map((fecha, i) => ({
    fecha,
    lluviaMm: 0,
    lluvia3dMm: 0,
    vientoMaxKmh: 10,
    rachasMaxKmh: 20,
    olasMaxM: 0.5,
    ...cambios[i],
  }));
  return mensajeFacebook({ dias: evaluarPronostico(dias, hoy), hoy, generadoEn, url });
}

function deEscenario(escenario: (typeof NOMBRES_ESCENARIOS)[number]) {
  const dias = evaluarPronostico(pronosticoDeEjemplo(escenario, hoy), hoy);
  return mensajeFacebook({ dias, hoy, generadoEn, url: URL });
}

const sinDatos: Partial<PronosticoDia> = { lluviaMm: null, lluvia3dMm: null, rachasMaxKmh: null, olasMaxM: null };
const TODO_ROJO: Partial<PronosticoDia> = { lluviaMm: 150, lluvia3dMm: 300, rachasMaxKmh: 90, olasMaxM: 4 };

// El caso más largo posible: los 5 días en rojo por todo y con un dato faltante.
const peorCaso = () => mensaje({ 0: TODO_ROJO, 1: TODO_ROJO, 2: TODO_ROJO, 3: TODO_ROJO, 4: { ...TODO_ROJO, olasMaxM: null } });

// Todos los mensajes que se pueden generar en las pruebas.
const todos = () =>
  [...NOMBRES_ESCENARIOS.map(deEscenario), peorCaso(), mensaje({ 1: { rachasMaxKmh: 55 } }), mensaje({ 2: { olasMaxM: 2 } })].filter(
    (t): t is string => t !== null,
  );

test("sin alerta no hay mensaje: no se publica", () => {
  assert.equal(mensaje(), null);
  assert.equal(mensaje({ 2: { olasMaxM: null } }), null); // verde con datos faltantes
  assert.equal(mensaje({ 0: sinDatos, 1: sinDatos, 2: sinDatos, 3: sinDatos, 4: sinDatos }), null);
});

// Mensaje completo del escenario rojo: es el formato aprobado y sirve de ejemplo.
test("mensaje completo del escenario rojo", () => {
  assert.equal(
    deEscenario("rojo"),
    [
      "🔴 SÍ, VIENE MAL TIEMPO FUERTE a Magallanes",
      "Lo peor: mañana sábado 7. Lluvia muy fuerte, viento muy fuerte y mar muy picado; se pueden inundar calles y casas.",
      "",
      "🟡 Hoy viernes 6: lluvia fuerte; se pueden inundar calles.",
      "🔴 Mañana sábado 7: lluvia muy fuerte, viento muy fuerte y mar muy picado; se pueden inundar calles y casas.",
      "🔴 Domingo 8: viento fuerte; se pueden inundar calles y casas.",
      "🟡 Lunes 9 (puede cambiar): se pueden inundar calles.",
      "",
      "Qué hacer:",
      "• No cruces calles ni arroyos con corriente, aunque parezcan poco profundos.",
      "• Asegura techos, láminas y objetos sueltos que el viento pueda levantar.",
      "• Sube del piso documentos, medicinas y aparatos.",
      "• Carga celulares y baterías.",
      "",
      "Emergencias: 911",
      "Más información: https://alertas.example",
      "Pronóstico de las 7:20 p.m. del viernes 6 de noviembre. Es informativo: no sustituye los avisos de Protección Civil.",
      "Datos: Open-Meteo.com",
    ].join("\n"),
  );
});

// Lenguaje sencillo: ni unidades ni palabras técnicas. Los números se quedan en la página.
test("sin números con unidades ni palabras técnicas", () => {
  const prohibidas = /umbral|\bmm\b|km\/h|acumulada|rachas|lluvia de 3 días|precaución desde|peligro desde/i;
  const conUnidad = /\d+([.,]\d+)?\s?(mm|km\/h|m)\b/;
  for (const texto of todos()) {
    assert.doesNotMatch(texto, prohibidas);
    assert.doesNotMatch(texto, conUnidad);
  }
});

// Límite de largo, medido en el peor caso: que el mensaje no pueda crecer sin notarlo.
// Las dos primeras líneas son lo que se ve antes de "Ver más": deben bastar solas.
test("largo limitado, también en el peor caso", () => {
  for (const texto of todos()) {
    const lineas = texto.split("\n");
    assert.ok(texto.length <= 1250, `${texto.length} caracteres:\n${texto}`);
    assert.ok(lineas.length <= 20, `${lineas.length} líneas`);
    assert.ok(lineas[0].length + lineas[1].length <= 200, "las dos primeras líneas son demasiado largas");
  }
});

test("solo lista los días con alerta, no los tranquilos", () => {
  for (const texto of todos()) assert.ok(!texto.includes("🟢"));
  const lineasDeDias = (mensaje({ 1: { rachasMaxKmh: 55 } }) ?? "").split("\n").filter((l) => /^\p{Extended_Pictographic}/u.test(l));
  assert.deepEqual(lineasDeDias, [
    "🟡 SÍ, VIENE MAL TIEMPO a Magallanes",
    "🟡 Mañana sábado 7: viento fuerte.",
  ]);
});

test("como mucho 4 consejos; con lluvia, «No cruces…» siempre va primero", () => {
  const consejos = (texto: string) => texto.split("\n").filter((l) => l.startsWith("• ")).map((l) => l.slice(2));
  for (const texto of todos()) assert.ok(consejos(texto).length <= CONSEJOS_MENSAJE.maximo);

  for (const conLluvia of [{ lluviaMm: 60 }, { lluvia3dMm: 150 }, { lluviaMm: 60, rachasMaxKmh: 75 }]) {
    assert.equal(consejos(mensaje({ 1: conLluvia }) ?? "")[0], CONSEJO_NO_CRUCES);
  }
  // Solo viento: no habla de calles con corriente.
  assert.deepEqual(consejos(mensaje({ 1: { rachasMaxKmh: 75 } }) ?? ""), [
    "Asegura techos, láminas y objetos sueltos que el viento pueda levantar.",
    "Aléjate de árboles, postes y cables.",
    "Ten agua potable, comida que no se eche a perder, linterna y pilas.",
    "Carga celulares y baterías.",
  ]);
});

test("alerta solo en los días que pueden cambiar: «Podría venir…»", () => {
  const lineas = (deEscenario("posible") ?? "").split("\n");
  assert.equal(lineas[0], "🔴 POSIBLE MAL TIEMPO FUERTE a Magallanes");
  // Las condiciones van siempre en el mismo orden: lluvia, viento, mar.
  assert.equal(lineas[1], "Podría venir el lunes 9 (puede cambiar). Lluvia fuerte y viento muy fuerte; se pueden inundar calles.");
});

test("lo peor en un día que puede cambiar se marca así", () => {
  // Amarillo mañana (confiable), rojo el lunes 9 (puede cambiar).
  const lineas = (mensaje({ 1: { rachasMaxKmh: 55 }, 3: { rachasMaxKmh: 80 } }) ?? "").split("\n");
  assert.equal(lineas[1], "Lo peor: el lunes 9 (puede cambiar). Viento muy fuerte.");
});

test("la hora va en 12 horas, con «de la» para la 1", () => {
  const unaDeLaTarde = new Date("2026-11-06T19:05:00Z"); // 1:05 p.m. en México
  const dias = evaluarPronostico(pronosticoDeEjemplo("rojo", hoy), hoy);
  const texto = mensajeFacebook({ dias, hoy, generadoEn: unaDeLaTarde, url: URL }) ?? "";
  assert.match(texto, /^Pronóstico de la 1:05 p\.m\. del viernes 6 de noviembre\./m);
});

test("datos faltantes con alerta: se avisa después de las dos primeras líneas", () => {
  const lineas = (mensaje({ 0: { rachasMaxKmh: 75 }, 1: { olasMaxM: null } }) ?? "").split("\n");
  assert.equal(lineas[2], "Faltan datos de olas para mañana.");
});

test("sin enlace público, el mensaje lo dice de forma visible", () => {
  const texto = mensaje({ 0: { rachasMaxKmh: 75 } }, null) ?? "";
  assert.match(texto, new RegExp(`^${MENSAJE.enlace} \\[ENLACE PENDIENTE: no publicar sin el enlace\\]$`, "m"));
});

test("cada emoji va seguido de una palabra, nunca solo", () => {
  for (const texto of todos()) {
    const conEmoji = texto.split("\n").filter((linea) => /^\p{Extended_Pictographic}/u.test(linea));
    for (const linea of conEmoji) assert.match(linea, /^\p{Extended_Pictographic}\s+\p{L}/u);
  }
});
