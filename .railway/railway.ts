// Configuración de Railway como código (Infrastructure as Code).
// Reemplaza a railway.json, que Railway deja de leer el 2026-12-01.
//
// Traducido de railway.json con `railway config migrate` (prueba en seco) y completado a
// mano: la traducción automática no incluía la política de reinicio, y sin ella el
// servicio pasaría a los 10 reintentos del panel en lugar de los 3 de railway.json.
//
// Revisar cambios con `railway config plan` antes de `railway config apply`.
//
// NO encender el CDN de Railway (`cdn`) sin revisar antes la frescura de la página: con los
// encabezados de Next (s-maxage y stale-while-revalidate de un año) el CDN guardaría el HTML
// y respondería sin pasar por Next, y el monitor que mantiene fresca la página dejaría de
// servir. Hoy no está encendido: las respuestas no traen `x-cache`.

import { defineRailway, github, project, service } from "railway/iac";

// Este repositorio administra solo sus propios recursos del proyecto.
// Ver https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "alertas-magallanes";

export default defineRailway(() => {
  const alertasMagallanes = service("alertas-magallanes", {
    source: github("dylanmorenog/alertas-magallanes", { branch: "main", checkSuites: false }),
    build: { buildCommand: "npm run build", buildEnvironment: "V3", builder: "RAILPACK" },
    start: "npm start",
    healthcheck: "/",
    healthcheckTimeout: 120,
    replicas: { iad: 1 },
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 3 },
  });

  return project("balanced-enjoyment", {
    // Las variables del servicio las sigue administrando el panel, no este archivo.
    variables: { managed: false },
    resources: [alertasMagallanes],
  });
});
