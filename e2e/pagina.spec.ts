// Estructura de la página. Como en sin-senal.spec.ts, la app usa el pronóstico real, así que
// estas pruebas revisan dónde y cómo se muestra la respuesta, no qué dice el pronóstico.

import { expect, test } from "@playwright/test";
import { PAGINA, PREGUNTA, RESPUESTA_GENERAL } from "../src/config/reglas.ts";

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
