// Pruebas de punta a punta: un navegador real contra la app construida en modo producción
// (el service worker solo se registra en producción).
//
// Por defecto construye y levanta la app en local. Con BASE_URL prueba un sitio ya
// desplegado, sin levantar nada: BASE_URL=https://... npm run e2e

import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3200;
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  use: {
    ...devices["Pixel 7"], // un Android de gama media, como el de la mayoría en el pueblo
    baseURL: BASE_URL ?? `http://localhost:${PUERTO}`,
  },
  webServer: BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PUERTO}`,
        url: `http://localhost:${PUERTO}`,
        timeout: 180_000,
        reuseExistingServer: false,
      },
});
