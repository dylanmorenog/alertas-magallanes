import { test } from "node:test";
import assert from "node:assert/strict";
import { escenarioDeEjemplo, NOMBRES_ESCENARIOS, pronosticoDeEjemplo, type Escenario } from "./ejemplos.ts";
import { evaluarPronostico, respuestaGeneral } from "./resumen.ts";
import { RESPUESTA_GENERAL } from "../config/reglas.ts";

const hoy = "2026-11-06";

// Lo más importante de este archivo: los datos de ejemplo nunca se activan fuera de desarrollo.
for (const nodeEnv of ["production", "test", undefined, "", "Production", "dev"]) {
  test(`con NODE_ENV=${JSON.stringify(nodeEnv)} no se activa ningún escenario`, () => {
    for (const escenario of [...NOMBRES_ESCENARIOS, "no-existe"]) {
      assert.equal(escenarioDeEjemplo({ nodeEnv, escenario }), null);
    }
  });
}

test("en desarrollo, sin la variable, se usa el pronóstico real", () => {
  assert.equal(escenarioDeEjemplo({ nodeEnv: "development", escenario: undefined }), null);
  assert.equal(escenarioDeEjemplo({ nodeEnv: "development", escenario: "" }), null);
});

test("en desarrollo, un escenario válido se activa", () => {
  assert.equal(escenarioDeEjemplo({ nodeEnv: "development", escenario: "rojo" }), "rojo");
});

test("en desarrollo, un escenario que no existe falla con las opciones válidas", () => {
  assert.throws(
    () => escenarioDeEjemplo({ nodeEnv: "development", escenario: "naranja" }),
    /"naranja" no existe\. Opciones: verde, amarillo/,
  );
});

test("hoy y los 4 días siguientes, empezando en la fecha de hoy", () => {
  const dias = pronosticoDeEjemplo("verde", hoy);
  assert.deepEqual(
    dias.map((d) => d.fecha),
    ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
  );
});

test("la lluvia de 3 días incluye la de los 2 días anteriores", () => {
  // Escenario rojo: 20 y 40 mm antes de hoy, 60 mm hoy.
  assert.equal(pronosticoDeEjemplo("rojo", hoy)[0].lluvia3dMm, 120);
});

// Cada escenario debe mostrar lo que promete su nombre; si alguien cambia los umbrales,
// esta prueba avisa que hay que ajustar los ejemplos.
const ESPERADO: Record<Escenario, string> = {
  verde: RESPUESTA_GENERAL.verde,
  amarillo: RESPUESTA_GENERAL.amarillo,
  rojo: RESPUESTA_GENERAL.rojo,
  posible: RESPUESTA_GENERAL.rojoPosible,
  incompleto: RESPUESTA_GENERAL.verdeIncompleto,
  sindatos: RESPUESTA_GENERAL.sinDatos,
};

for (const escenario of NOMBRES_ESCENARIOS) {
  test(`el escenario "${escenario}" responde ${ESPERADO[escenario]}`, () => {
    const dias = evaluarPronostico(pronosticoDeEjemplo(escenario, hoy), hoy);
    assert.equal(respuestaGeneral(dias, hoy).titulo, ESPERADO[escenario]);
  });
}
