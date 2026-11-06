import { test } from "node:test";
import assert from "node:assert/strict";
import {
  delDia,
  describirAntiguedad,
  elDia,
  esDeUnDiaAnterior,
  fechaEnMexico,
  fechaLarga,
  nombreDelDia,
  puedeCambiar,
  sumarDias,
} from "./tiempo.ts";

test("fechaEnMexico: a las 03:00 UTC del día 6, en México todavía es el día 5", () => {
  assert.equal(fechaEnMexico(new Date("2026-11-06T03:00:00Z")), "2026-11-05");
  assert.equal(fechaEnMexico(new Date("2026-11-06T06:00:00Z")), "2026-11-06");
});

test("sumarDias cruza fin de mes y de año", () => {
  assert.equal(sumarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
});

test("nombreDelDia: Hoy, Mañana y luego el día de la semana", () => {
  assert.equal(nombreDelDia("2026-11-05", "2026-11-05"), "Hoy");
  assert.equal(nombreDelDia("2026-11-06", "2026-11-05"), "Mañana");
  assert.equal(nombreDelDia("2026-11-07", "2026-11-05"), "Sábado 7");
});

test("fechaLarga no se corre de día ni lleva coma", () => {
  assert.equal(fechaLarga("2026-11-05"), "jueves 5 de noviembre");
});

test("esDeUnDiaAnterior: la misma noche en México todavía es el mismo día", () => {
  // 23:59 del día 5 en México = 05:59 UTC del día 6
  assert.equal(esDeUnDiaAnterior("2026-11-05", new Date("2026-11-06T05:59:00Z")), false);
  // 00:01 del día 6 en México
  assert.equal(esDeUnDiaAnterior("2026-11-05", new Date("2026-11-06T06:01:00Z")), true);
});

test("esDeUnDiaAnterior: con el reloj del celular atrasado no avisa", () => {
  assert.equal(esDeUnDiaAnterior("2026-11-05", new Date("2026-11-04T18:00:00Z")), false);
});

const generado = new Date("2026-11-05T12:00:00Z");
const despues = (minutos: number) => new Date(generado.getTime() + minutos * 60_000);

test("antigüedad reciente no es vieja", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(0)), { texto: "hace un momento", vieja: false });
  assert.deepEqual(describirAntiguedad(generado, despues(5)), { texto: "hace 5 minutos", vieja: false });
  // Lo normal con el monitor: hasta ~30 minutos.
  assert.deepEqual(describirAntiguedad(generado, despues(35)), { texto: "hace 35 minutos", vieja: false });
  assert.deepEqual(describirAntiguedad(generado, despues(59)), { texto: "hace 59 minutos", vieja: false });
});

test("a partir de 1 hora el pronóstico es viejo", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(60)), { texto: "hace 1 hora", vieja: true });
  assert.deepEqual(describirAntiguedad(generado, despues(180)), { texto: "hace 3 horas", vieja: true });
  assert.deepEqual(describirAntiguedad(generado, despues(26 * 60)), { texto: "hace 26 horas", vieja: true });
  assert.deepEqual(describirAntiguedad(generado, despues(3 * 24 * 60)), { texto: "hace 3 días", vieja: true });
});

test("si el reloj del celular va atrasado, no muestra tiempo negativo", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(-10)), { texto: "hace un momento", vieja: false });
});

test("puedeCambiar: hoy y los 2 días siguientes no; los días 4 y 5 sí", () => {
  const hoy = "2026-11-29";
  assert.deepEqual(
    ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"].map((fecha) => puedeCambiar(fecha, hoy)),
    [false, false, false, true, true],
  );
});

test("elDia y delDia arman frases con el día", () => {
  const hoy = "2026-11-05";
  assert.deepEqual(
    ["2026-11-05", "2026-11-06", "2026-11-07"].map((fecha) => [elDia(fecha, hoy), delDia(fecha, hoy)]),
    [
      ["hoy", "de hoy"],
      ["mañana", "de mañana"],
      ["el sábado 7", "del sábado 7"],
    ],
  );
});
