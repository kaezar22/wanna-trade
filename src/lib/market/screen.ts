// Selector de instrumentos: tendencia, riesgo y correlación de una lista de
// símbolos, y una selección de los menos correlacionados. La lógica es pura
// (recibe series ya descargadas) para poder probarla y reutilizarla en el
// simulador con una fecha de corte.

import {
  annualizedVolatility,
  chopZone,
  correlation,
  maxDrawdown,
  returns,
  sharpe,
  totalReturn,
  zoneTrend,
  type ChopZone,
  type Trend,
} from "../indicators";
import type { Interval, PriceSeries } from "./types";

export type ScreenRow = {
  symbol: string;
  name: string | null;
  currency: string | null;
  zone: ChopZone | null;
  trend: Trend | null;
  totalReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  bars: number;
  selected: boolean;
};

export type ScreenResult = {
  rows: ScreenRow[];
  /** Matriz de correlación de rentabilidades, en el orden de `symbols`. */
  correlation: { symbols: string[]; values: number[][] };
  /** Periodos en común usados para la correlación. */
  commonPeriods: number;
};

export const MIN_BARS = 60;

/** Orden: alcistas primero (más fuertes antes), luego laterales, luego bajistas; desempate por Sharpe. */
export function rankRows<T extends Pick<ScreenRow, "trend" | "sharpe">>(rows: T[]): T[] {
  const dirRank = (t: Trend | null) =>
    t === null ? -1 : t.direction === "up" ? 2 : t.direction === "flat" ? 1 : 0;
  return [...rows].sort(
    (a, b) =>
      dirRank(b.trend) - dirRank(a.trend) ||
      (b.trend?.direction === "down"
        ? (a.trend?.strength ?? 0) - (b.trend?.strength ?? 0) // bajistas: las más débiles primero
        : (b.trend?.strength ?? 0) - (a.trend?.strength ?? 0)) ||
      b.sharpe - a.sharpe,
  );
}

/** Recorre la lista ordenada y toma los que no se parecen a los ya elegidos. */
export function pickUncorrelated(
  ranked: string[],
  corr: (a: string, b: string) => number,
  maxPicks = 5,
  threshold = 0.5,
): string[] {
  const picked: string[] = [];
  for (const s of ranked) {
    if (picked.every((p) => Math.abs(corr(s, p)) < threshold)) picked.push(s);
    if (picked.length === maxPicks) break;
  }
  return picked;
}

export function screen(
  series: PriceSeries[],
  interval: Interval,
  maxPicks = 5,
  threshold = 0.5,
): ScreenResult {
  const usable = series.filter((s) => s.bars.length >= MIN_BARS);

  const base = usable.map((s) => {
    const adj = s.bars.map((b) => b.adjClose);
    const zones = chopZone(
      s.bars.map((b) => b.high),
      s.bars.map((b) => b.low),
      s.bars.map((b) => b.close),
    );
    const zone = zones.findLast((z): z is ChopZone => z !== null) ?? null;
    return {
      symbol: s.meta.symbol,
      name: s.meta.name,
      currency: s.meta.currency,
      zone,
      trend: zone === null ? null : zoneTrend(zone),
      totalReturn: totalReturn(adj),
      volatility: annualizedVolatility(adj, interval),
      maxDrawdown: maxDrawdown(adj),
      sharpe: sharpe(adj, interval),
      bars: s.bars.length,
    };
  });

  // Correlación sobre las fechas que todos comparten (bolsas con feriados distintos).
  const byDate = usable.map((s) => new Map(s.bars.map((b) => [b.date, b.adjClose])));
  const common = usable[0]
    ? usable[0].bars.map((b) => b.date).filter((d) => byDate.every((m) => m.has(d)))
    : [];
  const rets = byDate.map((m) => returns(common.map((d) => m.get(d)!)));
  const symbols = base.map((r) => r.symbol);
  const values = rets.map((a) => rets.map((b) => correlation(a, b)));
  const idx = new Map(symbols.map((s, i) => [s, i]));
  const corr = (a: string, b: string) => values[idx.get(a)!][idx.get(b)!];

  const ranked = rankRows(base);
  const picked = new Set(
    pickUncorrelated(
      ranked.map((r) => r.symbol),
      corr,
      maxPicks,
      threshold,
    ),
  );

  return {
    rows: ranked.map((r) => ({ ...r, selected: picked.has(r.symbol) })),
    correlation: { symbols, values },
    commonPeriods: Math.max(0, common.length - 1),
  };
}
