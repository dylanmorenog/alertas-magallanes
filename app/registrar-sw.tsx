"use client";

import { useEffect } from "react";

// Registra el service worker solo en producción: en desarrollo guardaría versiones
// viejas del código mientras lo editamos.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const registrar = () =>
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.error("No se pudo registrar el service worker:", error));

    // Esperar a que la página termine de cargar: así el service worker no compite por la
    // poca señal en la primera visita, y encuentra los archivos ya en el caché del navegador.
    if (document.readyState === "complete") {
      registrar();
    } else {
      window.addEventListener("load", registrar, { once: true });
      return () => window.removeEventListener("load", registrar);
    }
  }, []);

  return null;
}
