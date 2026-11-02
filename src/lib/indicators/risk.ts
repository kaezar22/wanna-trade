import { mean, std } from "./series";
import type { Interval } from "../market/types";

/** Periodos por año según el intervalo, para anualizar. */
export const PERIODS_PER_YEAR: Record<Interval, number> = {
  "1h": 252 * 6.5,
  "1d": 252,
  "1wk": 52,
  "1mo": 12,
};

/** Rentabilidades simples entre periodos consecutivos (largo n - 1). */
export function returns(prices: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(prices[i] / prices[i - 1] - 1);
  return out;
}

/** Rentabilidad total del primer al último precio. */
export function totalReturn(prices: readonly number[]): number {
  return prices.length < 2 ? 0 : prices[prices.length - 1] / prices[0] - 1;
}

/** Volatilidad anualizada (desviación muestral de las rentabilidades). */
export function annualizedVolatility(prices: readonly number[], interval: Interval): number {
  const r = returns(prices);
  if (r.length < 2) return 0;
  return std(r, 1) * Math.sqrt(PERIODS_PER_YEAR[interval]);
}

/** Caída máxima desde un pico, como número negativo (−0.25 = −25 %). */
export function maxDrawdown(prices: readonly number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const p of prices) {
    peak = Math.max(peak, p);
    worst = Math.min(worst, p / peak - 1);
  }
  return worst;
}

/**
 * Sharpe anualizado. riskFree es la tasa libre de riesgo anual (p. ej. la de
 * un CDT o un bono del Tesoro).
 */
export function sharpe(prices: readonly number[], interval: Interval, riskFree = 0): number {
  const r = returns(prices);
  if (r.length < 2) return 0;
  const ppy = PERIODS_PER_YEAR[interval];
  const rfPerPeriod = (1 + riskFree) ** (1 / ppy) - 1;
  const excess = r.map((x) => x - rfPerPeriod);
  const sd = std(excess, 1);
  return sd === 0 ? 0 : (mean(excess) / sd) * Math.sqrt(ppy);
}

/** Correlación de Pearson entre dos series del mismo largo. */
export function correlation(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length < 2) return NaN;
  const ma = mean(a);
  const mb = mean(b);
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return cov / Math.sqrt(va * vb);
}
