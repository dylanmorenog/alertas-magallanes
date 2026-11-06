// Página principal. Es un Server Component: consulta Open-Meteo y arma el HTML en el
// servidor, así el celular solo descarga el resultado.

import { obtenerPronostico, type PronosticoDia } from "../src/lib/open-meteo.ts";
import { evaluarDia, type Evaluacion } from "../src/lib/semaforo.ts";
import { explicarRazon, respuestaDelDia, type Respuesta, type Tono } from "../src/lib/respuesta.ts";
import { fechaEnMexico, fechaLarga, momentoLargo, nombreDelDia } from "../src/lib/tiempo.ts";
import { AVISO_LEGAL, INSTRUCCIONES_INSTALAR, NOTA_OLAS, QUE_HACER } from "../src/config/reglas.ts";
import { CONTACTOS } from "../src/config/contactos.ts";
import { Antiguedad, AvisoDiaAnterior } from "./antiguedad.tsx";

// Regenerar la página cada 30 minutos (ISR). Si Open-Meteo falla al regenerar,
// Next sigue sirviendo la última versión buena. Por eso aquí no atrapamos errores:
// una página de "sin datos" quedaría cacheada en lugar de la buena.
export const revalidate = 1800;

// El color nunca va solo: siempre con un ícono y una palabra.
const ICONOS: Record<Tono, string> = { verde: "✓", amarillo: "!", rojo: "✕", gris: "?" };

type DiaEvaluado = { dia: PronosticoDia; evaluacion: Evaluacion; respuesta: Respuesta };

function Dia({ datos, nombre, principal }: { datos: DiaEvaluado; nombre: string; principal: boolean }) {
  const { evaluacion, respuesta } = datos;
  return (
    <article className={`dia tono-${respuesta.tono}${principal ? " principal" : ""}`}>
      <p className="nombre-dia">{nombre}</p>
      <p className="titulo">
        <span className="icono" aria-hidden="true">
          {ICONOS[respuesta.tono]}
        </span>
        {respuesta.titulo}
      </p>
      <p>{respuesta.detalle}</p>
      {respuesta.nota && <p className="nota">{respuesta.nota}</p>}
      {evaluacion.razones.length > 0 && (
        <ul className="razones">
          {evaluacion.razones.map((razon) => (
            <li key={razon.variable}>{explicarRazon(razon)}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default async function Pagina() {
  const generadoEn = new Date();
  const hoy = fechaEnMexico(generadoEn);

  // Elegimos "hoy" por fecha, no por posición en la lista.
  const dias: DiaEvaluado[] = (await obtenerPronostico())
    .filter((dia) => dia.fecha >= hoy)
    .map((dia) => {
      const evaluacion = evaluarDia(dia);
      return { dia, evaluacion, respuesta: respuestaDelDia(evaluacion) };
    });

  const [deHoy, ...siguientes] = dias;
  if (deHoy === undefined || deHoy.dia.fecha !== hoy) {
    throw new Error(`El pronóstico no incluye el día de hoy (${hoy})`);
  }

  // Mostrar qué hacer si cualquiera de los 3 días tiene alerta: prepararse antes sirve.
  const hayAlerta = dias.some(({ evaluacion }) => evaluacion.nivel === "amarillo" || evaluacion.nivel === "rojo");

  return (
    <main>
      <AvisoDiaAnterior hoy={hoy} />

      <h1>¿Se puede salir a la laguna hoy?</h1>

      <Dia datos={deHoy} nombre={`Hoy, ${fechaLarga(hoy)}`} principal />

      <div className="actualizado">
        <p>Actualizado: {momentoLargo(generadoEn)}.</p>
        <Antiguedad generadoEn={generadoEn.toISOString()} hoy={hoy} />
      </div>

      {hayAlerta && (
        <section className="que-hacer">
          <h2>Qué hacer</h2>
          <ul>
            {QUE_HACER.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Próximos días</h2>
        <div className="proximos">
          {siguientes.map((datos) => (
            <Dia key={datos.dia.fecha} datos={datos} nombre={nombreDelDia(datos.dia.fecha, hoy)} principal={false} />
          ))}
        </div>
      </section>

      <section className="contactos">
        <h2>Emergencias</h2>
        <ul>
          {CONTACTOS.map((contacto) => (
            <li key={contacto.nombre}>
              {contacto.nombre}:{" "}
              {contacto.llamar ? (
                <a href={`tel:${contacto.llamar}`}>{contacto.numero}</a>
              ) : (
                <strong>{contacto.numero}</strong>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p>{NOTA_OLAS}</p>
        <p>{AVISO_LEGAL}</p>
        <p>{INSTRUCCIONES_INSTALAR}</p>
        <p>
          Datos: <a href="https://open-meteo.com/">Open-Meteo.com</a>
        </p>
      </footer>
    </main>
  );
}
