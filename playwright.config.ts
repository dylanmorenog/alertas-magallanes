// Pruebas de punta a punta: un navegador real contra la app.
//
// Dos proyectos:
// - "produccion": la app construida en modo producción (el service worker solo se
//   registra en producción). Es donde se prueba casi todo.
// - "ejemplo": un servidor de desarrollo con el escenario de ejemplo "rojo", solo para los
//   archivos *.ejemplo.spec.ts. Sirve para probar /mensaje con un mensaje de verdad: en
//   producción casi siempre está en verde y no hay mensaje que copiar.
//
// Por defecto levanta los dos servidores en local. Con BASE_URL prueba un sitio ya
// desplegado, sin levantar nada y solo con el proyecto "produccion":
//   BASE_URL=https://... npm run e2e

import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3200;
const PUERTO_EJEMPLO = 3201;
const BASE_URL = process.env.BASE_URL;

// El servidor de producción se construye y se levanta con un escenario de ejemplo activado a
// propósito: en producción debe ignorarse. Así las pruebas confirman que, aunque alguien
// ponga la variable en Railway, el sitio muestra el pronóstico real (ver e2e/pagina.spec.ts).
const ESCENARIO = "PRONOSTICO_DE_EJEMPLO=rojo";

const celular = devices["Pixel 7"]; // un Android de gama media, como el de la mayoría en el pueblo

export default defineConfig({
  testDir: "e2e",
  projects: [
    {
      name: "produccion",
      testIgnore: /\.ejemplo\.spec\.ts$/,
      use: { ...celular, baseURL: BASE_URL ?? `http://localhost:${PUERTO}` },
    },
    ...(BASE_URL
      ? []
      : [
          {
            name: "ejemplo",
            testMatch: /\.ejemplo\.spec\.ts$/,
            use: { ...celular, baseURL: `http://localhost:${PUERTO_EJEMPLO}` },
          },
        ]),
  ],
  webServer: BASE_URL
    ? undefined
    : [
        {
          command: `${ESCENARIO} npm run build && ${ESCENARIO} npx next start -p ${PUERTO}`,
          url: `http://localhost:${PUERTO}`,
          timeout: 180_000,
          reuseExistingServer: false,
        },
        {
          command: `${ESCENARIO} npx next dev -p ${PUERTO_EJEMPLO}`,
          url: `http://localhost:${PUERTO_EJEMPLO}/mensaje`,
          timeout: 180_000,
          reuseExistingServer: false,
        },
      ],
});
