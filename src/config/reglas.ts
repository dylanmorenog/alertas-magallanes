// Reglas y textos que se van a validar con la comunidad.
// Todo lo ajustable vive aquí: cambiar una regla no debería requerir tocar la lógica.
// Al ajustar tras validar, cambia los umbrales O los textos, no los dos a la vez,
// para saber qué cambio tuvo efecto.

import type { Reglas, Variable } from "../lib/semaforo.ts";

export const PREGUNTA = "¿Viene mal tiempo a Magallanes?";

// Descripción del sitio: pestaña del navegador, app instalada y, en el paso 5b, la vista
// previa al compartir. No menciona ningún pronóstico para que nunca quede desactualizada.
export const DESCRIPCION_SITIO =
  "Pronóstico de lluvia y viento de 5 días para Sánchez Magallanes, Tabasco, " +
  "para preparar tu casa a tiempo.";

// Vista previa al compartir (paso 5b). Estática a propósito: Facebook guarda la vista previa
// en caché, y una que mostrara el pronóstico podría enseñar un color viejo. Ningún texto de
// aquí puede mencionar el estado del tiempo (una prueba lo revisa).
export const COMPARTIR = {
  sitio: "Alertas Magallanes",
  subtitulo: "Pronóstico de lluvia y viento de 5 días · Sánchez Magallanes, Tabasco",
  textoAlternativo:
    "Alertas Magallanes: un semáforo con sus tres luces y la pregunta " +
    "«¿Viene mal tiempo a Magallanes?». Pronóstico de 5 días para Sánchez Magallanes, Tabasco.",
};

// Encabezados y etiquetas de la página.
export const PAGINA = {
  actualizado: (momento: string) => `Actualizado: ${momento}.`,
  queHacer: "Qué hacer",
  masConsejos: (cuantos: number) => `Más consejos (${cuantos})`,
  diaPorDia: "Día por día",
  puedeCambiar: "puede cambiar",
  emergencias: "Emergencias",
  // Franja fija mientras se usan datos de ejemplo (solo en desarrollo).
  franjaEjemplo: (escenario: string) => `DATOS DE EJEMPLO («${escenario}»). No es un pronóstico real.`,
};

// Días que suma la lluvia acumulada (el día y los anteriores). Candidato a ajustarse
// cuando se valide contra fechas de inundaciones reales.
export const DIAS_LLUVIA_ACUMULADA = 3;

// Hoy y los días siguientes que se consideran confiables; los demás "pueden cambiar".
export const DIAS_MAS_CONFIABLES = 3;

// mueveElColor: false → la variable se muestra como dato, pero no cuenta para el color.
// porValidar: true → umbral provisional; la página lo marca como "en prueba".
export const UMBRALES: Reglas = {
  lluvia: { amarillo: 50, rojo: 100, unidad: "mm", mueveElColor: true, porValidar: false },
  // Validar con la API histórica de Open-Meteo contra fechas de inundaciones del pueblo.
  lluvia3d: { amarillo: 100, rojo: 200, unidad: "mm", mueveElColor: true, porValidar: true },
  rachas: { amarillo: 50, rojo: 70, unidad: "km/h", mueveElColor: true, porValidar: false },
  // Dato secundario: cambiar mueveElColor a false para que solo se muestre.
  olas: { amarillo: 1.5, rojo: 2.5, unidad: "m", mueveElColor: true, porValidar: false },
};

// Clasificación de la lluvia acumulada en 24 horas. Cada categoría empieza en "más de"
// su límite: 25 mm exactos todavía son "lluvia" y 25.1 mm ya son "lluvia fuerte".
export const ESCALA_LLUVIA_24H = {
  fuente:
    "Secretaría de Marina, 'Clasificación de la precipitación acumulada en 24 horas para " +
    "pronósticos a corto y mediano plazo (24 a 96 horas)'; cita como fuente al Servicio " +
    "Meteorológico Nacional. Los avisos actuales del SMN usan los mismos rangos.",
  url: "https://meteorologia.semar.gob.mx/LLUVIA_SEMAR.pdf",
  fechaDocumento: "2015-06-10", // según los metadatos del PDF
  verificadoEl: "2026-11-05",
  categorias: [
    { masDe: 0, nombre: "lluvia" },
    { masDe: 25, nombre: "lluvia fuerte" },
    { masDe: 50, nombre: "lluvia muy fuerte" },
    { masDe: 75, nombre: "lluvia intensa" },
    { masDe: 150, nombre: "lluvia torrencial" },
    { masDe: 250, nombre: "lluvia extraordinaria" },
  ],
};

