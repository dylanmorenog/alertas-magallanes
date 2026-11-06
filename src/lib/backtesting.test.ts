import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertasPorAno,
  episodios,
  evaluarEvento,
  evaluarSerie,
  reglasConRojo,
  reglasSinOlas,
  simularApp,
} from "./backtesting.ts";
import { juntarTramos, tramosPorAno, unirHistorico } from "./open-meteo-historico.ts";
import { diariosPorAnticipacion, type Previas, type PronosticoDiario } from "./open-meteo-previas.ts";
import type { PronosticoDia } from "./open-meteo.ts";
import { sumarDias } from "./tiempo.ts";
import type { Evento } from "./eventos.ts";
import { UMBRALES } from "../config/reglas.ts";

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

const evento = (fecha: string, hasta: string | null = null): Evento => ({
  id: "prueba",
  fecha,
  hasta,
  descripcion: "Evento de prueba",
  alcance: "magallanes",
  fuentes: [{ nombre: "prueba", url: "https://example.org" }],
  verificadoEl: "2026-11-06",
  notas: null,
});

// ---------------------------------------------------------------------------------------
// Parte 1

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

test("quitar las olas del color quita las alertas que solo venían de las olas", () => {
  const dias = serie("2020-01-01", 5, { 1: { olasMaxM: 2 }, 3: AMARILLO });
  assert.equal(episodios(evaluarSerie(dias)).length, 2);
  assert.equal(episodios(evaluarSerie(dias, reglasSinOlas())).length, 1);
});

test("evento: el peor nivel de sus días, qué lo activó, y cómo queda sin olas", () => {
  // 16, 17 y 18 de octubre; el evento es 17–18.
  const dias = serie("2026-10-14", 7, { 3: { rachasMaxKmh: 75, olasMaxM: 3 }, 4: { lluviaMm: 60, olasMaxM: 2 } });
  const r = evaluarEvento(evento("2026-10-17", "2026-10-18"), evaluarSerie(dias), evaluarSerie(dias, reglasSinOlas()));
  assert.equal(r.nivel, "rojo");
  assert.deepEqual(r.variables, ["rachas", "olas", "lluvia"]);
  assert.equal(r.nivelSinOlas, "rojo"); // las rachas bastan
  // Detalle: de 3 días antes al día siguiente del fin.
  assert.deepEqual([r.detalle[0].dia.fecha, r.detalle.at(-1)?.dia.fecha], ["2026-10-14", "2026-10-19"]);
});

test("sensibilidad: subir el rojo por olas convierte ese rojo en amarillo, sin tocar UMBRALES", () => {
  const dias = serie("2020-01-01", 3, { 1: { olasMaxM: 3.2 } });
  const conRojo = (rojo: number) => episodios(evaluarSerie(dias, reglasConRojo(UMBRALES, "olas", rojo)));
  assert.deepEqual(conRojo(2.5).map((e) => e.nivel), ["rojo"]);
  assert.deepEqual(conRojo(3.5).map((e) => e.nivel), ["amarillo"]); // la alerta sigue: 3.2 ≥ 1.5
  assert.equal(UMBRALES.olas.rojo, 2.5); // la configuración de la app no cambió
  assert.throws(() => reglasConRojo(UMBRALES, "olas", 1), /no puede ser menor que el amarillo/);
});

test("evento: solo olas → sin olas queda en verde", () => {
  const dias = serie("2019-11-10", 6, { 3: { olasMaxM: 2.7 } });
  const r = evaluarEvento(evento("2019-11-13"), evaluarSerie(dias), evaluarSerie(dias, reglasSinOlas()));
  assert.equal(r.nivel, "rojo");
  assert.equal(r.nivelSinOlas, "verde");
});

