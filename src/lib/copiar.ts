// Copiar texto al portapapeles en celulares, con respaldo para navegadores viejos o
// metidos dentro de otras apps (por ejemplo, el navegador interno de Facebook).
// Recibe lo que necesita del navegador como parámetros para poder probarla sin navegador.

export type ResultadoCopia = "copiado" | "a-mano";

export type Entorno = {
  // navigator.clipboard: existe en Safari de iPhone (13.4+) y Chrome de Android, solo con
  // HTTPS (o localhost) y al tocar un botón. Puede no existir.
  portapapeles?: { writeText(texto: string): Promise<void> };
  // Respaldo: seleccionar el texto en pantalla y usar document.execCommand("copy").
  // Está marcado como obsoleto, pero sigue funcionando donde el portapapeles moderno no.
  seleccionarYCopiar: () => boolean;
};

// 1. Portapapeles moderno. 2. Seleccionar y copiar. 3. Si nada funciona, "a-mano": la
// página deja el texto seleccionado y pide mantenerlo presionado para copiarlo.
export async function copiarTexto(texto: string, entorno: Entorno): Promise<ResultadoCopia> {
  if (entorno.portapapeles) {
    try {
      await entorno.portapapeles.writeText(texto);
      return "copiado";
    } catch {
      // Sin permiso o no disponible aquí: se intenta el respaldo.
    }
  }
  try {
    if (entorno.seleccionarYCopiar()) return "copiado";
  } catch {
    // Tampoco: queda copiar a mano.
  }
  return "a-mano";
}
