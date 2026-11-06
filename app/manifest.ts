// Manifest de la PWA: lo que el celular necesita para instalar la página como app.
// Next lo sirve en /manifest.webmanifest.

import type { MetadataRoute } from "next";
import { DESCRIPCION_SITIO } from "../src/config/reglas.ts";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alertas Magallanes",
    short_name: "Magallanes",
    description: DESCRIPCION_SITIO,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b3d5c",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
