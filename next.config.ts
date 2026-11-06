import type { NextConfig } from "next";

const config: NextConfig = {
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
