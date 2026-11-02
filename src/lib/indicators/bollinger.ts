import { mean, rollingWindow, std, type Series } from "./series";

export type BollingerBands = { middle: Series; upper: Series; lower: Series };

/** Bandas de Bollinger: media móvil ± k desviaciones estándar (poblacional). */
export function bollinger(
  close: readonly number[],
  length = 20,
  k = 2,
  ddof = 0,
): BollingerBands {
  const middle = rollingWindow(close, length, mean);
  const dev = rollingWindow(close, length, (w) => std(w, ddof));
  return {
    middle,
    upper: middle.map((m, i) => (m === null ? null : m + k * dev[i]!)),
    lower: middle.map((m, i) => (m === null ? null : m - k * dev[i]!)),
  };
}
