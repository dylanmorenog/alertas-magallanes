// Página principal. Es un Server Component: consulta Open-Meteo y arma el HTML en el
// servidor, así el celular solo descarga el resultado.
//
// Orden pensado para quien llega desde Facebook con mala señal: primero la pregunta y su
// respuesta, luego cuándo se actualizó, qué hacer y, al final, el detalle día por día.

import { obtenerPronostico } from "../src/lib/open-meteo.ts";
import { escenarioDeEjemplo, pronosticoDeEjemplo } from "../src/lib/ejemplos.ts";
import { explicarRazon, notaUmbralesEnPrueba, respuestaDelDia, type Tono } from "../src/lib/respuesta.ts";
import {
  evaluarPronostico,
  queHacer,
  respuestaGeneral,
  type DiaEvaluado,
  type RespuestaGeneral,
} from "../src/lib/resumen.ts";
import { fechaEnMexico, momentoLargo, nombreDelDia } from "../src/lib/tiempo.ts";
import {
  AVISO_LEGAL,
  CONSEJO_EMERGENCIAS,
  INSTRUCCIONES_INSTALAR,
  NOTA_OLAS,
  PAGINA,
  PREGUNTA,
} from "../src/config/reglas.ts";
import { CONTACTOS } from "../src/config/contactos.ts";
import { Antiguedad, AvisoDiaAnterior } from "./antiguedad.tsx";

// Regenerar la página cada 30 minutos (ISR). Si Open-Meteo falla al regenerar,
// Next sigue sirviendo la última versión buena. Por eso aquí no atrapamos errores:
// una página de "sin datos" quedaría cacheada en lugar de la buena.
export const revalidate = 1800;

// El color nunca va solo: siempre con un ícono y una palabra.
const ICONOS: Record<Tono, string> = { verde: "✓", amarillo: "!", rojo: "✕", gris: "?" };

// La respuesta grande a la pregunta. Sale de la misma función que el mensaje de Facebook:
// la página y la publicación no pueden decir cosas distintas.
function Respuesta({ general }: { general: RespuestaGeneral }) {
  return (
    <div className={`respuesta tono-${general.tono}`}>
      <p className="titulo">
        <span className="icono" aria-hidden="true">
          {ICONOS[general.tono]}
        </span>
        {general.titulo}
      </p>
      <p className="detalle">{general.detalle}</p>
      {general.nota && <p className="nota">{general.nota}</p>}
    </div>
  );
}

// Un consejo; el de los números de emergencia enlaza a esa sección.
function Consejo({ texto }: { texto: string }) {
  return <li>{texto === CONSEJO_EMERGENCIAS ? <a href="#emergencias">{texto}</a> : texto}</li>;
}

// Tarjeta de un día. Hoy usa la misma tarjeta que los demás: la respuesta general ya
// cumple el papel de "lo más importante".
function Dia({ datos, hoy }: { datos: DiaEvaluado; hoy: string }) {
  const { dia, evaluacion } = datos;
  const respuesta = respuestaDelDia(evaluacion);
  return (
    <article className={`dia tono-${respuesta.tono}`}>
      <p className="nombre-dia">
        {nombreDelDia(dia.fecha, hoy)}
        {datos.puedeCambiar && ` · ${PAGINA.puedeCambiar}`}
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

  // Datos de ejemplo: solo en desarrollo y solo con la variable de entorno (ver ejemplos.ts).
  // En producción esto siempre es null, sin importar la URL ni las variables de Railway.
  const ejemplo = escenarioDeEjemplo({
    nodeEnv: process.env.NODE_ENV,
    escenario: process.env.PRONOSTICO_DE_EJEMPLO,
  });
  const pronostico = ejemplo ? pronosticoDeEjemplo(ejemplo, hoy) : await obtenerPronostico();

  // Elegimos "hoy" por fecha, no por posición en la lista.
  const dias = evaluarPronostico(
    pronostico.filter((dia) => dia.fecha >= hoy),
    hoy,
  );
  if (dias[0]?.dia.fecha !== hoy) {
    throw new Error(`El pronóstico no incluye el día de hoy (${hoy})`);
  }

  const general = respuestaGeneral(dias, hoy);
  // Consejos según las alertas de cualquiera de los días: prepararse antes sirve.
  const consejos = queHacer(dias);

  return (
    <>
      {ejemplo && (
        <p className="franja-ejemplo" role="note">
          {PAGINA.franjaEjemplo(ejemplo)}
        </p>
      )}

      <main>
        <AvisoDiaAnterior hoy={hoy} />

        <h1>{PREGUNTA}</h1>
        <Respuesta general={general} />

        <div className="actualizado">
          <p>{PAGINA.actualizado(momentoLargo(generadoEn))}</p>
          <Antiguedad generadoEn={generadoEn.toISOString()} hoy={hoy} />
        </div>

        {/* Arriba y con el color normal del texto: tiene que verse sin bajar. */}
        <p className="aviso-legal">{AVISO_LEGAL}</p>

        {consejos.principales.length > 0 && (
          <section className="que-hacer">
            <h2>{PAGINA.queHacer}</h2>
            <ul>
              {consejos.principales.map((texto) => (
                <Consejo key={texto} texto={texto} />
              ))}
            </ul>
            {/* <details> se abre con un toque y no necesita JavaScript. */}
            {consejos.mas.length > 0 && (
              <details>
                <summary>{PAGINA.masConsejos(consejos.mas.length)}</summary>
                <ul>
                  {consejos.mas.map((texto) => (
                    <Consejo key={texto} texto={texto} />
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        <section>
          <h2>{PAGINA.diaPorDia}</h2>
          <div className="dias">
            {dias.map((datos) => (
              <Dia key={datos.dia.fecha} datos={datos} hoy={hoy} />
            ))}
          </div>
        </section>

        <section className="contactos" id="emergencias">
          <h2>{PAGINA.emergencias}</h2>
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
          <p>{INSTRUCCIONES_INSTALAR}</p>
          <p>
            Datos: <a href="https://open-meteo.com/">Open-Meteo.com</a>
          </p>
        </footer>
      </main>
    </>
  );
}
