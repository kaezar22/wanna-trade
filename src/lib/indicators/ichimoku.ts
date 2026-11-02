import { max, min, rollingWindow, type Series } from "./series";

export type Ichimoku = {
  tenkan: Series;
  kijun: Series;
  /**
   * Senkou A y B ya desplazadas hacia adelante. Tienen largo n + displacement:
   * las últimas `displacement` posiciones son la nube proyectada hacia el
   * futuro, calculada solo con datos conocidos.
   */
  senkouA: Series;
  senkouB: Series;
  /** Cierre dibujado `displacement` barras atrás (null en las últimas). */
  chikou: Series;
  displacement: number;
};

function midpoint(high: readonly number[], low: readonly number[], length: number): Series {
  const hi = rollingWindow(high, length, max);
  const lo = rollingWindow(low, length, min);
  return hi.map((h, i) => (h === null || lo[i] === null ? null : (h + lo[i]!) / 2));
}

/**
 * Nube de Ichimoku. A diferencia de la versión anterior (tradex), la nube se
 * proyecta hacia adelante en vez de perderse al desplazarla.
 */
export function ichimoku(
  high: readonly number[],
  low: readonly number[],
  close: readonly number[],
  tenkanLength = 9,
  kijunLength = 26,
  senkouBLength = 52,
  displacement = kijunLength,
): Ichimoku {
  const n = close.length;
  const tenkan = midpoint(high, low, tenkanLength);
  const kijun = midpoint(high, low, kijunLength);
  const spanA = tenkan.map((t, i) => (t === null || kijun[i] === null ? null : (t + kijun[i]!) / 2));
  const spanB = midpoint(high, low, senkouBLength);

  const shiftForward = (s: Series): Series => [
    ...new Array<null>(displacement).fill(null),
    ...s,
  ];

  const chikou: Series = close.map((_, i) => (i + displacement < n ? close[i + displacement] : null));

  return {
    tenkan,
    kijun,
    senkouA: shiftForward(spanA),
    senkouB: shiftForward(spanB),
    chikou,
    displacement,
  };
}
