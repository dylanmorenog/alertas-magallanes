// /mensaje con el escenario de ejemplo "rojo" (servidor de desarrollo; ver playwright.config).
// Comprueba que el texto es el de mensajeFacebook() y que el botón copia exactamente eso.

import { expect, test } from "@playwright/test";
import { mensajeFacebook } from "../src/lib/mensaje.ts";
import { pronosticoDeEjemplo } from "../src/lib/ejemplos.ts";
import { evaluarPronostico } from "../src/lib/resumen.ts";
import { fechaEnMexico } from "../src/lib/tiempo.ts";
import { MENSAJE, PAGINA_MENSAJE } from "../src/config/reglas.ts";
import { URL_PUBLICA } from "../src/config/sitio.ts";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

// Lo que debe decir el mensaje, armado con la misma función que el script. La línea de la
// fecha depende de la hora exacta del servidor, así que se compara aparte.
function esperado(): string[] {
  const hoy = fechaEnMexico(new Date());
  const dias = evaluarPronostico(pronosticoDeEjemplo("rojo", hoy), hoy);
  return (mensajeFacebook({ dias, hoy, generadoEn: new Date(), url: URL_PUBLICA }) ?? "").split("\n");
}

const sinFecha = (lineas: string[]) => lineas.filter((l) => !l.startsWith("Pronóstico de "));

test("el texto es el mismo que genera mensajeFacebook()", async ({ page }) => {
  await page.goto("/mensaje");
  const texto = await page.locator("textarea.mensaje-texto").inputValue();
  expect(sinFecha(texto.split("\n"))).toEqual(sinFecha(esperado()));
  expect(texto).toMatch(/^Pronóstico de las? \d{1,2}:\d{2} [ap]\.m\. del .+$/m);
  await expect(page.getByText("DATOS DE EJEMPLO")).toBeVisible(); // en desarrollo sí se avisa
});

test("el botón copia el mensaje y dice «Copiado»", async ({ page }) => {
  await page.goto("/mensaje");
  const texto = await page.locator("textarea.mensaje-texto").inputValue();
  const boton = page.getByRole("button", { name: PAGINA_MENSAJE.copiar });

  await boton.click();
  await expect(page.getByRole("button", { name: PAGINA_MENSAJE.copiado })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(texto);

  // Después de unos segundos vuelve a decir "Copiar mensaje", para poder copiar otra vez.
  await expect(boton).toBeVisible({ timeout: 4000 });
});

test("sin portapapeles moderno (navegadores dentro de otras apps), copia con el respaldo", async ({ page }) => {
  // Se quita navigator.clipboard antes de cargar la página, guardando una referencia
  // solo para leer el resultado en la prueba.
  await page.addInitScript(() => {
    (window as unknown as { __portapapeles: Clipboard }).__portapapeles = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await page.goto("/mensaje");
  const texto = await page.locator("textarea.mensaje-texto").inputValue();

  await page.getByRole("button", { name: PAGINA_MENSAJE.copiar }).click();
  await expect(page.getByRole("button", { name: PAGINA_MENSAJE.copiado })).toBeVisible();
  const copiado = await page.evaluate(() =>
    (window as unknown as { __portapapeles: Clipboard }).__portapapeles.readText(),
  );
  expect(copiado).toBe(texto);
  expect(copiado).toContain(MENSAJE.emergencias);
});

// El mensaje va sin números, pero la página principal los conserva.
test("la página principal sigue mostrando los números", async ({ page }) => {
  await page.goto("/");
  const texto = await page.locator("main").innerText();
  expect(texto).toMatch(/\d+ mm/);
  expect(texto).toMatch(/\d+ km\/h/);
  expect(texto).toContain("umbral en prueba");
});
