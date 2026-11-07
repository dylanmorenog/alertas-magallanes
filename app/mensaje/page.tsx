// /mensaje: el mensaje para Facebook, listo para copiar desde el celular.
//
// - El texto sale de mensajeFacebook(), la misma función que usa `npm run mensaje`.
// - Se arma en cada visita (no se guarda la página): el monitor externo solo visita `/`, y
//   una página guardada podría entregar un mensaje de hace horas a quien va a publicar.
// - Aun así no consulta a Open-Meteo por visita: cargarPronostico() pide las mismas URLs
//   que `/`, y Next las responde desde la misma caché de datos (ver SEGUNDOS_CACHE).
// - No aparece en buscadores (noindex). No se enlaza desde la página principal.

import type { Metadata } from "next";
import { cargarPronostico } from "../../src/lib/cargar.ts";
import { mensajeFacebook } from "../../src/lib/mensaje.ts";
import { respuestaGeneral, type DiaEvaluado } from "../../src/lib/resumen.ts";
import { momentoLargo } from "../../src/lib/tiempo.ts";
import { MENSAJE, PAGINA, PAGINA_MENSAJE } from "../../src/config/reglas.ts";
import { URL_PUBLICA } from "../../src/config/sitio.ts";
import { CopiarMensaje } from "./copiar-mensaje.tsx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${PAGINA_MENSAJE.titulo} · Alertas Magallanes`,
  robots: { index: false, follow: false },
};

export default async function PaginaMensaje() {
  const { dias, hoy, generadoEn, ejemplo } = await cargarPronostico();
  const mensaje = mensajeFacebook({ dias, hoy, generadoEn, url: URL_PUBLICA });

  return (
    <>
      {ejemplo && (
        <p className="franja-ejemplo" role="note">
          {PAGINA.franjaEjemplo(ejemplo)}
        </p>
      )}

      <main className="pagina-mensaje">
        <h1>{PAGINA_MENSAJE.titulo}</h1>

        {mensaje ? (
          <>
            <p>
              {PAGINA_MENSAJE.instrucciones} {PAGINA_MENSAJE.datosDe(momentoLargo(generadoEn))}
            </p>
            <CopiarMensaje
              texto={mensaje}
              etiquetas={{
                copiar: PAGINA_MENSAJE.copiar,
                copiado: PAGINA_MENSAJE.copiado,
                aMano: PAGINA_MENSAJE.aMano,
                area: PAGINA_MENSAJE.titulo,
              }}
            />
          </>
        ) : (
          <SinAlerta dias={dias} hoy={hoy} generadoEn={generadoEn} />
        )}

        <p>
          <a href="/">{PAGINA_MENSAJE.verPagina}</a>
        </p>
      </main>
    </>
  );
}

// Igual que el script: sin alerta no hay mensaje, para que la gente no se acostumbre a
// leer avisos de buen tiempo. Se muestra la respuesta actual para saber por qué.
function SinAlerta({ dias, hoy, generadoEn }: { dias: DiaEvaluado[]; hoy: string; generadoEn: Date }) {
  const general = respuestaGeneral(dias, hoy);
  return (
    <>
      <p className="sin-alerta">{MENSAJE.sinAlerta}</p>
      <p>
        {PAGINA_MENSAJE.sinAlertaDetalle} <strong>{general.titulo}</strong>. {general.detalle}{" "}
        {PAGINA_MENSAJE.datosDe(momentoLargo(generadoEn))}
      </p>
    </>
  );
}
