// Qué pasa cuando alguien abre la página sin señal.
// Nota: el build consulta Open-Meteo de verdad, así que estas pruebas no dependen de
// valores concretos del pronóstico, solo de cómo se comporta la página.

import { expect, test, type Page } from "@playwright/test";
import { PREGUNTA } from "../src/config/reglas.ts";

// Abre la página con señal y espera a que el service worker termine de guardar todo.
async function visitarConSenal(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test("sin señal, muestra el pronóstico guardado", async ({ page, context }) => {
  await visitarConSenal(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: PREGUNTA })).toBeVisible();
  await expect(page.getByText(/^Actualizado:/)).toBeVisible();
  await expect(page.getByText(/no de hoy/)).toHaveCount(0);
});

test("sin señal al día siguiente, avisa arriba que no es de hoy", async ({ page, context }) => {
  await visitarConSenal(page);

  await context.setOffline(true);
  // Adelantar el reloj del navegador 24 horas: ya es "mañana" para el celular.
  await page.clock.install({ time: Date.now() + 24 * 60 * 60 * 1000 });
  await page.reload();

  const aviso = page.getByRole("alert").filter({ hasText: "no de hoy" });
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("No sabemos cómo están las condiciones hoy");

  // El aviso va antes que la pregunta principal.
  const avisoArriba = await aviso.evaluate((el) => {
    const titulo = document.querySelector("h1");
    return titulo !== null && Boolean(el.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(avisoArriba).toBe(true);
});

test("en la segunda visita solo el HTML viaja por la red", async ({ page, context }) => {
  await visitarConSenal(page);

  // Peticiones que el service worker hace a la red (las que salen del caché no cuentan).
  const aLaRed: string[] = [];
  context.on("request", (request) => {
    if (request.serviceWorker()) aLaRed.push(new URL(request.url()).pathname);
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: PREGUNTA })).toBeVisible();

  expect(aLaRed).toEqual(["/"]);
});
