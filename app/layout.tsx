import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegistrarServiceWorker } from "./registrar-sw.tsx";
import { DESCRIPCION_SITIO, PREGUNTA } from "../src/config/reglas.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: `${PREGUNTA} · Alertas Magallanes`,
  description: DESCRIPCION_SITIO,
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
