// Datos históricos de Open-Meteo para el backtesting.
// Docs: https://open-meteo.com/en/docs/historical-weather-api y .../marine-weather-api
//
// Decisiones:
// - Modelo fijo "era5" (no "best_match"): best_match cambia de modelo según el año, y eso
//   alteraría el conteo de alertas por año por razones que no son el clima. ERA5-Land no
//   sirve: no trae lluvia ni viento propios.
// - Olas: "era5_ocean", el único modelo de oleaje con décadas de historia (desde 1940).
//   cell_selection=sea para que elija una celda de mar, no de costa.
// - Caché en disco (.cache/, fuera del repo): al agregar eventos no se descarga todo otra
//   vez, y repetir el cálculo da exactamente el mismo resultado.
// - Un año por petición: 35 años de golpe tardaban más de 4 minutos (o nunca llegaban).
//   Así cada petición es ligera, cada año se guarda en caché por separado y, si una falla,
//   lo ya descargado no se pierde.
// - Peticiones una tras otra, con reintentos y espera creciente si el servidor está
//   saturado (503) o pide bajar el ritmo (429): es un servicio gratuito.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { MAR_ADENTRO, PUEBLO, ZONA_HORARIA, type Coordenadas, type PronosticoDia } from "./open-meteo.ts";
import { lluviaAcumulada } from "./lluvia.ts";
import { sumarDias } from "./tiempo.ts";
import { DIAS_LLUVIA_ACUMULADA } from "../config/reglas.ts";

const URL_ARCHIVO = "https://archive-api.open-meteo.com/v1/archive";
const URL_MARINA = "https://marine-api.open-meteo.com/v1/marine";
const TIEMPO_MAXIMO_MS = 60_000;
const REINTENTOS = 5;
const ESPERA_INICIAL_MS = 5_000; // luego 10, 20, 40 y 80 segundos
const CARPETA_CACHE = join(".cache", "open-meteo");

export type RespuestaClima = {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    wind_gusts_10m_max: (number | null)[];
  };
};

export type RespuestaMarina = {
  latitude: number;
  longitude: number;
  daily: { time: string[]; wave_height_max: (number | null)[] };
};

export type Historico = {
  dias: PronosticoDia[];
  // Celdas que de verdad usó Open-Meteo (la más cercana de su cuadrícula, no el punto pedido).
  celdas: { clima: Coordenadas; mar: Coordenadas };
};

function url(base: string, punto: Coordenadas, desde: string, hasta: string, extra: Record<string, string>) {
  const params = new URLSearchParams({
    latitude: String(punto.latitud),
    longitude: String(punto.longitud),
    start_date: desde,
    end_date: hasta,
    timezone: ZONA_HORARIA,
    ...extra,
  });
  return `${base}?${params}`;
}

// Se reintenta lo que suele ser pasajero: saturación (503), exceso de ritmo (429), una
// petición que se queda colgada (tiempo agotado) o un error de red. Un 400 (petición mal
// armada) no se reintenta: fallaría igual.
async function pedirConReintentos<T>(direccion: string): Promise<T> {
  for (let intento = 0; ; intento++) {
    let motivo: string;
    try {
      const res = await fetch(direccion, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 503 && res.status !== 429) {
        throw new Error(`Open-Meteo respondió ${res.status}: ${await res.text()}`, { cause: "definitivo" });
      }
      motivo = `respondió ${res.status}`;
    } catch (error) {
      if (error instanceof Error && error.cause === "definitivo") throw error;
      motivo = error instanceof Error && error.name === "TimeoutError" ? "no respondió a tiempo" : "error de red";
    }
    if (intento >= REINTENTOS) throw new Error(`Open-Meteo ${motivo} tras ${REINTENTOS + 1} intentos.`);
    const espera = ESPERA_INICIAL_MS * 2 ** intento;
    console.error(`Open-Meteo ${motivo}; reintento en ${espera / 1000} s...`);
    await esperar(espera);
  }
}

async function pedirConCache<T>(direccion: string, carpeta: string): Promise<T> {
  const archivo = join(carpeta, `${createHash("sha256").update(direccion).digest("hex").slice(0, 16)}.json`);
  try {
    return JSON.parse(await readFile(archivo, "utf8")) as T;
  } catch {
    // No está en caché (o está dañado): se descarga.
  }
  const datos = await pedirConReintentos<T>(direccion);
  await mkdir(carpeta, { recursive: true });
  await writeFile(archivo, JSON.stringify(datos));
  return datos;
}

