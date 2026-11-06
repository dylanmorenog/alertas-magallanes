import type { NextConfig } from "next";

const config: NextConfig = {
  // Los tipos los revisa `npm run check` antes de `next build` (ver el script "build").
  // Con TypeScript 7, Next ejecuta tsc de forma experimental y, si ese proceso termina mal,
  // falla sin mostrar por qué; con npm sí vemos el error o la señal que lo detuvo.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // El navegador debe revisar siempre si hay un service worker nuevo;
        // si lo cacheara, una corrección tardaría en llegar a los celulares.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default config;
