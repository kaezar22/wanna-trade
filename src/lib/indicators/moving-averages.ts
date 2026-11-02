import { mean, rollingWindow, type Series } from "./series";

/** Media móvil simple. */
export function sma(values: readonly number[], length: number): Series {
  return rollingWindow(values, length, mean);
}

/**
 * Media móvil exponencial, igual a pandas ewm(span, adjust=False,
 * min_periods=span): arranca en el primer valor y oculta los primeros span-1.
 */
export function ema(values: readonly number[], span: number): Series {
  const alpha = 2 / (span + 1);
  const out: Series = new Array(values.length).fill(null);
  let prev = 0;
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : alpha * values[i] + (1 - alpha) * prev;
    if (i >= span - 1) out[i] = prev;
  }
  return out;
}