// Parte un rango de fechas en tramos de un año de calendario (el primero y el último
// pueden ser parciales). Así cada año tiene su propia entrada en la caché.
export function tramosPorAno(desde: string, hasta: string): { desde: string; hasta: string }[] {
  const tramos: { desde: string; hasta: string }[] = [];
  for (let ano = Number(desde.slice(0, 4)); ano <= Number(hasta.slice(0, 4)); ano++) {
    const inicio = `${ano}-01-01` < desde ? desde : `${ano}-01-01`;
    const fin = `${ano}-12-31` > hasta ? hasta : `${ano}-12-31`;
    tramos.push({ desde: inicio, hasta: fin });
  }
  return tramos;
}

// Junta las respuestas de varios tramos en una sola, con los días en orden.
export function juntarTramos<R extends { latitude: number; longitude: number; daily: { time: string[] } }>(
  partes: R[],
): R {
  const [primera] = partes;
  const daily = Object.fromEntries(
    Object.keys(primera.daily).map((clave) => [
      clave,
      partes.flatMap((p) => (p.daily as unknown as Record<string, unknown[]>)[clave]),
    ]),
  );
  return { ...primera, daily } as R;
}

// Une las dos respuestas por fecha (no por posición) y calcula la lluvia de 3 días sobre la
// serie completa; después descarta los días anteriores a `desde`, que solo servían para eso.
export function unirHistorico(clima: RespuestaClima, mar: RespuestaMarina, desde: string): Historico {
  const olasPorFecha = new Map(mar.daily.time.map((fecha, i) => [fecha, mar.daily.wave_height_max[i] ?? null]));
  const lluvia3d = lluviaAcumulada(clima.daily.precipitation_sum, DIAS_LLUVIA_ACUMULADA);

  const dias = clima.daily.time
    .map((fecha, i) => ({
      fecha,
      lluviaMm: clima.daily.precipitation_sum[i] ?? null,
      lluvia3dMm: lluvia3d[i] ?? null,
      vientoMaxKmh: clima.daily.wind_speed_10m_max[i] ?? null,
      rachasMaxKmh: clima.daily.wind_gusts_10m_max[i] ?? null,
      olasMaxM: olasPorFecha.get(fecha) ?? null,
    }))
    .filter((dia) => dia.fecha >= desde);

  return {
    dias,
    celdas: {
      clima: { latitud: clima.latitude, longitud: clima.longitude },
      mar: { latitud: mar.latitude, longitud: mar.longitude },
    },
  };
}

// Historial diario de `desde` a `hasta` (AAAA-MM-DD, inclusive), en hora de México.
export async function obtenerHistorico(desde: string, hasta: string, carpetaCache = CARPETA_CACHE): Promise<Historico> {
  // Días extra al inicio para que la lluvia de 3 días del primer día esté completa.
  const desdeConMargen = sumarDias(desde, -(DIAS_LLUVIA_ACUMULADA - 1));
  const tramos = tramosPorAno(desdeConMargen, hasta);

  const partesClima: RespuestaClima[] = [];
  const partesMar: RespuestaMarina[] = [];
  for (const [i, tramo] of tramos.entries()) {
    console.error(`Datos históricos ${i + 1}/${tramos.length} (${tramo.desde.slice(0, 4)})...`);
    partesClima.push(
      await pedirConCache<RespuestaClima>(
        url(URL_ARCHIVO, PUEBLO, tramo.desde, tramo.hasta, {
          daily: "precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
          models: "era5",
          wind_speed_unit: "kmh",
          precipitation_unit: "mm",
        }),
        carpetaCache,
      ),
    );
    partesMar.push(
      await pedirConCache<RespuestaMarina>(
        url(URL_MARINA, MAR_ADENTRO, tramo.desde, tramo.hasta, {
          daily: "wave_height_max",
          models: "era5_ocean",
          cell_selection: "sea",
        }),
        carpetaCache,
      ),
    );
  }
  return unirHistorico(juntarTramos(partesClima), juntarTramos(partesMar), desde);
}
