// Reglas y textos que se van a validar con los pescadores del pueblo.
// Todo lo ajustable vive aquí: cambiar una regla no debería requerir tocar la lógica.
// Al ajustar tras la plática, cambia los umbrales O los textos, no los dos a la vez,
// para saber qué cambio tuvo efecto.

import type { Variable } from "../lib/semaforo.ts";

export const UMBRALES: Record<Variable, { amarillo: number; rojo: number; unidad: string }> = {
  rachas: { amarillo: 50, rojo: 70, unidad: "km/h" },
  olas: { amarillo: 1.5, rojo: 2.5, unidad: "m" },
  lluvia: { amarillo: 50, rojo: 100, unidad: "mm" },
};

// Cómo se nombra cada variable en una frase ("faltan datos de ...").
export const NOMBRES: Record<Variable, string> = {
  rachas: "rachas de viento",
  olas: "olas",
  lluvia: "lluvia",
};

// Explicación sencilla de una razón; `valor` ya viene formateado.
export const FRASES: Record<Variable, (valor: string) => string> = {
  rachas: (valor) => `Rachas de viento de hasta ${valor} km/h`,
  olas: (valor) => `Olas de hasta ${valor} m en el mar`,
  lluvia: (valor) => `${valor} mm de lluvia en el día`,
};

export const PALABRA_NIVEL = { amarillo: "precaución", rojo: "peligro" };

export const RESPUESTAS = {
  verde: {
    titulo: "SÍ",
    detalle: "Sin alertas de viento, olas ni lluvia.",
  },
  verdeIncompleto: {
    titulo: "PROBABLEMENTE SÍ",
    detalle: (faltan: string) => `Faltan datos de ${faltan}; revisa el cielo y pregunta antes de salir.`,
  },
  // Pendiente de validar. La pregunta para los pescadores: ¿amarillo es
  // "sal con precaución" (esta opción) o "mejor espera"? Alternativa:
  //   titulo: "MEJOR ESPERA",
  //   detalle: "Condiciones serias para una lancha pequeña; espera a que mejoren.",
  amarillo: {
    titulo: "CON MUCHO CUIDADO",
    detalle: "Solo si es necesario, con lancha y equipo en buen estado.",
  },
  rojo: {
    titulo: "NO",
    detalle: "Condiciones peligrosas.",
  },
  sinDatos: {
    titulo: "NO SABEMOS",
    detalle: "No hay datos del pronóstico; consulta a Capitanía de Puerto.",
  },
  // Para amarillo y rojo incompletos: lo que falta solo podría empeorar el color.
  faltanDatos: (faltan: string) => `Faltan datos de ${faltan}; las condiciones podrían ser peores.`,
};

export const QUE_HACER = [
  "Asegura la lancha: súbela o amárrala bien, lejos de la orilla.",
  "Asegura techos, láminas y objetos que el viento pueda levantar.",
  "Carga celulares y lámparas.",
  "Ten a la mano los números de emergencia.",
];

export const NOTA_OLAS = "Olas: pronóstico en el mar, frente a la costa. No incluye la laguna.";

export const AVISO_LEGAL =
  "Esta página es informativa y no sustituye los avisos de Protección Civil ni de Capitanía de Puerto.";

// A partir de cuántas horas se advierte que el pronóstico es viejo.
// Normalmente la página tiene menos de 1 hora (se regenera cada 30 minutos).
export const HORAS_PRONOSTICO_VIEJO = 3;

export const AVISO_PRONOSTICO_VIEJO =
  `Este pronóstico tiene más de ${HORAS_PRONOSTICO_VIEJO} horas y puede haber cambiado. ` +
  "Vuelve a cargar la página cuando tengas señal.";
