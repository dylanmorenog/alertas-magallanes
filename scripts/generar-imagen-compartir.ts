// Genera la imagen de la vista previa al compartir (Open Graph) y su texto alternativo.
// Uso: node scripts/generar-imagen-compartir.ts
//
// Se genera una vez y se guarda en el repo, en lugar de usar app/opengraph-image.tsx:
// así es imposible que la imagen muestre un pronóstico (no es código que corra en el
// servidor), y el cambio se puede revisar a simple vista en el commit.
// Next la encuentra por su nombre (convención de archivos) y agrega las etiquetas og:image.

import { readFile, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
// Con la extensión .js: Next no declara "exports" y Node (ESM) exige la ruta exacta.
import { ImageResponse } from "next/og.js";
import { COMPARTIR, PREGUNTA } from "../src/config/reglas.ts";

// Tamaño recomendado por Facebook (proporción 1.91:1).
const ANCHO = 1200;
const ALTO = 630;
const AZUL = "#0b3d5c";

// La fuente que trae Next para generar imágenes solo tiene un grosor, y la pregunta debe ir
// en negrita: en el muro la vista previa se ve chica. El paquete "geist" (dependencia de
// desarrollo, licencia OFL) trae el mismo tipo de letra en Regular y Bold.
const FUENTES = "node_modules/geist/dist/fonts/geist-sans";
const fuentes = [
  { name: "Geist", weight: 400 as const, data: await readFile(`${FUENTES}/Geist-Regular.ttf`) },
  { name: "Geist", weight: 700 as const, data: await readFile(`${FUENTES}/Geist-Bold.ttf`) },
];

function luz(color: string) {
  return h("div", { style: { width: 92, height: 92, borderRadius: "50%", background: color } });
}

// Las tres luces encendidas por igual: ningún color se puede leer como "el estado de hoy".
const semaforo = h(
  "div",
  {
    style: {
      width: 150,
      height: 390,
      flex: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-around",
      borderRadius: 28,
      background: "#1a1a1a",
    },
  },
  luz("#e53935"),
  luz("#fbc02d"),
  luz("#43a047"),
);

const textos = h(
  "div",
  // flex: 1 y minWidth: 0 → la columna ocupa solo el espacio que deja el semáforo y el
  // texto largo baja de renglón en lugar de salirse de la imagen.
  { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28, color: "#fff" } },
  h("div", { style: { fontSize: 76, fontWeight: 700, lineHeight: 1.1 } }, PREGUNTA),
  h("div", { style: { fontSize: 36, lineHeight: 1.3, color: "#cfe3f0" } }, COMPARTIR.subtitulo),
  h("div", { style: { fontSize: 30, color: "#cfe3f0", opacity: 0.8 } }, COMPARTIR.sitio),
);

const imagen = new ImageResponse(
  h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: "0 80px",
        background: AZUL,
      },
    },
    semaforo,
    textos,
  ),
  { width: ANCHO, height: ALTO, fonts: fuentes },
);

await writeFile("app/opengraph-image.png", Buffer.from(await imagen.arrayBuffer()));
await writeFile("app/opengraph-image.alt.txt", COMPARTIR.textoAlternativo);
console.log(`app/opengraph-image.png (${ANCHO}×${ALTO}) y app/opengraph-image.alt.txt`);
