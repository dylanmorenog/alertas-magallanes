// Service worker de Alertas Magallanes: permite abrir la página sin señal.
//
// Regla principal: la red siempre tiene prioridad. La copia guardada es solo un respaldo,
// y una respuesta con error nunca reemplaza a una copia buena.
//
// Está en JavaScript (no TypeScript) porque el navegador lo descarga tal cual, sin compilar.

// Cambiar VERSION hace que se borren los cachés de versiones anteriores al activarse.
const VERSION = "v1";
const CACHE = `alertas-${VERSION}`;

// Con mala señal, cuánto esperar a la red antes de mostrar la copia guardada.
const ESPERA_RED_MS = 5000;

const RECURSOS_FIJOS = ["/manifest.webmanifest", "/iconos/icono-192.png", "/iconos/icono-512.png"];

const SIN_CONEXION = `<!doctype html>
<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sin conexión · Alertas Magallanes</title>
<body style="font-family: system-ui, sans-serif; padding: 1rem; font-size: 1.125rem">
<h1>Sin conexión</h1>
<p>No hay señal y todavía no hay un pronóstico guardado en este celular.</p>
<p>Emergencias: <a href="tel:911">911</a></p>
</body></html>`;

// Instalar: guardar la página y todo lo que necesita para mostrarse.
// La primera visita ocurre antes de que el service worker exista, así que sus archivos
// no pasaron por aquí; por eso los buscamos en el HTML y los guardamos ahora (la mayoría
// sale del caché del navegador, sin gastar datos). Los íconos y el manifest no hacen falta
// para mostrar la página: se guardan cuando el navegador los pida.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const pagina = await fetch("/", { cache: "no-store" });
      if (!pagina.ok) throw new Error(`No se pudo guardar la página: ${pagina.status}`);
      const html = await pagina.clone().text();
      // Los scripts "noModule" son polyfills para navegadores antiguos; los actuales nunca
      // los cargan, así que guardarlos solo gastaría datos (unos 40 KB).
      const soloAntiguos = new Set(
        [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*noModule/gi)].map((m) => m[1]),
      );
      const recursos = new Set(
        (html.match(/\/_next\/static\/[^"'\\\s]+\.(?:js|css)/g) ?? []).filter((r) => !soloAntiguos.has(r)),
      );
      await cache.addAll([...recursos]);
      await cache.put("/", pagina);
      await self.skipWaiting();
    })(),
  );
});

// Activar: borrar cachés de versiones anteriores y tomar control de las pestañas abiertas.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/") {
    // Se clona una sola vez, aquí: una copia para la pestaña y otra para el caché.
    const red = fetch(request).then((respuesta) => ({
      paraPagina: respuesta,
      paraCache: respuesta.ok ? respuesta.clone() : null,
    }));
    event.respondWith(paginaConRespaldo(red));
    // Aunque la red llegue después del límite, guardamos la copia nueva para la próxima vez.
    event.waitUntil(guardarPagina(red));
    return;
  }

  // Los archivos de /_next/static llevan un hash en el nombre: si el contenido cambia,
  // cambia el nombre. Por eso es seguro servirlos del caché sin preguntar a la red.
  if (url.pathname.startsWith("/_next/static/") || RECURSOS_FIJOS.includes(url.pathname)) {
    event.respondWith(cachePrimero(request));
  }
  // Todo lo demás pasa directo a la red, sin intervenir.
});

async function paginaConRespaldo(red) {
  const limite = new Promise((resolver) => setTimeout(resolver, ESPERA_RED_MS, null));
  try {
    const ganador = await Promise.race([red, limite]);
    if (ganador && ganador.paraPagina.ok) return ganador.paraPagina;

    // La red tardó demasiado o respondió con error: preferimos la copia buena.
    const guardada = await caches.match("/");
    if (guardada) return guardada;

    // Sin copia guardada: no queda más que lo que diga la red, aunque tarde.
    return (await red).paraPagina;
  } catch {
    // Sin conexión.
    const guardada = await caches.match("/");
    if (guardada) return guardada;
    return new Response(SIN_CONEXION, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function guardarPagina(red) {
  try {
    const { paraCache } = await red;
    if (paraCache) await (await caches.open(CACHE)).put("/", paraCache);
  } catch {
    // Sin conexión: se conserva la copia anterior.
  }
}

async function cachePrimero(request) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) await cache.put(request, respuesta.clone());
  return respuesta;
}
