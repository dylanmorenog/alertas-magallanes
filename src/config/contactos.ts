// Contactos de emergencia. Cada uno guarda su fuente y cuándo se verificó,
// para saber cuándo toca revisarlo otra vez. No agregar números sin verificar.
// Pendiente: teléfono de la Capitanía de Puerto de Sánchez Magallanes y de
// Protección Civil Tabasco (conseguirlos en persona y llamar para confirmar).

export type Contacto = {
  nombre: string;
  nombreCorto: string | null; // para el mensaje de Facebook; null si el número se explica solo
  numero: string;
  llamar: string | null; // valor para un enlace tel:, o null si no es un teléfono
  fuente: string;
  verificadoEl: string; // AAAA-MM-DD
};

export const CONTACTOS: Contacto[] = [
  {
    nombre: "Emergencias",
    nombreCorto: null,
    numero: "911",
    llamar: "911",
    fuente: "Número nacional de emergencias de México",
    verificadoEl: "2026-11-05",
  },
  {
    nombre: "Emergencias en el mar (Secretaría de Marina)",
    nombreCorto: "Marina",
    numero: "800 627 4621 (800 MARINA1)",
    llamar: "8006274621",
    fuente: "Comunicado oficial de SEMAR, 2023",
    verificadoEl: "2026-11-05",
  },
  {
    nombre: "Capitanía de Puerto de Sánchez Magallanes (radio)",
    nombreCorto: "Capitanía de Puerto, radio",
    numero: "VHF canal 16, las 24 horas",
    llamar: null,
    fuente: "Documento de SEMAR sin fecha; el canal 16 es el canal internacional de socorro",
    verificadoEl: "2026-11-05",
  },
];
