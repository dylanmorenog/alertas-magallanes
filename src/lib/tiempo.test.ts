import { test } from "node:test";
import assert from "node:assert/strict";
import { describirAntiguedad, fechaEnMexico, fechaLarga, nombreDelDia, sumarDias } from "./tiempo.ts";

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

const generado = new Date("2026-11-05T12:00:00Z");
const despues = (minutos: number) => new Date(generado.getTime() + minutos * 60_000);

test("antigüedad reciente no es vieja", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(0)), { texto: "hace un momento", vieja: false });
  assert.deepEqual(describirAntiguedad(generado, despues(5)), { texto: "hace 5 minutos", vieja: false });
  assert.deepEqual(describirAntiguedad(generado, despues(179)), { texto: "hace 2 horas", vieja: false });
});

test("a partir de 3 horas el pronóstico es viejo", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(180)), { texto: "hace 3 horas", vieja: true });
  assert.deepEqual(describirAntiguedad(generado, despues(26 * 60)), { texto: "hace 26 horas", vieja: true });
  assert.deepEqual(describirAntiguedad(generado, despues(3 * 24 * 60)), { texto: "hace 3 días", vieja: true });
});

test("si el reloj del celular va atrasado, no muestra tiempo negativo", () => {
  assert.deepEqual(describirAntiguedad(generado, despues(-10)), { texto: "hace un momento", vieja: false });
});
