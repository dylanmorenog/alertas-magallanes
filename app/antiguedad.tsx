"use client";

// Componentes que dependen de la hora del celular, no de cuándo se generó la página.
// Sin JavaScript, la página sigue mostrando la hora exacta de actualización; esto la complementa.

import { useEffect, useState } from "react";
import { describirAntiguedad, esDeUnDiaAnterior, fechaLarga } from "../src/lib/tiempo.ts";
import { AVISO_DIA_ANTERIOR, AVISO_PRONOSTICO_VIEJO } from "../src/config/reglas.ts";

// La hora del celular, actualizada cada minuto. Empieza en null para que el HTML del
// servidor y el primer render del navegador coincidan; se lee hasta después de montar.
function useAhora(): Date | null {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  return ahora;
}

// Aviso grande arriba de todo cuando la página guardada es de un día anterior.
export function AvisoDiaAnterior({ hoy }: { hoy: string }) {
  const ahora = useAhora();
  if (ahora === null || !esDeUnDiaAnterior(hoy, ahora)) return null;

  return (
    <p className="aviso-dia-anterior" role="alert">
      {AVISO_DIA_ANTERIOR(fechaLarga(hoy))}
    </p>
  );
}

export function Antiguedad({ generadoEn, hoy }: { generadoEn: string; hoy: string }) {
  const ahora = useAhora();
  if (ahora === null) return null;

  const { texto, vieja } = describirAntiguedad(new Date(generadoEn), ahora);
  // Si es de un día anterior, el aviso de arriba ya lo dice; no lo repetimos.
  const mostrarAviso = vieja && !esDeUnDiaAnterior(hoy, ahora);

  return (
    <>
      <p>{texto.charAt(0).toUpperCase() + texto.slice(1)}.</p>
      {mostrarAviso && (
        <p className="aviso-viejo" role="alert">
          {AVISO_PRONOSTICO_VIEJO}
        </p>
      )}
    </>
  );
}
