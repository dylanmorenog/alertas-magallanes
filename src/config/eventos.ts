// Eventos reales (inundaciones o daños) para el backtesting de los umbrales.
// Uso: npm run backtesting
//
// Cómo agregar un evento:
// - `desde` es el PRIMER DÍA CON DAÑOS O INUNDACIÓN, no el día en que empezó a llover:
//   la anticipación se mide contra esa fecha.
// - `alcance` dice qué tan cerca del pueblo se confirmó. Un evento de "tabasco" sin alerta
//   local no prueba que el umbral esté mal: pudo llover en otro lado o venir por los ríos.
// - Igual que en contactos.ts: cada evento lleva su fuente y cuándo se verificó. No agregar
//   eventos sin fuente.

export type Evento = {
  id: string;
  nombre: string;
  desde: string; // AAAA-MM-DD, primer día con daños o inundación
  hasta: string | null; // último día, si se conoce
  tipo: "inundacion" | "danos";
  alcance: "magallanes" | "cardenas" | "tabasco";
  fuente: string;
  url: string;
  verificadoEl: string; // AAAA-MM-DD
  notas: string | null;
};

export const EVENTOS: Evento[] = [
  {
    id: "2020-11-eta-frente-frio-11",
    nombre: "Inundaciones en Tabasco por Eta y el frente frío 11",
    desde: "2020-11-02",
    hasta: null,
    tipo: "inundacion",
    alcance: "tabasco",
    fuente:
      "Excélsior, 9 nov 2020: declaratoria de emergencia para Huimanguillo y Teapa " +
      "«por inundaciones fluvial y pluvial ocurridas el 2 de noviembre de 2020».",
    url: "https://www.excelsior.com.mx/nacional/emiten-declaratorias-de-emergencia-para-chiapas-y-tabasco/1415927",
    verificadoEl: "2026-11-06",
    notas:
      "Evento de prueba. Falta confirmar fecha y daños en Sánchez Magallanes (Cárdenas). " +
      "La inundación fue en buena parte fluvial (ríos y desfogue de la presa Peñitas): " +
      "la lluvia local puede no reflejarla.",
  },
];
