import { test } from "node:test";
import assert from "node:assert/strict";
import { mensajeFacebook } from "./mensaje.ts";
import { evaluarPronostico } from "./resumen.ts";
import type { PronosticoDia } from "./open-meteo.ts";
import { QUE_HACER } from "../config/reglas.ts";

const hoy = "2026-11-05"; // jueves
const generadoEn = new Date("2026-11-05T20:30:00Z"); // 14:30 en México
const FECHAS = ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"];

// Cinco días tranquilos; `cambios[i]` modifica el día i (0 = hoy, 3 y 4 = pueden cambiar).
function mensaje(cambios: Record<number, Partial<PronosticoDia>> = {}, url: string | null = "https://alertas.example") {
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

const sinDatos: Partial<PronosticoDia> = { lluviaMm: null, lluvia3dMm: null, rachasMaxKmh: null, olasMaxM: null };

test("sin alerta no hay mensaje: no se publica", () => {
  assert.equal(mensaje(), null);
});

test("verde con datos faltantes tampoco se publica", () => {
  assert.equal(mensaje({ 2: { olasMaxM: null } }), null);
});

test("sin datos tampoco se publica", () => {
  assert.equal(mensaje({ 0: sinDatos, 1: sinDatos, 2: sinDatos, 3: sinDatos, 4: sinDatos }), null);
});

// Mensaje completo: sirve también como ejemplo de cómo se ve.
test("mensaje completo con alerta roja que podría seguir", () => {
  const texto = mensaje({ 1: { lluviaMm: 60 }, 2: { lluviaMm: 120, lluvia3dMm: 210 }, 3: { lluvia3dMm: 150 } });
  assert.equal(
    texto,
    [
      "🔴 SÍ, VIENE MAL TIEMPO FUERTE a Magallanes",
      "Lluvia intensa y mucha lluvia acumulada desde mañana; lo más fuerte el sábado 7. " +
        "Podría seguir el domingo 8 (puede cambiar).",
      "Pronóstico del jueves 5 de noviembre, 14:30.",
      "",
      "Día por día:",
      "🟢 Hoy: sin alertas",
      "🟡 Mañana: precaución. Lluvia muy fuerte (60 mm)",
      "🔴 Sábado 7: peligro. Lluvia intensa (120 mm); lluvia de 3 días (210 mm, umbral en prueba)",
      "🟡 Domingo 8: precaución (puede cambiar). Lluvia de 3 días (150 mm, umbral en prueba)",
      "🟢 Lunes 9: sin alertas (puede cambiar)",
      "",
      "Qué hacer:",
      "• Limpia desagües y canaletas.",
      "• Sube del piso documentos, medicinas y aparatos; guarda los documentos en bolsas cerradas.",
      "• No cruces calles ni arroyos con corriente, aunque parezcan poco profundos.",
      "• Carga celulares y baterías.",
      "• Ten a la mano los números de emergencia.",
      "",
      "Emergencias: 911 · Marina: 800 627 4621 (800 MARINA1) · Capitanía de Puerto, radio: VHF canal 16, las 24 horas",
      "Pronóstico actualizado: https://alertas.example",
      "Informativo; no sustituye los avisos de Protección Civil ni de Capitanía de Puerto.",
      "Datos: Open-Meteo.com",
    ].join("\n"),
  );
});

test("sin enlace público, el mensaje lo dice de forma visible", () => {
  const texto = mensaje({ 0: { rachasMaxKmh: 75 } }, null) ?? "";
  assert.match(texto, /^Pronóstico actualizado: \[ENLACE PENDIENTE: no publicar sin el enlace\]$/m);
});

test("alerta solo en los días lejanos sí se publica, como posible", () => {
  const texto = mensaje({ 4: { lluviaMm: 160 } }) ?? "";
  assert.equal(texto.split("\n")[0], "🔴 POSIBLE MAL TIEMPO FUERTE a Magallanes");
  assert.equal(texto.split("\n")[1], "Lluvia torrencial el lunes 9 (puede cambiar).");
});

test("los datos faltantes aparecen antes de la fecha y del día por día", () => {
  const lineas = (mensaje({ 0: { rachasMaxKmh: 75 }, 1: { olasMaxM: null } }) ?? "").split("\n");
  assert.equal(lineas[2], "Faltan datos de olas para mañana.");
  assert.match(lineas[3], /^Pronóstico del /);
  assert.ok(lineas.includes("🟢 Mañana: sin alertas. Faltan datos de olas."));
});

test("solo viento → consejos de viento, no de lluvia", () => {
  const texto = mensaje({ 1: { rachasMaxKmh: 55 } }) ?? "";
  assert.ok(texto.includes(`• ${QUE_HACER.viento[0]}`));
  assert.ok(!texto.includes(`• ${QUE_HACER.lluvia[0]}`));
});

test("con lluvia y viento, el mensaje lleva solo los consejos principales", () => {
  const lineas = (mensaje({ 0: { lluviaMm: 60 }, 1: { rachasMaxKmh: 55 } }) ?? "").split("\n");
  const consejos = lineas.filter((linea) => linea.startsWith("• "));
  assert.equal(consejos.length, QUE_HACER.maximo);
  assert.ok(!lineas.includes(`• ${QUE_HACER.generales[0]}`)); // plegado en la página
});

test("cada emoji va seguido de una palabra, nunca solo", () => {
  const texto = mensaje({ 0: sinDatos, 1: { rachasMaxKmh: 55 }, 2: { lluviaMm: 120 } }) ?? "";
  const conEmoji = texto.split("\n").filter((linea) => /^\p{Extended_Pictographic}/u.test(linea));
  assert.ok(conEmoji.length >= 6);
  for (const linea of conEmoji) assert.match(linea, /^\p{Extended_Pictographic}\s+\p{L}/u);
});
