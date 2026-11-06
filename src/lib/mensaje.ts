// Mensaje listo para publicar a mano en Facebook.
// Se arma con las mismas funciones que la página, así que no puede decir algo distinto.
// Solo existe cuando hay alerta: en cualquier otro caso devuelve null y no se publica.

import { razonCorta, respuestaDelDia, type Tono } from "./respuesta.ts";
import { queHacer, respuestaGeneral, type DiaEvaluado } from "./resumen.ts";
import { momentoLargo, nombreDelDia } from "./tiempo.ts";
import { MENSAJE, RESPUESTA_GENERAL } from "../config/reglas.ts";
import { CONTACTOS } from "../config/contactos.ts";

// Marcadores visuales: siempre van seguidos de una palabra, nunca solos.
const EMOJI: Record<Tono, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚪" };

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "🔴 Sábado 7: peligro. Lluvia intensa (120 mm); lluvia de 3 días (210 mm, umbral en prueba)"
function lineaDia({ dia, evaluacion, puedeCambiar }: DiaEvaluado, hoy: string): string {
  const respuesta = respuestaDelDia(evaluacion);
  let linea = `${EMOJI[respuesta.tono]} ${nombreDelDia(dia.fecha, hoy)}: ${respuesta.titulo.toLowerCase()}`;
  if (puedeCambiar) linea += ` ${RESPUESTA_GENERAL.puedeCambiar}`;
  const razones = evaluacion.razones.map((razon) => razonCorta(razon));
  if (razones.length > 0) linea += `. ${mayuscula(razones.join("; "))}`;
  if (respuesta.faltan) linea += `. ${respuesta.faltan}`;
  return linea;
}

// "Emergencias: 911 · Marina: 800 627 4621 (800 MARINA1) · ..."
function lineaEmergencias(): string {
  const numeros = CONTACTOS.map((c) => (c.nombreCorto ? `${c.nombreCorto}: ${c.numero}` : c.numero));
  return `${MENSAJE.emergencias} ${numeros.join(" · ")}`;
}

export function mensajeFacebook({
  dias,
  hoy,
  generadoEn,
  url,
}: {
  dias: DiaEvaluado[];
  hoy: string;
  generadoEn: Date;
  url: string | null;
}): string | null {
  const general = respuestaGeneral(dias, hoy);
  if (general.tono !== "amarillo" && general.tono !== "rojo") return null;

  // Las primeras líneas deben bastar: mucha gente no toca "Ver más".
  // La fecha va arriba porque una publicación sigue apareciendo en el muro días después.
  return [
    `${EMOJI[general.tono]} ${general.titulo} ${MENSAJE.lugar}`,
    general.detalle,
    ...(general.nota ? [general.nota] : []),
    MENSAJE.fecha(momentoLargo(generadoEn)),
    "",
    MENSAJE.diaPorDia,
    ...dias.map((d) => lineaDia(d, hoy)),
    "",
    MENSAJE.queHacer,
    // Solo los principales: el resto está en la página, que es el enlace del mensaje.
    ...queHacer(dias).principales.map((consejo) => `• ${consejo}`),
    "",
    lineaEmergencias(),
    `${MENSAJE.enlace} ${url ?? MENSAJE.enlacePendiente}`,
    MENSAJE.avisoLegal,
    MENSAJE.atribucion,
  ].join("\n");
}
