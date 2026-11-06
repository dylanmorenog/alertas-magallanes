import { test } from "node:test";
import assert from "node:assert/strict";
import { alertasPorAno, analizarEvento, episodios, evaluarSerie, reglasSinOlas } from "./backtesting.ts";
import { juntarTramos, tramosPorAno, unirHistorico } from "./open-meteo-historico.ts";
import type { PronosticoDia } from "./open-meteo.ts";
import { sumarDias } from "./tiempo.ts";
import type { Evento } from "../config/eventos.ts";

// Serie de días tranquilos desde `inicio`; `cambios[i]` modifica el día i.
function serie(inicio: string, n: number, cambios: Record<number, Partial<PronosticoDia>> = {}): PronosticoDia[] {
  return Array.from({ length: n }, (_, i) => ({
    fecha: sumarDias(inicio, i),
    lluviaMm: 0,
    lluvia3dMm: 0,
    vientoMaxKmh: 10,
    rachasMaxKmh: 20,
    olasMaxM: 0.5,
    ...cambios[i],
  }));
}

const AMARILLO: Partial<PronosticoDia> = { rachasMaxKmh: 55 };
const ROJO: Partial<PronosticoDia> = { rachasMaxKmh: 75 };
const SIN_DATOS: Partial<PronosticoDia> = { lluviaMm: null, lluvia3dMm: null, rachasMaxKmh: null, olasMaxM: null };

const evento = (desde: string, hasta: string | null = null): Evento => ({
  id: "prueba",
  nombre: "Evento de prueba",
  desde,
  hasta,
  tipo: "inundacion",
  alcance: "magallanes",
  fuente: "prueba",
  url: "https://example.org",
  verificadoEl: "2026-11-06",
  notas: null,
});

test("días seguidos con alerta son un solo episodio, con el peor nivel", () => {
  const r = episodios(evaluarSerie(serie("2020-01-01", 6, { 1: AMARILLO, 2: ROJO, 3: AMARILLO, 5: AMARILLO })));
  assert.deepEqual(r, [
    { desde: "2020-01-02", hasta: "2020-01-04", dias: 3, nivel: "rojo" },
    { desde: "2020-01-06", hasta: "2020-01-06", dias: 1, nivel: "amarillo" },
  ]);
});

test("un día sin datos corta el episodio (no se supone que siguió)", () => {
  const r = episodios(evaluarSerie(serie("2020-01-01", 3, { 0: AMARILLO, 1: SIN_DATOS, 2: AMARILLO })));
  assert.equal(r.length, 2);
});

test("un hueco en las fechas también corta el episodio", () => {
  const dias = serie("2020-01-01", 4, { 0: AMARILLO, 3: AMARILLO }).filter((_, i) => i === 0 || i === 3);
  assert.equal(episodios(evaluarSerie(dias)).length, 2);
});

test("conteo por año: incluye años sin alertas y cuenta el episodio en el año en que empieza", () => {
  // 30 y 31 de diciembre de 2019 y 1 de enero de 2020 con alerta: un episodio de 2019.
  const dias = serie("2019-12-29", 6, { 1: AMARILLO, 2: ROJO, 3: AMARILLO, 5: SIN_DATOS });
  assert.deepEqual(alertasPorAno(evaluarSerie(dias), 2019, 2021), [
    { ano: 2019, alertas: 1, alertasRojas: 1, diasAmarillo: 1, diasRojo: 1, diasSinDatos: 0 },
    { ano: 2020, alertas: 0, alertasRojas: 0, diasAmarillo: 1, diasRojo: 0, diasSinDatos: 1 },
    { ano: 2021, alertas: 0, alertasRojas: 0, diasAmarillo: 0, diasRojo: 0, diasSinDatos: 0 },
  ]);
});

test("evento: alerta 3 días antes y rojo 1 día antes", () => {
  // Inicio de la serie: 2020-10-26 (= desde − 7). Índice 4 = 30 oct, 6 = 1 nov.
  const dias = evaluarSerie(serie("2020-10-26", 12, { 4: AMARILLO, 5: AMARILLO, 6: ROJO }));
  const r = analizarEvento(evento("2020-11-02"), dias);
  assert.equal(r.nivelMaximo, "rojo");
  assert.equal(r.anticipacionAlerta, 3);
  assert.equal(r.anticipacionRojo, 1);
  // Detalle: de desde − 7 a desde + 3 = 11 días.
  assert.equal(r.detalle.length, 11);
  assert.equal(r.detalle[0].dia.fecha, "2020-10-26");
  assert.equal(r.detalle.at(-1)?.dia.fecha, "2020-11-05");
});

