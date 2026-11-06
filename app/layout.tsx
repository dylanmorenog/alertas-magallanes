import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "¿Se puede salir hoy? · Alertas Magallanes",
  description: "Semáforo de viento, olas y lluvia para Sánchez Magallanes, Tabasco.",
};

export const viewport: Viewport = {
  themeColor: "#0b3d5c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
