import { std } from "./series";

export type ExpectedRange = { step: number; upper: number; lower: number }[];

/**
 * Rango esperado del precio a futuro según la volatilidad histórica.
 * No es un pronóstico de dirección: dice qué tan lejos suele moverse el
 * precio. Con k = 1, alrededor de 2 de cada 3 veces el precio termina dentro.
 *
 * Reemplaza el ARIMA de tradex, que sobre precios daba casi una línea plana y
 * aparentaba una precisión que no tenía.
 */
export function expectedRange(
  prices: readonly number[],
  steps: number,
  k = 1,
  lookback = 120,
): ExpectedRange {
  const window = prices.slice(-lookback - 1);
  if (window.length < 3) return [];
  const logReturns: number[] = [];
  for (let i = 1; i < window.length; i++) logReturns.push(Math.log(window[i] / window[i - 1]));
  const sigma = std(logReturns, 1);
  const last = prices[prices.length - 1];

  return Array.from({ length: steps }, (_, i) => {
    const s = i + 1;
    const move = k * sigma * Math.sqrt(s);
    return { step: s, upper: last * Math.exp(move), lower: last * Math.exp(-move) };
  });
}
