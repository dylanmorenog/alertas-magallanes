// Genera los íconos provisionales de la app (un semáforo sobre fondo azul).
// Uso: node scripts/generar-iconos.ts
//
// El semáforo ocupa el centro para caber en la "zona segura" de los íconos maskable:
// Android puede recortar el ícono en círculo, y solo garantiza el 80 % central.

import { writeFile } from "node:fs/promises";
import { createElement as h } from "react";
// Con la extensión .js: Next no declara "exports" y Node (ESM) exige la ruta exacta.
import { ImageResponse } from "next/og.js";

const AZUL = "#0b3d5c";

function luz(color: string, tamano: number) {
  return h("div", { style: { width: tamano, height: tamano, borderRadius: "50%", background: color } });
}

function icono(tamano: number) {
  const luzTamano = Math.round(tamano * 0.16);
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: AZUL,
      },
    },
    h(
      "div",
      {
        style: {
          width: Math.round(tamano * 0.3),
          height: Math.round(tamano * 0.64),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-around",
          borderRadius: Math.round(tamano * 0.06),
          background: "#1a1a1a",
        },
      },
      luz("#e53935", luzTamano),
      luz("#fbc02d", luzTamano),
      luz("#43a047", luzTamano),
    ),
  );
}

const destinos: [string, number][] = [
  ["public/iconos/icono-192.png", 192],
  ["public/iconos/icono-512.png", 512],
  ["app/icon.png", 192], // favicon (convención de Next)
  ["app/apple-icon.png", 180], // ícono al instalar en iPhone (convención de Next)
];

for (const [ruta, tamano] of destinos) {
  const imagen = new ImageResponse(icono(tamano), { width: tamano, height: tamano });
  await writeFile(ruta, Buffer.from(await imagen.arrayBuffer()));
  console.log(`${ruta} (${tamano}×${tamano})`);
}
