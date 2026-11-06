// Descargas para el backtesting: reintentos ante fallas pasajeras y caché en disco.
// No lo usa la página: ahí, si Open-Meteo falla, Next sigue mostrando la última versión
// buena, y reintentar solo retrasaría la respuesta.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";

const TIEMPO_MAXIMO_MS = 60_000;
const REINTENTOS = 5;
const ESPERA_INICIAL_MS = 5_000; // luego 10, 20, 40 y 80 segundos
export const CARPETA_CACHE = join(".cache", "open-meteo");

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

// `guardar: false` para datos que todavía pueden cambiar (ERA5 reciente es preliminar):
// se leen de la caché si ya están, pero una respuesta nueva no se guarda.
export async function pedirConCache<T>(
  direccion: string,
  { carpeta = CARPETA_CACHE, guardar = true }: { carpeta?: string; guardar?: boolean } = {},
): Promise<T> {
  const archivo = join(carpeta, `${createHash("sha256").update(direccion).digest("hex").slice(0, 16)}.json`);
  if (guardar) {
    try {
      return JSON.parse(await readFile(archivo, "utf8")) as T;
    } catch {
      // No está en caché (o está dañado): se descarga.
    }
  }
  const datos = await pedirConReintentos<T>(direccion);
  if (guardar) {
    await mkdir(carpeta, { recursive: true });
    await writeFile(archivo, JSON.stringify(datos));
  }
  return datos;
}