// Cómo se nombra cada variable en "faltan datos de ...".
export const NOMBRES: Record<Variable, string> = {
  lluvia: "lluvia",
  lluvia3d: "lluvia de 3 días",
  rachas: "rachas de viento",
  olas: "olas",
};

// Cómo se nombra cada variable en "Sin alertas de ...". La lluvia de un día y la de
// 3 días se dicen igual: para la gente las dos son "lluvia".
export const NOMBRES_SIN_ALERTA: Record<Variable, string> = {
  lluvia: "lluvia",
  lluvia3d: "lluvia",
  rachas: "viento",
  olas: "olas",
};

// Qué viene, en el resumen general ("Lluvia intensa y viento fuerte desde ...").
// `categoria` es la de la escala del SMN para la lluvia más alta entre los días con alerta.
export const QUE_VIENE: Record<Variable, (categoria: string | null) => string> = {
  lluvia: (categoria) => categoria ?? "lluvia",
  lluvia3d: () => "mucha lluvia acumulada",
  rachas: () => "viento fuerte",
  olas: () => "olas altas",
};

export type ContextoFrase = { valor: string; delDia: string; categoria: string | null };

// Explicación sencilla de una razón; `valor` ya viene formateado.
export const FRASES: Record<Variable, (c: ContextoFrase) => string> = {
  lluvia: ({ valor, categoria }) => `${mayuscula(categoria ?? "lluvia")}: ${valor} mm en el día`,
  lluvia3d: ({ valor, delDia }) =>
    `Lluvia ${delDia} y los ${DIAS_LLUVIA_ACUMULADA - 1} días anteriores: ${valor} mm`,
  rachas: ({ valor }) => `Rachas de viento de hasta ${valor} km/h`,
  olas: ({ valor }) => `Olas de hasta ${valor} m en el mar`,
};

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const PALABRA_NIVEL = { amarillo: "precaución", rojo: "peligro" };

export const TEXTO_EN_PRUEBA = "umbral en prueba";

// Nota al pie con los umbrales provisionales; `detalle` ya viene armado por variable.
export const NOTA_EN_PRUEBA = (detalle: string) =>
  `Umbrales en prueba: ${detalle}. Se ajustarán con datos de inundaciones reales del pueblo.`;

const PUEDE_CAMBIAR = "(puede cambiar)";

// Respuesta grande a la PREGUNTA, para los próximos días. El título expresa gravedad,
// no certeza; "posible" solo cuando lo peor está en los días que pueden cambiar.
export const RESPUESTA_GENERAL = {
  rojo: "SÍ, VIENE MAL TIEMPO FUERTE",
  amarillo: "SÍ, VIENE MAL TIEMPO",
  rojoPosible: "POSIBLE MAL TIEMPO FUERTE",
  amarilloPosible: "POSIBLE MAL TIEMPO",
  verde: "NO SE ESPERA MAL TIEMPO",
  verdeIncompleto: "PROBABLEMENTE NO",
  sinDatos: "NO SABEMOS",
  sinAlertas: (variables: string, dias: number) => `Sin alertas de ${variables} en los próximos ${dias} días.`,
  sinDatosDetalle: "No hay datos del pronóstico; revisa los avisos de Protección Civil.",
  puedeCambiar: PUEDE_CAMBIAR,
  // Cuando los días que pueden cambiar también traen alerta, pero no peor:
  // "seguir" si empieza justo al día siguiente; "volver" si hay un día tranquilo de por medio.
  podriaSeguir: (dias: string) => `Podría seguir ${dias} ${PUEDE_CAMBIAR}.`,
  podriaVolver: (dias: string) => `Podría volver ${dias} ${PUEDE_CAMBIAR}.`,
};

// Etiqueta de cada día en la lista de próximos días.
export const NIVELES_DIA = {
  verde: "Sin alertas",
  amarillo: "Precaución",
  rojo: "Peligro",
  sinDatos: "Sin datos",
};

export const FALTAN_DATOS = (faltan: string) => `Faltan datos de ${faltan}.`;
// En el resumen general, agrupado por días: "Faltan datos de olas para el sábado 8 y el domingo 9."
export const FALTAN_DATOS_PARA = (faltan: string, dias: string) => `Faltan datos de ${faltan} para ${dias}.`;
export const SIN_DATOS_PARA = (dias: string) => `No hay datos para ${dias}.`;
// En un día con alerta, lo que falta solo podría empeorar el color.
export const FALTAN_DATOS_PODRIA_SER_PEOR = (faltan: string) =>
  `Faltan datos de ${faltan}; podría ser peor.`;

// En la página, este consejo enlaza a la sección de emergencias.
export const CONSEJO_EMERGENCIAS = "Ten a la mano los números de emergencia.";

