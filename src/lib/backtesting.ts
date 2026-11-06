// Backtesting de los umbrales: aplica las MISMAS reglas de la app a datos históricos.
// Funciones puras (sin red ni disco) para poder probarlas con series inventadas.
//
// Ojo con lo que mide: los datos históricos son lo que PASÓ (reanálisis), no lo que se
// pronosticó. "Anticipación" es cuántos días antes de los daños el tiempo real ya cruzaba
// el umbral; no mide qué tan bueno habría sido el pronóstico.

import type { PronosticoDia } from "./open-meteo.ts";
import { evaluarDia, type Nivel, type Reglas } from "./semaforo.ts";
import { diasEntre, sumarDias } from "./tiempo.ts";
import type { Evento } from "../config/eventos.ts";
import { UMBRALES } from "../config/reglas.ts";

export type DiaHistorico = { dia: PronosticoDia; nivel: Nivel | null };

export type Episodio = { desde: string; hasta: string; dias: number; nivel: "amarillo" | "rojo" };

export type ConteoAnual = {
  ano: number;
  alertas: number; // episodios
  alertasRojas: number; // episodios cuyo peor día fue rojo
  diasAmarillo: number;
  diasRojo: number;
  diasSinDatos: number;
};

export type ResultadoEvento = {
  evento: Evento;
  nivelMaximo: Nivel | null; // en la ventana de búsqueda; null si no hubo datos
  // Días ANTES de `evento.desde` del primer día con alerta: positivo = avisó antes,
  // 0 = el mismo día, negativo = llegó tarde, null = no hubo.
  anticipacionAlerta: number | null; // amarillo o rojo
  anticipacionRojo: number | null;
  detalle: DiaHistorico[]; // de `desde − diasAntes` a `desde + DIAS_DESPUES`
};

// Días después del inicio que se muestran en el detalle, para ver cómo siguió.
const DIAS_DESPUES = 3;

function esAlerta(nivel: Nivel | null): nivel is "amarillo" | "rojo" {
  return nivel === "amarillo" || nivel === "rojo";
}

const ano = (fecha: string) => Number(fecha.slice(0, 4));

export function evaluarSerie(dias: PronosticoDia[], reglas: Reglas = UMBRALES): DiaHistorico[] {
  return dias.map((dia) => ({ dia, nivel: evaluarDia(dia, reglas).nivel }));
}

// Días seguidos con alerta cuentan como UNA alerta: en la práctica son una sola serie de
// publicaciones. Un día sin alerta o sin datos corta el episodio, igual que un hueco en
// las fechas.
export function episodios(serie: DiaHistorico[]): Episodio[] {
  const resultado: Episodio[] = [];
  let actual: Episodio | null = null;
  for (const { dia, nivel } of serie) {
    if (!esAlerta(nivel)) {
      actual = null;
      continue;
    }
    if (actual && diasEntre(actual.hasta, dia.fecha) === 1) {
      actual.hasta = dia.fecha;
      actual.dias++;
      if (nivel === "rojo") actual.nivel = "rojo";
    } else {
      actual = { desde: dia.fecha, hasta: dia.fecha, dias: 1, nivel };
      resultado.push(actual);
    }
  }
  return resultado;
}

// Conteo por año, con todos los años del rango aunque no tengan alertas (un 0 también es
// un resultado). Un episodio que cruza el 31 de diciembre cuenta en el año en que empieza.
export function alertasPorAno(serie: DiaHistorico[], desdeAno: number, hastaAno: number): ConteoAnual[] {
  const conteos = new Map<number, ConteoAnual>();
  for (let a = desdeAno; a <= hastaAno; a++) {
    conteos.set(a, { ano: a, alertas: 0, alertasRojas: 0, diasAmarillo: 0, diasRojo: 0, diasSinDatos: 0 });
  }
  for (const { dia, nivel } of serie) {
    const conteo = conteos.get(ano(dia.fecha));
    if (!conteo) continue;
    if (nivel === "amarillo") conteo.diasAmarillo++;
    if (nivel === "rojo") conteo.diasRojo++;
    if (nivel === null) conteo.diasSinDatos++;
  }
  for (const episodio of episodios(serie)) {
    const conteo = conteos.get(ano(episodio.desde));
    if (!conteo) continue;
    conteo.alertas++;
    if (episodio.nivel === "rojo") conteo.alertasRojas++;
  }
  return [...conteos.values()];
}

// Busca la primera alerta entre `desde − diasAntes` y el último día del evento
// (`hasta`, o `desde` si no se conoce).
export function analizarEvento(evento: Evento, serie: DiaHistorico[], diasAntes = 7): ResultadoEvento {
  const inicioVentana = sumarDias(evento.desde, -diasAntes);
  const finVentana = evento.hasta ?? evento.desde;
  const ventana = serie.filter(({ dia }) => dia.fecha >= inicioVentana && dia.fecha <= finVentana);

  const primera = (cumple: (nivel: Nivel | null) => boolean) => {
    const encontrado = ventana.find(({ nivel }) => cumple(nivel));
    return encontrado ? diasEntre(encontrado.dia.fecha, evento.desde) : null;
  };

  const ORDEN: (Nivel | null)[] = [null, "verde", "amarillo", "rojo"];
  const nivelMaximo = ventana.reduce<Nivel | null>(
    (peor, { nivel }) => (ORDEN.indexOf(nivel) > ORDEN.indexOf(peor) ? nivel : peor),
    null,
  );

  const finDetalle = sumarDias(evento.desde, DIAS_DESPUES);
  return {
    evento,
    nivelMaximo,
    anticipacionAlerta: primera(esAlerta),
    anticipacionRojo: primera((nivel) => nivel === "rojo"),
    detalle: serie.filter(({ dia }) => dia.fecha >= inicioVentana && dia.fecha <= finDetalle),
  };
}

// Las mismas reglas, pero sin que las olas muevan el color: para ver cuántas alertas
// agregan las olas (dato secundario y muy grueso en el histórico).
export function reglasSinOlas(reglas: Reglas = UMBRALES): Reglas {
  return { ...reglas, olas: { ...reglas.olas, mueveElColor: false } };
}
