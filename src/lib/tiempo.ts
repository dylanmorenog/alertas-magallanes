// Fechas y horas en la zona horaria del pueblo, nunca en la del servidor ni la del celular.
//
// Una fecha de calendario como "2026-11-05" no es un instante. new Date("2026-11-05") la
// interpreta como medianoche UTC, que en México todavía es el día 4. Por eso las fechas de
// calendario se convierten a Date en UTC y se formatean en UTC: así nunca se corren de día.

import { ZONA_HORARIA } from "./open-meteo.ts";
import { HORAS_PRONOSTICO_VIEJO } from "../config/reglas.ts";

function fechaComoUtc(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Fecha de calendario ("AAAA-MM-DD") que corresponde a un instante en México.
export function fechaEnMexico(instante: Date): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instante);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = fechaComoUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// "Hoy", "Mañana" o "Sábado 7".
export function nombreDelDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  const texto = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric" })
    .format(fechaComoUtc(fecha));
  return mayuscula(texto);
}

// "jueves 5 de noviembre" (sin la coma que pone Intl, para escribir "Hoy, jueves 5 de noviembre")
export function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(fechaComoUtc(fecha))
    .replace(",", "");
}

// "jueves 5 de noviembre, 14:30" en hora de México.
export function momentoLargo(instante: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instante);
}

// ¿La página se generó un día anterior al de hoy? Pasa al abrir sin señal una copia guardada.
// Si el reloj del celular va atrasado (su "hoy" es anterior al de la página), no avisamos.
export function esDeUnDiaAnterior(hoyDeLaPagina: string, ahora: Date): boolean {
  return fechaEnMexico(ahora) > hoyDeLaPagina;
}

const relativo = new Intl.RelativeTimeFormat("es", { numeric: "always" });

// Cuánto tiempo pasó desde que se generó el pronóstico, y si ya es viejo.
export function describirAntiguedad(desde: Date, ahora: Date): { texto: string; vieja: boolean } {
  // Si el reloj del celular va atrasado la diferencia sale negativa; la tratamos como 0.
  const minutos = Math.max(0, Math.floor((ahora.getTime() - desde.getTime()) / 60_000));
  const horas = Math.floor(minutos / 60);

  let texto: string;
  if (minutos < 1) texto = "hace un momento";
  else if (minutos < 60) texto = relativo.format(-minutos, "minute");
  else if (horas < 48) texto = relativo.format(-horas, "hour");
  else texto = relativo.format(-Math.floor(horas / 24), "day");

  return { texto, vieja: horas >= HORAS_PRONOSTICO_VIEJO };
}
