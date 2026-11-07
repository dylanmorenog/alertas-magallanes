// Imprime el mensaje para Facebook, listo para copiar.
// Uso: npm run -s mensaje | pbcopy   (en Mac lo deja en el portapapeles)
//
// El mensaje va a stdout y los avisos a stderr: así `| pbcopy` copia solo el mensaje,
// y los avisos se siguen viendo en la terminal.

import { obtenerPronostico } from "../src/lib/open-meteo.ts";
import { evaluarPronostico } from "../src/lib/resumen.ts";
import { mensajeFacebook } from "../src/lib/mensaje.ts";
import { fechaEnMexico } from "../src/lib/tiempo.ts";
import { URL_PUBLICA } from "../src/config/sitio.ts";
import { MENSAJE } from "../src/config/reglas.ts";

try {
  const generadoEn = new Date();
  const hoy = fechaEnMexico(generadoEn);
  const dias = evaluarPronostico(await obtenerPronostico(), hoy);
  const mensaje = mensajeFacebook({ dias, hoy, generadoEn, url: URL_PUBLICA });

  if (mensaje === null) {
    console.error(`${MENSAJE.sinAlerta} El detalle está en \`npm run pronostico\`.`);
  } else {
    if (URL_PUBLICA === null) {
      console.error("Aviso: falta URL_PUBLICA en src/config/sitio.ts; el mensaje dice [ENLACE PENDIENTE].");
    }
    console.log(mensaje);
  }
} catch (error) {
  console.error("No se pudo obtener el pronóstico:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
