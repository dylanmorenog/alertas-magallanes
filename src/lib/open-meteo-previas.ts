// Pronósticos archivados de Open-Meteo para el backtesting (parte 2: lo que se PRONOSTICÓ).
// Docs: https://open-meteo.com/en/docs/previous-runs-api
//
// `precipitation_previous_day3` en la hora H es el valor que se pronosticaba para H con
// 3 días de anticipación. Para la anticipación 0 se usa el nombre simple (`precipitation`):
// la API trata `_previous_day0` como el mismo valor y lo devuelve con ese nombre.
//
// Lo que verifiqué en la API (nov 2026):
// - Solo hay datos por hora; pedir datos diarios da error. Los días se arman aquí.
// - Las rachas (`wind_gusts_10m_previous_dayN`) sí existen, aunque la documentación no
//   las lista.
// - La mayoría de los modelos se guardan desde enero de 2024; no hay olas archivadas.
// - Sin `models`, usa "best_match", igual que la app.

import { pedirConCache } from "./descargas.ts";
import { PUEBLO, ZONA_HORARIA, type Coordenadas } from "./open-meteo.ts";
import { diasEntre, fechaEnMexico } from "./tiempo.ts";

const URL_PREVIAS = "https://previous-runs-api.open-meteo.com/v1/forecast";
// La app muestra hoy y los 4 días siguientes: con 4 días de anticipación basta.
export const ANTICIPACION_MAXIMA = 4;
// Desde cuándo hay pronósticos archivados para la mayoría de los modelos.
export const PREVIAS_DESDE = "2024-01-01";

const VARIABLES = { lluvia: "precipitation", viento: "wind_speed_10m", rachas: "wind_gusts_10m" } as const;

export type PronosticoDiario = { lluviaMm: number | null; vientoMaxKmh: number | null; rachasMaxKmh: number | null };
// anticipación (0–4) → fecha → valores del día
export type Previas = Map<number, Map<string, PronosticoDiario>>;

export type RespuestaPrevias = {
  latitude: number;
  longitude: number;
  hourly: { time: string[] } & Record<string, (number | null)[] | string[]>;
};

function nombre(variable: string, anticipacion: number): string {
  return anticipacion === 0 ? variable : `${variable}_previous_day${anticipacion}`;
}

// Agrupa las horas por día local (los tiempos ya vienen en hora de México). Un día con
// alguna hora sin dato, o con menos de 24 horas, queda sin dato: una suma parcial
// afirmaría un total que no conocemos.
export function diariosPorAnticipacion(respuesta: RespuestaPrevias, maxima = ANTICIPACION_MAXIMA): Previas {
  const { time } = respuesta.hourly;
  const horasPorDia = new Map<string, number[]>();
  time.forEach((t, i) => {
    const fecha = t.slice(0, 10);
    horasPorDia.set(fecha, [...(horasPorDia.get(fecha) ?? []), i]);
  });

  const resumir = (serie: (number | null)[] | undefined, indices: number[], como: "suma" | "maximo") => {
    if (!serie || indices.length !== 24) return null;
    const valores = indices.map((i) => serie[i]);
    if (valores.some((v) => v === null || v === undefined)) return null;
    const numeros = valores as number[];
    return como === "suma"
      ? Math.round(numeros.reduce((s, v) => s + v, 0) * 10) / 10
      : Math.max(...numeros);
  };

  const previas: Previas = new Map();
  for (let anticipacion = 0; anticipacion <= maxima; anticipacion++) {
    const columna = (variable: string) => respuesta.hourly[nombre(variable, anticipacion)] as (number | null)[] | undefined;
    const porFecha = new Map<string, PronosticoDiario>();
    for (const [fecha, indices] of horasPorDia) {
      porFecha.set(fecha, {
        lluviaMm: resumir(columna(VARIABLES.lluvia), indices, "suma"),
        vientoMaxKmh: resumir(columna(VARIABLES.viento), indices, "maximo"),
        rachasMaxKmh: resumir(columna(VARIABLES.rachas), indices, "maximo"),
      });
    }
    previas.set(anticipacion, porFecha);
  }
  return previas;
}

// Pronósticos archivados para los días `desde` a `hasta`, con anticipaciones de 0 a 4.
export async function obtenerPrevias(
  desde: string,
  hasta: string,
  { hoy = fechaEnMexico(new Date()) }: { hoy?: string } = {},
): Promise<{ previas: Previas; celda: Coordenadas }> {
  const hourly = Object.values(VARIABLES).flatMap((variable) =>
    Array.from({ length: ANTICIPACION_MAXIMA + 1 }, (_, n) => nombre(variable, n)),
  );
  const params = new URLSearchParams({
    latitude: String(PUEBLO.latitud),
    longitude: String(PUEBLO.longitud),
    start_date: desde,
    end_date: hasta,
    timezone: ZONA_HORARIA,
    hourly: hourly.join(","),
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  });
  // Lo archivado no cambia; solo se evita guardar días tan recientes que todavía podrían
  // estar incompletos.
  const respuesta = await pedirConCache<RespuestaPrevias>(`${URL_PREVIAS}?${params}`, {
    guardar: diasEntre(hasta, hoy) > ANTICIPACION_MAXIMA + 3,
  });
  return {
    previas: diariosPorAnticipacion(respuesta),
    celda: { latitud: respuesta.latitude, longitud: respuesta.longitude },
  };
}
