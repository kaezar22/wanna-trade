// Reglas de la fecha de corte. Funciones puras: aquí se decide qué se "sabía"
// en una fecha dada. Todo lo que muestre el simulador pasa por aquí.

import type { Bar, ISODate } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): value is ISODate {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Fecha local (YYYY-MM-DD) de un instante, en la zona horaria IANA indicada. */
export function localDate(unixSeconds: number, timeZone: string): ISODate {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

/**
 * Conserva solo las barras cuya fecha es menor o igual a la fecha de corte.
 * Semántica: con asOf = D conoces el cierre de D y nada posterior.
 */
export function cutAt(bars: Bar[], asOf: ISODate | null): Bar[] {
  if (asOf === null) return bars;
  return bars.filter((b) => b.date <= asOf);
}

/** Segundos Unix del inicio de un día UTC. */
export function dayStartUnix(date: ISODate): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
