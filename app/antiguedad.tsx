"use client";

// Único componente que corre en el navegador: "hace X horas" depende de la hora del
// celular, no de cuándo se generó la página. Sin JavaScript, la página sigue mostrando
// la hora exacta de actualización; esto solo la complementa.

import { useEffect, useState } from "react";
import { describirAntiguedad } from "../src/lib/tiempo.ts";
import { AVISO_PRONOSTICO_VIEJO } from "../src/config/reglas.ts";

export function Antiguedad({ generadoEn }: { generadoEn: string }) {
  // Empieza en null para que el HTML del servidor y el primer render del navegador
  // coincidan; la hora del celular se lee hasta después de montar.
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(intervalo);
  }, []);

  if (ahora === null) return null;

  const { texto, vieja } = describirAntiguedad(new Date(generadoEn), ahora);
  return (
    <>
      <p>{texto.charAt(0).toUpperCase() + texto.slice(1)}.</p>
      {vieja && (
        <p className="aviso-viejo" role="alert">
          {AVISO_PRONOSTICO_VIEJO}
        </p>
      )}
    </>
  );
}
