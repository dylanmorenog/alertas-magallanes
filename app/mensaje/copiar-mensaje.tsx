"use client";

// El texto del mensaje y el botón de copiar. Es el único JavaScript que esta página manda
// al celular. Los textos llegan como props desde el servidor: importar reglas.ts aquí
// metería todos los textos de la app en el JavaScript del navegador.
// Sin JavaScript, el texto se ve igual y se puede seleccionar a mano.

import { useRef, useState } from "react";
import { copiarTexto, type ResultadoCopia } from "../../src/lib/copiar.ts";

const MS_COPIADO = 2000;

export function CopiarMensaje({
  texto,
  etiquetas,
}: {
  texto: string;
  etiquetas: { copiar: string; copiado: string; aMano: string; area: string };
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [estado, setEstado] = useState<ResultadoCopia | "listo">("listo");

  // Seleccionar todo el texto. En iPhone, select() solo no basta: hace falta
  // setSelectionRange, y el campo de solo lectura evita que se abra el teclado.
  function seleccionar() {
    const campo = area.current;
    if (!campo) return;
    campo.focus();
    campo.select();
    campo.setSelectionRange(0, campo.value.length);
  }

  async function copiar() {
    const resultado = await copiarTexto(texto, {
      portapapeles: navigator.clipboard,
      seleccionarYCopiar: () => {
        seleccionar();
        return document.execCommand("copy");
      },
    });
    if (resultado === "a-mano") seleccionar();
    setEstado(resultado);
    if (resultado === "copiado") setTimeout(() => setEstado("listo"), MS_COPIADO);
  }

  return (
    <>
      <textarea
        ref={area}
        className="mensaje-texto"
        readOnly
        value={texto}
        rows={texto.split("\n").length}
        aria-label={etiquetas.area}
      />
      <button type="button" className="boton-copiar" onClick={copiar}>
        {estado === "copiado" ? `✓ ${etiquetas.copiado}` : etiquetas.copiar}
      </button>
      {/* aria-live: un lector de pantalla anuncia el resultado. */}
      <p className="nota-copia" aria-live="polite">
        {estado === "a-mano" ? etiquetas.aMano : ""}
      </p>
    </>
  );
}