test("evento: una alerta que llega después del inicio da anticipación negativa", () => {
  const dias = evaluarSerie(serie("2020-10-26", 12, { 9: AMARILLO })); // 4 nov
  const r = analizarEvento(evento("2020-11-02", "2020-11-05"), dias);
  assert.equal(r.anticipacionAlerta, -2);
  assert.equal(r.anticipacionRojo, null);
});

test("evento: sin `hasta`, una alerta posterior al inicio no cuenta", () => {
  const dias = evaluarSerie(serie("2020-10-26", 12, { 9: AMARILLO }));
  const r = analizarEvento(evento("2020-11-02"), dias);
  assert.equal(r.anticipacionAlerta, null);
  assert.equal(r.nivelMaximo, "verde");
});

test("evento: alertas de más de 7 días antes no cuentan", () => {
  const dias = evaluarSerie(serie("2020-10-20", 20, { 0: ROJO })); // 20 oct = desde − 13
  assert.equal(analizarEvento(evento("2020-11-02"), dias).anticipacionAlerta, null);
});

test("evento fuera del periodo descargado: sin datos", () => {
  const r = analizarEvento(evento("1980-01-01"), evaluarSerie(serie("2020-01-01", 5)));
  assert.equal(r.nivelMaximo, null);
  assert.deepEqual(r.detalle, []);
});

test("quitar las olas del color quita las alertas que solo venían de las olas", () => {
  const dias = serie("2020-01-01", 5, { 1: { olasMaxM: 2 }, 3: AMARILLO });
  assert.equal(episodios(evaluarSerie(dias)).length, 2);
  assert.equal(episodios(evaluarSerie(dias, reglasSinOlas())).length, 1);
});

test("histórico: la lluvia de 3 días usa los días previos y luego se descartan", () => {
  const clima = {
    latitude: 18.25,
    longitude: -93.75,
    daily: {
      time: ["2020-10-31", "2020-11-01", "2020-11-02", "2020-11-03"],
      precipitation_sum: [10, 20, 30, null],
      wind_speed_10m_max: [10, 10, 10, 10],
      wind_gusts_10m_max: [20, 20, 20, 20],
    },
  };
  // El mar responde con otro orden y sin un día: se une por fecha, no por posición.
  const mar = {
    latitude: 18.5,
    longitude: -94,
    daily: { time: ["2020-11-03", "2020-11-02"], wave_height_max: [1.2, 0.8] },
  };
  const { dias, celdas } = unirHistorico(clima, mar, "2020-11-02");
  assert.deepEqual(
    dias.map((d) => [d.fecha, d.lluvia3dMm, d.olasMaxM]),
    [
      ["2020-11-02", 60, 0.8],
      ["2020-11-03", null, 1.2], // falta la lluvia de ese día: no se inventa una suma parcial
    ],
  );
  assert.deepEqual(celdas.mar, { latitud: 18.5, longitud: -94 });
});

test("tramos: un año de calendario por petición; el primero y el último pueden ser parciales", () => {
  assert.deepEqual(tramosPorAno("1990-12-30", "1992-06-30"), [
    { desde: "1990-12-30", hasta: "1990-12-31" },
    { desde: "1991-01-01", hasta: "1991-12-31" },
    { desde: "1992-01-01", hasta: "1992-06-30" },
  ]);
  assert.deepEqual(tramosPorAno("2020-03-01", "2020-03-05"), [{ desde: "2020-03-01", hasta: "2020-03-05" }]);
});

test("tramos: se juntan en orden, conservando todas las variables", () => {
  const parte = (time: string[], olas: number[]) => ({
    latitude: 18.5,
    longitude: -94,
    daily: { time, wave_height_max: olas },
  });
  assert.deepEqual(juntarTramos([parte(["2020-12-31"], [1]), parte(["2021-01-01", "2021-01-02"], [2, 3])]).daily, {
    time: ["2020-12-31", "2021-01-01", "2021-01-02"],
    wave_height_max: [1, 2, 3],
  });
});
