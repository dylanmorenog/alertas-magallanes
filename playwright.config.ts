// Pruebas de punta a punta: un navegador real contra la app construida en modo producción
// (el service worker solo se registra en producción).

import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3200;

export default defineConfig({
  testDir: "e2e",
  use: {
    ...devices["Pixel 7"], // un Android de gama media, como el de la mayoría en el pueblo
    baseURL: `http://localhost:${PUERTO}`,
  },
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