test("evento fuera del periodo descargado: sin datos", () => {
  const dias = serie("2020-01-01", 5);
  const r = evaluarEvento(evento("1980-01-01"), evaluarSerie(dias), evaluarSerie(dias));
  assert.equal(r.nivel, null);
  assert.deepEqual(r.detalle, []);
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

// ---------------------------------------------------------------------------------------
// Parte 2

const TRANQUILO: PronosticoDiario = { lluviaMm: 0, vientoMaxKmh: 10, rachasMaxKmh: 20 };

// Pronósticos inventados: `cambios[anticipación][fecha]` modifica un día tranquilo.
function previas(desde: string, n: number, cambios: Record<number, Record<string, Partial<PronosticoDiario>>> = {}): Previas {
  const resultado: Previas = new Map();
  for (let a = 0; a <= 4; a++) {
    const porFecha = new Map<string, PronosticoDiario>();
    for (let i = 0; i < n; i++) {
      const fecha = sumarDias(desde, i);
      porFecha.set(fecha, { ...TRANQUILO, ...cambios[a]?.[fecha] });
    }
    resultado.set(a, porFecha);
  }
  return resultado;
}

test("app: rojo pronosticado con 4 días → avisó 4 días antes, pero el aviso confiable llegó a 2", () => {
  // El 17 es el evento. Con anticipación 4 y 3 ("puede cambiar") ya se veía rojo; con 2, también.
  const p = previas("2026-10-10", 10, {
    4: { "2026-10-17": { rachasMaxKmh: 81 } },
    3: { "2026-10-17": { rachasMaxKmh: 75 } },
    2: { "2026-10-17": { rachasMaxKmh: 72 } },
  });
  const r = simularApp(evento("2026-10-17"), p);
  assert.equal(r.anticipacion, 4);
  assert.equal(r.anticipacionRojo, 4);
  assert.equal(r.anticipacionConfiable, 2);
  // La vista del 13 muestra el 17 con anticipación 4, marcado "puede cambiar".
  assert.deepEqual(r.vistas[0], {
    emision: "2026-10-13",
    dias: [{ fecha: "2026-10-17", anticipacion: 4, puedeCambiar: true, nivel: "rojo" }],
  });
});

test("app: si el pronóstico solo acertó el mismo día, la anticipación es 0", () => {
  const p = previas("2026-10-10", 10, { 0: { "2026-10-17": { rachasMaxKmh: 55 } } });
  const r = simularApp(evento("2026-10-17"), p);
  assert.equal(r.anticipacion, 0);
  assert.equal(r.anticipacionConfiable, 0);
  assert.equal(r.anticipacionRojo, null);
});

test("app: evento de varios días; el aviso puede llegar por el segundo día del evento", () => {
  // Solo el 18 tenía alerta, y se veía desde el 14 (anticipación 4): 3 días antes del 17.
  const p = previas("2026-10-10", 10, { 4: { "2026-10-18": { rachasMaxKmh: 55 } } });
  const r = simularApp(evento("2026-10-17", "2026-10-18"), p);
  assert.equal(r.anticipacion, 3);
  assert.equal(r.vistas.length, 6); // emisiones del 13 al 18
});

test("app: la lluvia de 3 días suma el 'pasado' (anticipación 0) con lo pronosticado", () => {
  // Visto desde el 16, para el 17: el 15 ya pasó (anticipación 0), el 16 es hoy
  // (anticipación 0) y el 17 va con anticipación 1. Umbral amarillo: 100 mm.
  const con = (pasado: number) =>
    previas("2026-10-10", 10, {
      0: { "2026-10-15": { lluviaMm: pasado } },
      1: { "2026-10-17": { lluviaMm: 45 } },
      // Si el 15 se tomara con otra anticipación (error), estos 90 mm cambiarían el resultado.
      2: { "2026-10-15": { lluviaMm: 90 } },
    });
  assert.equal(simularApp(evento("2026-10-17"), con(60)).anticipacion, 1); // 60 + 0 + 45 = 105
  assert.equal(simularApp(evento("2026-10-17"), con(50)).anticipacion, null); // 50 + 0 + 45 = 95
});

test("agrupación por hora: suma la lluvia, toma el máximo y no inventa días incompletos", () => {
  const horas = (fecha: string) => Array.from({ length: 24 }, (_, h) => `${fecha}T${String(h).padStart(2, "0")}:00`);
  const time = [...horas("2026-10-17"), ...horas("2026-10-18").slice(0, 23)]; // el 18 llega incompleto
  const lluvia = time.map(() => 0.5);
  const rachas = time.map((_, i) => (i === 5 ? 81.4 : 30));
  const conNulo = time.map((_, i) => (i === 3 ? null : 10));
  const p = diariosPorAnticipacion(
    {
      latitude: 18.24,
      longitude: -93.86,
      hourly: {
        time,
        precipitation: lluvia,
        wind_gusts_10m: rachas,
        wind_speed_10m: conNulo,
        precipitation_previous_day1: lluvia,
      },
    },
    1,
  );
  assert.deepEqual(p.get(0)?.get("2026-10-17"), { lluviaMm: 12, vientoMaxKmh: null, rachasMaxKmh: 81.4 });
  assert.deepEqual(p.get(0)?.get("2026-10-18"), { lluviaMm: null, vientoMaxKmh: null, rachasMaxKmh: null });
  // Variables que no se pidieron con esa anticipación quedan sin dato, no en 0.
  assert.deepEqual(p.get(1)?.get("2026-10-17"), { lluviaMm: 12, vientoMaxKmh: null, rachasMaxKmh: null });
});
