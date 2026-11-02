// Utilidades de series. Convención: los indicadores devuelven arreglos del
// mismo largo que la entrada, con null donde aún no hay datos suficientes
// (equivale al NaN de pandas, pero se puede serializar a JSON).

export type Series = (number | null)[];

export function rollingWindow(
  values: readonly number[],
  window: number,
  fn: (slice: readonly number[]) => number,
): Series {
  const out: Series = new Array(values.length).fill(null);
  for (let i = window - 1; i < values.length; i++) {
    out[i] = fn(values.slice(i - window + 1, i + 1));
  }
  return out;
}

export const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Desviación estándar. ddof = 0 poblacional, 1 muestral (como pandas). */
export function std(xs: readonly number[], ddof = 0): number {
  const m = mean(xs);
  const ss = xs.reduce((a, x) => a + (x - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - ddof));
}

export const max = (xs: readonly number[]) => Math.max(...xs);
export const min = (xs: readonly number[]) => Math.min(...xs);

/** Redondeo al par más cercano en empates, como numpy.round. */
export function roundHalfEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}
