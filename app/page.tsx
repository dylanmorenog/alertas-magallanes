// Página principal. Es un Server Component: consulta Open-Meteo y arma el HTML en el
// servidor, así el celular solo descarga el resultado.

import { obtenerPronostico } from "../src/lib/open-meteo.ts";
import { explicarRazon, notaUmbralesEnPrueba, respuestaDelDia, type Tono } from "../src/lib/respuesta.ts";
import { evaluarPronostico, queHacer, type DiaEvaluado } from "../src/lib/resumen.ts";
import { fechaEnMexico, fechaLarga, momentoLargo, nombreDelDia } from "../src/lib/tiempo.ts";
import { AVISO_LEGAL, INSTRUCCIONES_INSTALAR, NOTA_OLAS } from "../src/config/reglas.ts";
import { CONTACTOS } from "../src/config/contactos.ts";
import { Antiguedad, AvisoDiaAnterior } from "./antiguedad.tsx";

// Regenerar la página cada 30 minutos (ISR). Si Open-Meteo falla al regenerar,
// Next sigue sirviendo la última versión buena. Por eso aquí no atrapamos errores:
// una página de "sin datos" quedaría cacheada en lugar de la buena.
export const revalidate = 1800;

// El color nunca va solo: siempre con un ícono y una palabra.
const ICONOS: Record<Tono, string> = { verde: "✓", amarillo: "!", rojo: "✕", gris: "?" };

function Dia({
  datos,
  nombre,
  hoy,
  principal,
}: {
  datos: DiaEvaluado;
  nombre: string;
  hoy: string;
  principal: boolean;
}) {
  const { dia, evaluacion } = datos;
  const respuesta = respuestaDelDia(evaluacion);
  return (
    <article className={`dia tono-${respuesta.tono}${principal ? " principal" : ""}`}>
      <p className="nombre-dia">
        {nombre}
        {datos.puedeCambiar && " · puede cambiar"}
      </p>
      <p className="titulo">
        <span className="icono" aria-hidden="true">
          {ICONOS[respuesta.tono]}
        </span>
        {respuesta.titulo}
      </p>
      {respuesta.faltan && <p className="nota">{respuesta.faltan}</p>}
      {evaluacion.razones.length > 0 && (
        <ul className="razones">
          {evaluacion.razones.map((razon) => (
            <li key={razon.variable}>{explicarRazon(razon, { fecha: dia.fecha, hoy })}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default async function Pagina() {
  const generadoEn = new Date();
  const notaEnPrueba = notaUmbralesEnPrueba();
  const hoy = fechaEnMexico(generadoEn);

  // Elegimos "hoy" por fecha, no por posición en la lista.
  const dias = evaluarPronostico(
    (await obtenerPronostico()).filter((dia) => dia.fecha >= hoy),
    hoy,
  );

  const [deHoy, ...siguientes] = dias;
  if (deHoy === undefined || deHoy.dia.fecha !== hoy) {
    throw new Error(`El pronóstico no incluye el día de hoy (${hoy})`);
  }

  // Consejos según las alertas de cualquiera de los días: prepararse antes sirve.
  const consejos = queHacer(dias);

  return (
    <main>
      <AvisoDiaAnterior hoy={hoy} />

      <h1>¿Se puede salir a la laguna hoy?</h1>

      <Dia datos={deHoy} nombre={`Hoy, ${fechaLarga(hoy)}`} hoy={hoy} principal />

      <div className="actualizado">
        <p>Actualizado: {momentoLargo(generadoEn)}.</p>
        <Antiguedad generadoEn={generadoEn.toISOString()} hoy={hoy} />
      </div>

      {consejos.length > 0 && (
        <section className="que-hacer">
          <h2>Qué hacer</h2>
          <ul>
            {consejos.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Próximos días</h2>
        <div className="proximos">
          {siguientes.map((datos) => (
            <Dia
              key={datos.dia.fecha}
              datos={datos}
              nombre={nombreDelDia(datos.dia.fecha, hoy)}
              hoy={hoy}
              principal={false}
            />
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
        {notaEnPrueba && <p>{notaEnPrueba}</p>}
        <p>{AVISO_LEGAL}</p>
        <p>{INSTRUCCIONES_INSTALAR}</p>
        <p>
          Datos: <a href="https://open-meteo.com/">Open-Meteo.com</a>
        </p>
      </footer>
    </main>
  );
}
