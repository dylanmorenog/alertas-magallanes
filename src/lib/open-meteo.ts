// Cliente mínimo para Open-Meteo: pronóstico del clima y Marine API.
// Docs: https://open-meteo.com/en/docs y https://open-meteo.com/en/docs/marine-weather-api

import { lluviaAcumulada } from "./lluvia.ts";
import { DIAS_LLUVIA_ACUMULADA } from "../config/reglas.ts";

const URL_CLIMA = "https://api.open-meteo.com/v1/forecast";
const URL_MARINA = "https://marine-api.open-meteo.com/v1/marine";
export const ZONA_HORARIA = "America/Mexico_City";
const DIAS = 5; // hoy y los 4 siguientes
// Días anteriores a hoy que hacen falta para que la lluvia acumulada de hoy esté completa.
const DIAS_PASADOS = DIAS_LLUVIA_ACUMULADA - 1;
const TIEMPO_MAXIMO_MS = 10_000;

type Coordenadas = { latitud: number; longitud: number };

// El pueblo (en tierra) y un punto mar adentro, porque el oleaje solo existe en el mar.
const PUEBLO: Coordenadas = { latitud: 18.29, longitud: -93.87 };
const MAR_ADENTRO: Coordenadas = { latitud: 18.35, longitud: -93.87 };

// Forma de la respuesta de cada API (solo los campos que pedimos).
// Open-Meteo devuelve null cuando no tiene dato para un día.
type RespuestaClima = {
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    wind_gusts_10m_max: (number | null)[];
  };
};

type RespuestaMarina = {
  daily: {
    time: string[];
    wave_height_max: (number | null)[];
  };
};

export type PronosticoDia = {
  fecha: string; // "AAAA-MM-DD", en hora de México
  lluviaMm: number | null;
  lluvia3dMm: number | null; // lluvia de este día y los 2 anteriores
  vientoMaxKmh: number | null;
  rachasMaxKmh: number | null;
  olasMaxM: number | null;
};

function construirUrl(
  base: string,
  punto: Coordenadas,
  variables: string[],
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams({
    latitude: String(punto.latitud),
    longitude: String(punto.longitud),
    daily: variables.join(","),
    timezone: ZONA_HORARIA,
    forecast_days: String(DIAS),
    ...extra,
  });
  return `${base}?${params}`;
}

// Nota: el "as T" le dice a TypeScript que confíe en la forma del JSON; no la verifica.
async function pedirJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) });
  if (!res.ok) {
    throw new Error(`Open-Meteo respondió ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function obtenerPronostico(): Promise<PronosticoDia[]> {
  const [clima, mar] = await Promise.all([
    pedirJson<RespuestaClima>(
      construirUrl(
        URL_CLIMA,
        PUEBLO,
        ["precipitation_sum", "wind_speed_10m_max", "wind_gusts_10m_max"],
        { wind_speed_unit: "kmh", precipitation_unit: "mm", past_days: String(DIAS_PASADOS) },
      ),
    ),
    pedirJson<RespuestaMarina>(construirUrl(URL_MARINA, MAR_ADENTRO, ["wave_height_max"])),
  ]);

  // Unimos las dos respuestas por fecha, no por posición en el arreglo.
  const olasPorFecha = new Map(
    mar.daily.time.map((fecha, i) => [fecha, mar.daily.wave_height_max[i] ?? null]),
  );

  // Se calcula sobre la serie completa (con los días pasados) y luego se descartan esos días.
  const lluvia3d = lluviaAcumulada(clima.daily.precipitation_sum, DIAS_LLUVIA_ACUMULADA);

  return clima.daily.time
    .map((fecha, i) => ({
      fecha,
      lluviaMm: clima.daily.precipitation_sum[i] ?? null,
      lluvia3dMm: lluvia3d[i] ?? null,
      vientoMaxKmh: clima.daily.wind_speed_10m_max[i] ?? null,
      rachasMaxKmh: clima.daily.wind_gusts_10m_max[i] ?? null,
      olasMaxM: olasPorFecha.get(fecha) ?? null,
    }))
    .slice(DIAS_PASADOS);
}
