import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegistrarServiceWorker } from "./registrar-sw.tsx";
import { COMPARTIR, DESCRIPCION_SITIO, PREGUNTA } from "../src/config/reglas.ts";
import { URL_PUBLICA } from "../src/config/sitio.ts";
import "./globals.css";

// Vista previa al compartir: estática a propósito (ver COMPARTIR en reglas.ts).
// La imagen la agrega Next por convención de archivos (app/opengraph-image.png), con un
// hash en la dirección: si la imagen cambia, Facebook ve una dirección nueva.
// Facebook exige direcciones absolutas; sin URL_PUBLICA no se ponen estas etiquetas,
// porque saldrían apuntando a localhost.
const compartir: Metadata = URL_PUBLICA
  ? {
      metadataBase: new URL(URL_PUBLICA),
      openGraph: {
        type: "website",
        locale: "es_MX",
        siteName: COMPARTIR.sitio,
        url: "/",
        title: PREGUNTA,
        description: DESCRIPCION_SITIO,
      },
    }
  : {};

export const metadata: Metadata = {
  title: `${PREGUNTA} · ${COMPARTIR.sitio}`,
  description: DESCRIPCION_SITIO,
  ...compartir,
};

export const viewport: Viewport = {
  themeColor: "#0b3d5c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
