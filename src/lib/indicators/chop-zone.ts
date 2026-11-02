import { ema } from "./moving-averages";
import { max, min, rollingWindow, roundHalfEven } from "./series";

/**
 * Zonas del Chop Zone (0–8). Son categorías, no un ranking:
 *   0–3  tendencia alcista, de fuerte (0) a débil (3)
 *   4–7  tendencia bajista, de fuerte (4) a débil (7)
 *   8    lateral, sin tendencia
 */
export type ChopZone = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const CHOP_ZONE_COLORS: Record<ChopZone, string> = {
  0: "#26C6DA",
  1: "#43A047",
  2: "#A5D6A7",
  3: "#009688",
  4: "#D50000",
  5: "#E91E63",
  6: "#FF6D00",
  7: "#FFB74D",
  8: "#FDD835",
};

function zoneFromAngle(angle: number): ChopZone {
  if (angle >= 5) return 0;
  if (angle >= 3.57) return 1;
  if (angle >= 2.14) return 2;
  if (angle >= 0.71) return 3;
  if (angle <= -5) return 4;
  if (angle <= -3.57) return 5;
  if (angle <= -2.14) return 6;
  if (angle <= -0.71) return 7;
  return 8;
}

/**
 * Chop Zone: ángulo de la EMA normalizado por el rango reciente del precio.
 * Port de tradex/models/cz.py. Corrección: si el precio no se movió en la
 * ventana (máximo = mínimo), la zona es 8 (lateral) en vez de dividir por cero.
 */
export function chopZone(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  length = 30,
  emaLength = 34,
): (ChopZone | null)[] {
  const n = close.length;
  const hi = rollingWindow(close, length, max);
  const lo = rollingWindow(close, length, min);
  const e = ema(close, emaLength);
  const warmup = Math.max(length, emaLength);

  const out: (ChopZone | null)[] = new Array(n).fill(null);
  for (let i = warmup; i < n; i++) {
    const range = hi[i]! - lo[i]!;
    if (range === 0 || e[i] === null || e[i - 1] === null) {
      out[i] = 8;
      continue;
    }
    const typical = (high[i] + low[i] + close[i]) / 3;
    const rangeHL = (25 / range) * lo[i]!;
    const y2 = ((e[i - 1]! - e[i]!) / typical) * rangeHL;
    const c = Math.sqrt(1 + y2 * y2);
    const angle0 = roundHalfEven((Math.acos(1 / c) * 180) / Math.PI);
    const angle = y2 > 0 ? -angle0 : angle0;
    out[i] = zoneFromAngle(angle);
  }
  return out;
}

export type Trend = {
  direction: "up" | "down" | "flat";
  /** 0 = lateral, 4 = tendencia más fuerte. */
  strength: 0 | 1 | 2 | 3 | 4;
};

/**
 * Traduce una zona a dirección y fuerza. Sustituye el ranking por número de
 * zona de tradex, que ponía bajistas fuertes (4) por encima de alcistas débiles.
 */
export function zoneTrend(zone: ChopZone): Trend {
  if (zone === 8) return { direction: "flat", strength: 0 };
  const up = zone <= 3;
  const strength = (4 - (zone % 4)) as Trend["strength"];
  return { direction: up ? "up" : "down", strength };
}