// Qué hacer, según el tipo de alerta. Se muestran como máximo `maximo` consejos; el resto
// queda en "Más consejos" (en la página) y no va en el mensaje de Facebook.
// El ORDEN de cada lista es la prioridad: para ajustarla tras validar con la comunidad,
// basta con reordenar.
// Las olas no tienen consejos propios todavía: faltan recomendaciones validadas para
// quienes viven cerca de la playa.
export const QUE_HACER = {
  maximo: 5,
  lluvia: [
    "Limpia desagües y canaletas.",
    "Sube del piso documentos, medicinas y aparatos; guarda los documentos en bolsas cerradas.",
    "No cruces calles ni arroyos con corriente, aunque parezcan poco profundos.",
    "Si tu casa se inunda seguido, platica con tu familia a dónde irían.",
  ],
  viento: [
    "Asegura techos, láminas y objetos sueltos que el viento pueda levantar.",
    "Aléjate de árboles, postes y cables.",
  ],
  // Útiles con cualquier alerta: ocupan los lugares que dejen libres los de arriba.
  generales: ["Ten agua potable, comida que no se eche a perder, linterna y pilas."],
  // Siempre visibles con cualquier alerta (los pide el SPEC). Van al final de la lista.
  siempre: ["Carga celulares y baterías.", CONSEJO_EMERGENCIAS],
};

// Mensaje para Facebook. Solo se publica cuando hay alerta, para que la gente no se
// acostumbre a leer avisos de buen tiempo y deje de leer los de mal tiempo.
export const MENSAJE = {
  lugar: "a Magallanes",
  fecha: (momento: string) => `Pronóstico del ${momento}.`,
  diaPorDia: "Día por día:",
  queHacer: "Qué hacer:",
  emergencias: "Emergencias:",
  enlace: "Pronóstico actualizado:",
  enlacePendiente: "[ENLACE PENDIENTE: no publicar sin el enlace]",
  // Distinto del AVISO_LEGAL de la página: en una publicación, "esta página" no aplica.
  avisoLegal: "Informativo; no sustituye los avisos de Protección Civil ni de Capitanía de Puerto.",
  atribucion: "Datos: Open-Meteo.com",
  // Lo dicen igual el script (npm run mensaje) y la página /mensaje.
  sinAlerta: "Sin alerta: hoy no se publica.",
};

// Página /mensaje, para copiar el mensaje desde el celular. No aparece en buscadores.
export const PAGINA_MENSAJE = {
  titulo: "Mensaje para Facebook",
  instrucciones: "Toca el botón para copiarlo y pégalo en Facebook.",
  datosDe: (momento: string) => `Datos del ${momento}.`,
  copiar: "Copiar mensaje",
  copiado: "Copiado",
  aMano: "No se pudo copiar solo. Mantén presionado el texto y elige «Copiar».",
  sinAlertaDetalle: "La respuesta de la página ahora es:",
  verPagina: "Ver la página",
};

export const NOTA_OLAS ="Olas: pronóstico en el mar, frente a la costa. No incluye la laguna.";

// Va arriba, justo debajo de la hora de actualización, para que se vea sin bajar.
export const AVISO_LEGAL =
  "Página informativa: no sustituye los avisos de Protección Civil ni de Capitanía de Puerto.";

// A partir de cuántas horas se advierte que el pronóstico es viejo.
// Con el monitor externo (UptimeRobot cada 5 minutos) y revalidate de 25 minutos, nadie
// debería ver una página de más de ~30 minutos. Si pasa de 1 hora es porque la
// regeneración falló (por ejemplo, Open-Meteo no respondió y Next siguió sirviendo la
// última versión buena) o porque es una copia guardada sin señal. El monitor no puede
// detectar eso: este aviso es lo que se lo dice a la gente.
export const HORAS_PRONOSTICO_VIEJO = 1;

// Al abrir sin señal una copia guardada de otro día. `fecha` ya viene formateada.
export const AVISO_DIA_ANTERIOR = (fecha: string) =>
  `Este pronóstico es del ${fecha}, no de hoy. No sabemos cómo están las condiciones hoy: ` +
  "vuelve a cargar la página cuando tengas señal.";

export const INSTRUCCIONES_INSTALAR =
  "Instálala en tu celular: en Android, menú ⋮ → Instalar app. En iPhone, Compartir → Agregar a inicio.";

export const AVISO_PRONOSTICO_VIEJO =
  `Este pronóstico tiene más de ${HORAS_PRONOSTICO_VIEJO === 1 ? "una hora" : `${HORAS_PRONOSTICO_VIEJO} horas`} ` +
  "y puede haber cambiado. Vuelve a cargar la página cuando tengas señal.";
