// Mensaje listo para publicar a mano en Facebook, en lenguaje sencillo para la gente del
// pueblo: qué viene, cuándo es lo peor y qué hacer. Sin números ni palabras técnicas (una
// prueba lo revisa); los números se quedan en la página, que es el enlace del mensaje.
// Solo existe cuando hay alerta: en cualquier otro caso devuelve null y no se publica.

import { lista, type Tono } from "./respuesta.ts";
import { consejosDelMensaje, respuestaGeneral, type DiaEvaluado } from "./resumen.ts";
import type { Razon } from "./semaforo.ts";
import { diaConFecha, fechaEnMexico, fechaLarga, hora12, nombreConFecha } from "./tiempo.ts";
import { COMO_SE_DICE, MENSAJE, RESPUESTA_GENERAL } from "../config/reglas.ts";

// Marcadores visuales: siempre van seguidos de una palabra, nunca solos.
const EMOJI: Record<Tono, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚪" };

type Alerta = "amarillo" | "rojo";
type Tipo = keyof typeof COMO_SE_DICE;

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function conAlerta(d: DiaEvaluado): boolean {
  return d.evaluacion.nivel === "amarillo" || d.evaluacion.nivel === "rojo";
}

// Cómo se dice cada variable. La lluvia del día dice "lluvia fuerte" y además cuenta para
// el riesgo de inundación; la lluvia de varios días solo se dice por lo que provoca.
const TIPOS: Record<Razon["variable"], Tipo[]> = {
  lluvia: ["lluvia", "inundacion"],
  lluvia3d: ["inundacion"],
  rachas: ["viento"],
  olas: ["olas"],
};

// El peor nivel de cada tipo entre las razones dadas.
function peorPorTipo(razones: Razon[]): Partial<Record<Tipo, Alerta>> {
  const peor: Partial<Record<Tipo, Alerta>> = {};
  for (const razon of razones) {
    for (const tipo of TIPOS[razon.variable]) {
      if (peor[tipo] !== "rojo") peor[tipo] = razon.nivel;
    }
  }
  return peor;
}

// "lluvia muy fuerte, viento fuerte y mar picado; se pueden inundar calles y casas"
function describir(razones: Razon[]): string {
  const peor = peorPorTipo(razones);
  const condiciones = (["lluvia", "viento", "olas"] as const)
    .filter((tipo) => peor[tipo])
    .map((tipo) => COMO_SE_DICE[tipo][peor[tipo]!]);
  const consecuencia = peor.inundacion ? COMO_SE_DICE.inundacion[peor.inundacion] : null;
  if (condiciones.length === 0) return consecuencia ?? "";
  return consecuencia ? `${lista.format(condiciones)}; ${consecuencia}` : lista.format(condiciones);
}

// Segunda línea: cuándo es lo peor (el primer día con el nivel más alto) y qué viene en
// todos los días con alerta. Si todo está en los días que pueden cambiar, "Podría venir…".
function segundaLinea(alertas: DiaEvaluado[], hoy: string): string {
  const pico = alertas.find((d) => d.evaluacion.nivel === "rojo") ?? alertas[0];
  const que = mayuscula(describir(alertas.flatMap((d) => d.evaluacion.razones)));
  const cuando = diaConFecha(pico.dia.fecha, hoy);
  if (alertas.every((d) => d.puedeCambiar)) return MENSAJE.podriaVenir(cuando, que);
  return MENSAJE.loPeor(pico.puedeCambiar ? `${cuando} ${RESPUESTA_GENERAL.puedeCambiar}` : cuando, que);
}

// "🔴 Mañana sábado 7: lluvia muy fuerte y viento muy fuerte; se pueden inundar calles y casas."
function lineaDia({ dia, evaluacion, puedeCambiar }: DiaEvaluado, hoy: string): string {
  const nivel = evaluacion.nivel as Alerta;
  const cambiar = puedeCambiar ? ` ${RESPUESTA_GENERAL.puedeCambiar}` : "";
  return `${EMOJI[nivel]} ${nombreConFecha(dia.fecha, hoy)}${cambiar}: ${describir(evaluacion.razones)}.`;
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

  // Solo los días con alerta: los días tranquilos no se listan.
  const alertas = dias.filter(conAlerta);

  // Las dos primeras líneas deben bastar: mucha gente no toca "Ver más".
  return [
    `${EMOJI[general.tono]} ${general.titulo} ${MENSAJE.lugar}`,
    segundaLinea(alertas, hoy),
    ...(general.nota ? [general.nota] : []),
    "",
    ...alertas.map((d) => lineaDia(d, hoy)),
    "",
    MENSAJE.queHacer,
    ...consejosDelMensaje(dias).map((consejo) => `• ${consejo}`),
    "",
    MENSAJE.emergencias,
    `${MENSAJE.enlace} ${url ?? MENSAJE.enlacePendiente}`,
    // La fecha va en el mensaje porque una publicación sigue apareciendo días después.
    MENSAJE.pie(hora12(generadoEn), fechaLarga(fechaEnMexico(generadoEn))),
    MENSAJE.atribucion,
  ].join("\n");
}
