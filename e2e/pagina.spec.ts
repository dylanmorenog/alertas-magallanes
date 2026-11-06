// Estructura de la página. Como en sin-senal.spec.ts, la app usa el pronóstico real, así que
// estas pruebas revisan dónde y cómo se muestra la respuesta, no qué dice el pronóstico.

import { expect, test } from "@playwright/test";
import { AVISO_LEGAL, DESCRIPCION_SITIO, NIVELES_DIA, PAGINA, PREGUNTA, RESPUESTA_GENERAL } from "../src/config/reglas.ts";
import { URL_PUBLICA } from "../src/config/sitio.ts";

// Todos los títulos posibles de la respuesta general (los valores de texto, no las funciones).
const TITULOS = Object.values(RESPUESTA_GENERAL).filter((valor) => typeof valor === "string");

test("la pregunta va arriba y, justo debajo, una respuesta válida", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText(PREGUNTA);
  const respuesta = page.locator("h1 + .respuesta");
  await expect(respuesta).toBeVisible();

  // El último nodo del título es el texto; el primero es el ícono.
  const titulo = await respuesta.locator(".titulo").evaluate((el) => el.lastChild?.textContent);
  expect(TITULOS).toContain(titulo);
});

test("muestra 5 días y solo los días 4 y 5 dicen que pueden cambiar", async ({ page }) => {
  await page.goto("/");

  const dias = page.locator(".dias > article");
  await expect(dias).toHaveCount(5);
  await expect(dias.first().locator(".nombre-dia")).toHaveText("Hoy");

  for (let i = 0; i < 5; i++) {
    const nombre = dias.nth(i).locator(".nombre-dia");
    if (i >= 3) await expect(nombre).toContainText(PAGINA.puedeCambiar);
    else await expect(nombre).not.toContainText(PAGINA.puedeCambiar);
  }
});

// El servidor de pruebas se levanta con PRONOSTICO_DE_EJEMPLO=rojo (ver playwright.config.ts).
// En producción debe ignorarse, igual que cualquier intento de activarlo desde la URL.
test("en producción no se pueden activar los datos de ejemplo", async ({ page }) => {
  for (const ruta of ["/", "/?PRONOSTICO_DE_EJEMPLO=rojo", "/?ejemplo=rojo", "/?escenario=rojo"]) {
    await page.goto(ruta);
    await expect(page.getByRole("heading", { name: PREGUNTA })).toBeVisible();
    await expect(page.getByText("DATOS DE EJEMPLO")).toHaveCount(0);
  }
});

test("la vista previa al compartir apunta al sitio público y su imagen existe", async ({ page, request }) => {
  await page.goto("/");
  const meta = (propiedad: string) => page.locator(`meta[property="${propiedad}"]`).getAttribute("content");

  expect(await meta("og:title")).toBe(PREGUNTA);
  expect(await meta("og:description")).toBe(DESCRIPCION_SITIO);

  // Facebook necesita la dirección absoluta del sitio público, no la de localhost.
  expect(URL_PUBLICA).not.toBeNull();
  const imagen = new URL((await meta("og:image")) ?? "");
  expect(imagen.origin).toBe(URL_PUBLICA);

  // La misma ruta, pedida al servidor que se está probando.
  const respuesta = await request.get(imagen.pathname + imagen.search);
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toBe("image/png");
  // En un PNG, el ancho y el alto están en los bytes 16 a 23 (cabecera IHDR).
  const png = await respuesta.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});

// Facebook guarda la vista previa en caché: si mencionara el pronóstico, podría mostrar
// uno viejo. Se revisan todas las etiquetas que leen Facebook, WhatsApp y otras apps.
test("ninguna etiqueta para compartir menciona el estado del tiempo", async ({ page }) => {
  await page.goto("/");
  const textos = await page
    .locator('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]')
    .evaluateAll((etiquetas) => etiquetas.map((e) => (e.getAttribute("content") ?? "").toUpperCase()));
  expect(textos.length).toBeGreaterThan(5); // la prueba no pasa en vacío

  const prohibidos = [...TITULOS, ...Object.values(NIVELES_DIA)].map((t) => t.toUpperCase());
  for (const texto of textos) {
    for (const prohibido of prohibidos) expect(texto).not.toContain(prohibido);
  }
});

// Requisito 7: el aviso de que la página es informativa se ve sin bajar, tanto en el
// celular de las pruebas (Pixel 7) como en uno básico de 360×640.
for (const pantalla of [null, { width: 360, height: 640 }]) {
  test(`el aviso legal se ve sin bajar (${pantalla ? `${pantalla.width}×${pantalla.height}` : "Pixel 7"})`, async ({ page }) => {
    if (pantalla) await page.setViewportSize(pantalla);
    await page.goto("/");
    await expect(page.getByText(AVISO_LEGAL)).toBeInViewport({ ratio: 1 });
    // Y una sola vez: ya no se repite en el pie.
    await expect(page.getByText(AVISO_LEGAL)).toHaveCount(1);
  });
}
