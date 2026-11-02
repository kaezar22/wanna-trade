// Backtesting de estrategias simples, solo compra (todo adentro o todo afuera).
//
// Sin mirar el futuro: la señal se calcula con el cierre del día t y se ejecuta
// al cierre del día t+1. La rentabilidad usa el cierre ajustado (incluye
// dividendos) y cada cambio de posición paga comisión.

import { bollinger, chopZone, sma, zoneTrend, type ChopZone } from "../indicators";
import { annualizedVolatility, maxDrawdown, sharpe } from "../indicators/risk";
import type { Bar, Interval } from "../market/types";

export type Strategy =
  | { kind: "buy_hold" }
  | { kind: "sma_cross"; fast: number; slow: number }
  | { kind: "chop_trend" }
  | { kind: "bollinger_revert"; length: number; k: number };

export const STRATEGY_LABELS: Record<Strategy["kind"], string> = {
  buy_hold: "Comprar y mantener",
  sma_cross: "Cruce de medias móviles",
  chop_trend: "Seguir la tendencia (Chop Zone)",
  bollinger_revert: "Rebote en Bollinger",
};

export const STRATEGY_RULES: Record<Strategy["kind"], string> = {
  buy_hold: "Compra el primer día y no vende nunca.",
  sma_cross: "Compra cuando la media rápida cruza por encima de la lenta; vende cuando cruza por debajo.",
  chop_trend: "Compra cuando la Chop Zone marca tendencia alcista clara o fuerte; vende cuando pasa a bajista.",
  bollinger_revert: "Compra cuando el cierre cae por debajo de la banda inferior; vende cuando vuelve a la media.",
};

/** Señal deseada (0 = afuera, 1 = adentro) con datos hasta el cierre de cada día. */
export function signals(bars: Bar[], s: Strategy): (0 | 1)[] {
  const close = bars.map((b) => b.close);
  const n = bars.length;

  switch (s.kind) {
    case "buy_hold":
      return bars.map(() => 1);

    case "sma_cross": {
      const f = sma(close, s.fast);
      const l = sma(close, s.slow);
      return bars.map((_, i) => (f[i] !== null && l[i] !== null && f[i]! > l[i]! ? 1 : 0));
    }

    case "chop_trend": {
      const zones = chopZone(
        bars.map((b) => b.high),
        bars.map((b) => b.low),
        close,
      );
      const out: (0 | 1)[] = [];
      let inside: 0 | 1 = 0;
      for (let i = 0; i < n; i++) {
        const z = zones[i];
        if (z !== null) {
          const t = zoneTrend(z as ChopZone);
          if (!inside && t.direction === "up" && t.strength >= 3) inside = 1;
          else if (inside && t.direction === "down") inside = 0;
        }
        out.push(inside);
      }
      return out;
    }

    case "bollinger_revert": {
      const bb = bollinger(close, s.length, s.k);
      const out: (0 | 1)[] = [];
      let inside: 0 | 1 = 0;
      for (let i = 0; i < n; i++) {
        const lower = bb.lower[i];
        const mid = bb.middle[i];
        if (lower !== null && mid !== null) {
          if (!inside && close[i] < lower) inside = 1;
          else if (inside && close[i] >= mid) inside = 0;
        }
        out.push(inside);
      }
      return out;
    }
  }
}

export type BacktestTrade = {
  entryDate: string;
  entryPrice: number;
  exitDate: string | null;
  exitPrice: number | null;
  /** Rentabilidad de la operación, neta de comisiones. */
  return: number;
  days: number;
};

export type BacktestResult = {
  dates: string[];
  /** Valor del capital (empieza en 1). */
  equity: number[];
  /** Posición mantenida desde el cierre de cada día hasta el siguiente. */
  position: (0 | 1)[];
  trades: BacktestTrade[];
  metrics: {
    totalReturn: number;
    annualReturn: number;
    volatility: number;
    maxDrawdown: number;
    sharpe: number;
    trades: number;
    winRate: number | null;
    /** Fracción de días con posición abierta. */
    exposure: number;
    fees: number;
  };
};

const DAY = 86_400_000;

export function backtest(
  bars: Bar[],
  strategy: Strategy,
  opts: { commission: number; interval: Interval } = { commission: 0.005, interval: "1d" },
): BacktestResult {
  const n = bars.length;
  const sig = signals(bars, strategy);

  // pos[t]: posición del cierre t al cierre t+1. Se decide con la señal de t−1.
  const position: (0 | 1)[] = bars.map((_, t) => (t === 0 ? 0 : sig[t - 1]));
  if (strategy.kind === "buy_hold" && n > 0) position[0] = 1; // compra al primer cierre

  const equity: number[] = [];
  const trades: BacktestTrade[] = [];
  let value = 1;
  let fees = 0;
  let open: { date: string; price: number; value: number; t: number } | null = null;

  for (let t = 0; t < n; t++) {
    // 1) rentabilidad del día: de t−1 a t con la posición que se tenía
    if (t > 0 && position[t - 1] === 1) value *= bars[t].adjClose / bars[t - 1].adjClose;

    // 2) cambio de posición al cierre de t, con comisión
    const prev = t === 0 ? 0 : position[t - 1];
    if (position[t] !== prev) {
      const fee = value * opts.commission;
      value -= fee;
      fees += fee;
      if (position[t] === 1) {
        open = { date: bars[t].date, price: bars[t].adjClose, value: value + fee, t };
      } else if (open) {
        trades.push({
          entryDate: open.date,
          entryPrice: open.price,
          exitDate: bars[t].date,
          exitPrice: bars[t].adjClose,
          return: value / open.value - 1,
          days: Math.round((Date.parse(bars[t].date) - Date.parse(open.date)) / DAY),
        });
        open = null;
      }
    }
    equity.push(value);
  }

  if (open && n > 0) {
    const last = bars[n - 1];
    trades.push({
      entryDate: open.date,
      entryPrice: open.price,
      exitDate: null,
      exitPrice: null,
      return: value / open.value - 1,
      days: Math.round((Date.parse(last.date) - Date.parse(open.date)) / DAY),
    });
  }

  const closed = trades.filter((t) => t.exitDate !== null);
  const days = n > 1 ? (Date.parse(bars[n - 1].date) - Date.parse(bars[0].date)) / DAY : 0;
  const total = n > 0 ? equity[n - 1] - 1 : 0;

  return {
    dates: bars.map((b) => b.date),
    equity,
    position,
    trades,
    metrics: {
      totalReturn: total,
      annualReturn: days > 0 ? (1 + total) ** (365 / days) - 1 : 0,
      volatility: annualizedVolatility(equity, opts.interval),
      maxDrawdown: maxDrawdown(equity),
      sharpe: sharpe(equity, opts.interval),
      trades: trades.length,
      winRate: closed.length ? closed.filter((t) => t.return > 0).length / closed.length : null,
      exposure: n ? position.filter((p) => p === 1).length / n : 0,
      fees,
    },
  };
}
