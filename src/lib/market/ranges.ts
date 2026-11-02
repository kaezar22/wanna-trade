// Periodos predefinidos para elegir cuánta historia mostrar.
import { addDays } from "./as-of";
import { INTERVALS, type Interval, type ISODate } from "./types";

export const RANGES = {
  "3m": { label: "3 meses", days: 91 },
  "6m": { label: "6 meses", days: 182 },
  "1a": { label: "1 año", days: 365 },
  "2a": { label: "2 años", days: 729 },
  "5a": { label: "5 años", days: 1826 },
  "10a": { label: "10 años", days: 3652 },
} as const;

export type RangeKey = keyof typeof RANGES;

export const INTERVAL_LABELS: Record<Interval, string> = {
  "1h": "Por hora",
  "1d": "Diario",
  "1wk": "Semanal",
  "1mo": "Mensual",
};

export function isRangeKey(v: string | null | undefined): v is RangeKey {
  return !!v && v in RANGES;
}

export function isInterval(v: string | null | undefined): v is Interval {
  return !!v && (INTERVALS as readonly string[]).includes(v);
}

/** Fecha de inicio para un periodo que termina en `end` (por defecto hoy). */
export function rangeStart(range: RangeKey, end?: ISODate): ISODate {
  const to = end ?? new Date().toISOString().slice(0, 10);
  return addDays(to, -RANGES[range].days);
}
