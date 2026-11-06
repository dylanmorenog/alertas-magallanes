// Eventos reales (inundaciones o daños) para el backtesting. Los datos viven en
// datos/eventos.json: son datos que se irán agregando, no código.
//
// Se validan al cargarlos: un evento mal escrito (una fecha "2026-10-7", una fuente sin
// enlace) debe detener el script con un mensaje claro, no producir un resultado falso.
//
// Cómo agregar un evento:
// - `fecha` es el PRIMER DÍA CON DAÑOS O INUNDACIÓN; `hasta`, el último (o null).
// - `alcance` dice qué tan cerca del pueblo se confirmó. Un evento de "tabasco" sin alerta
//   local no prueba que el umbral esté mal: pudo llover en otro lado o venir por los ríos.
// - Cada fuente con su enlace. No agregar eventos sin fuente.

export type Fuente = { nombre: string; url: string };

export type Evento = {
  id: string;
  fecha: string; // AAAA-MM-DD
  hasta: string | null; // AAAA-MM-DD, o null si fue un solo día o no se sabe
  descripcion: string;
  alcance: "magallanes" | "cardenas" | "tabasco";
  fuentes: Fuente[];
  verificadoEl: string; // AAAA-MM-DD
  notas: string | null;
};

const ALCANCES = ["magallanes", "cardenas", "tabasco"];

// Fecha de calendario válida: con el formato correcto y que exista (no "2026-02-30").
function esFecha(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function texto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function validarEventos(datos: unknown): Evento[] {
  if (!Array.isArray(datos)) throw new Error("eventos.json debe ser una lista de eventos.");
  const errores: string[] = [];
  const ids = new Set<string>();

  datos.forEach((e, i) => {
    const donde = `evento ${i + 1}${e && texto(e.id) ? ` («${e.id}»)` : ""}`;
    const error = (mensaje: string) => errores.push(`${donde}: ${mensaje}`);
    if (typeof e !== "object" || e === null) return error("no es un objeto");

    if (!texto(e.id)) error("falta `id`");
    else if (ids.has(e.id)) error("`id` repetido");
    else ids.add(e.id);

    if (!esFecha(e.fecha)) error("`fecha` debe ser AAAA-MM-DD");
    if (e.hasta !== null && !esFecha(e.hasta)) error("`hasta` debe ser AAAA-MM-DD o null");
    if (esFecha(e.fecha) && esFecha(e.hasta) && e.hasta < e.fecha) error("`hasta` es anterior a `fecha`");
    if (!texto(e.descripcion)) error("falta `descripcion`");
    if (!ALCANCES.includes(e.alcance)) error(`\`alcance\` debe ser ${ALCANCES.join(", ")}`);
    if (!esFecha(e.verificadoEl)) error("`verificadoEl` debe ser AAAA-MM-DD");
    if (e.notas !== null && !texto(e.notas)) error("`notas` debe ser texto o null");

    if (!Array.isArray(e.fuentes) || e.fuentes.length === 0) error("necesita al menos una fuente");
    else
      e.fuentes.forEach((f: { nombre?: unknown; url?: unknown } | null, j: number) => {
        if (!f || !texto(f.nombre)) error(`fuente ${j + 1}: falta \`nombre\``);
        if (!f || typeof f.url !== "string" || !f.url.startsWith("https://")) {
          error(`fuente ${j + 1}: \`url\` debe empezar con https://`);
        }
      });
  });

  if (errores.length > 0) throw new Error(`datos/eventos.json tiene errores:\n- ${errores.join("\n- ")}`);
  return datos as Evento[];
}
