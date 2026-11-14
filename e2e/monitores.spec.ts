// Los monitores de UptimeRobot leen el HTML de la página principal y buscan textos exactos
// (ver src/lib/monitores.test.ts). Esta prueba revisa ese mismo HTML: cada texto vigilado
// aparece solo cuando es el encabezado, y en ninguna otra parte. Si se colara en otro lugar
// (una etiqueta para compartir, un aviso), el monitor avisaría siempre.
//
// Como sin-senal.spec.ts, funciona con el pronóstico de ejemplo (local) y con el real (BASE_URL).

import { expect, test } from "@playwright/test";
import { RESPUESTA_GENERAL } from "../src/config/reglas.ts";

const VIGILADOS = [RESPUESTA_GENERAL.rojo, RESPUESTA_GENERAL.rojoPosible, RESPUESTA_GENERAL.sinDatos];

test("los textos que vigilan los monitores solo aparecen como encabezado", async ({ page, request }) => {
  const html = (await (await request.get("/")).text()).toLowerCase();

  await page.goto("/");
  const titulo = await page.locator(".respuesta .titulo").evaluate((el) => el.lastChild?.textContent ?? "");

  for (const texto of VIGILADOS) {
    // Sin distinguir mayúsculas, por si el monitor tampoco las distingue. Puede aparecer
    // dos veces: en el HTML visible y en los datos que React usa para hidratar la página.
    const veces = html.split(texto.toLowerCase()).length - 1;
    if (texto === titulo) expect(veces, texto).toBeGreaterThan(0);
    else expect(veces, `«${texto}» aparece en el HTML sin ser el encabezado`).toBe(0);
  }
});
