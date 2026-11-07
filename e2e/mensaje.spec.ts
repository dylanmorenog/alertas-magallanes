// /mensaje en producción. Usa el pronóstico real: casi siempre no hay alerta, así que se
// prueba la estructura en los dos casos. El botón de copiar se prueba con datos de ejemplo
// en mensaje.ejemplo.spec.ts.

import { expect, test } from "@playwright/test";
import { MENSAJE, PAGINA_MENSAJE } from "../src/config/reglas.ts";
import { URL_PUBLICA } from "../src/config/sitio.ts";

test("no aparece en buscadores", async ({ page }) => {
  await page.goto("/mensaje");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
  expect(robots).toContain("nofollow");
});

test("muestra el mensaje con su botón, o dice que hoy no se publica", async ({ page }) => {
  const respuesta = await page.goto("/mensaje");
  expect(respuesta?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText(PAGINA_MENSAJE.titulo);

  const hayMensaje = (await page.locator("textarea.mensaje-texto").count()) === 1;
  if (hayMensaje) {
    const texto = await page.locator("textarea.mensaje-texto").inputValue();
    expect(texto).toContain(`${MENSAJE.enlace} ${URL_PUBLICA}`);
    expect(texto).toContain(MENSAJE.emergencias);
    expect(texto).toContain(MENSAJE.atribucion);
    await expect(page.getByRole("button", { name: PAGINA_MENSAJE.copiar })).toBeVisible();
  } else {
    await expect(page.getByText(MENSAJE.sinAlerta)).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(0);
  }
});

test("en producción no se pueden activar los datos de ejemplo", async ({ page }) => {
  for (const ruta of ["/mensaje", "/mensaje?PRONOSTICO_DE_EJEMPLO=rojo", "/mensaje?ejemplo=rojo"]) {
    await page.goto(ruta);
    await expect(page.locator("h1")).toHaveText(PAGINA_MENSAJE.titulo);
    await expect(page.getByText("DATOS DE EJEMPLO")).toHaveCount(0);
  }
});

test("la página principal no enlaza a /mensaje", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/mensaje"]')).toHaveCount(0);
});
