import { describe, expect, it } from "vitest";
import type { Bar } from "../market/types";
import { backtest, signals } from "./engine";

function bars(closes: number[]): Bar[] {
  return closes.map((c, i) => ({
    time: i,
    date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
    open: c,
    high: c,
    low: c,
    close: c,
    adjClose: c,
    volume: 0,
  }));
}

describe("comprar y mantener", () => {
  it("sigue al precio menos una comisión", () => {
    const r = backtest(bars([100, 110, 121]), { kind: "buy_hold" }, { commission: 0.01, interval: "1d" });
    expect(r.equity[0]).toBeCloseTo(0.99, 12);
    expect(r.equity[2]).toBeCloseTo(0.99 * 1.21, 12);
    expect(r.metrics.trades).toBe(1);
    expect(r.trades[0].exitDate).toBeNull();
    expect(r.metrics.exposure).toBe(1);
  });
});

describe("sin mirar el futuro", () => {
  it("una señal del día t se ejecuta al cierre de t+1", () => {
    // Medias de 1 y 2: la señal se enciende el día 2 (sube), se ejecuta el día 3.
    const b = bars([10, 10, 12, 15, 15, 9]);
    const sig = signals(b, { kind: "sma_cross", fast: 1, slow: 2 });
    expect(sig).toEqual([0, 0, 1, 1, 0, 0]);
    const r = backtest(b, { kind: "sma_cross", fast: 1, slow: 2 }, { commission: 0, interval: "1d" });
    expect(r.position).toEqual([0, 0, 0, 1, 1, 0]);
    // Compra al cierre del día 3 (15) y vende al cierre del día 5 (9): la subida de 12 a 15 no se cuenta.
    expect(r.trades[0]).toMatchObject({ entryPrice: 15, exitPrice: 9 });
    expect(r.equity.at(-1)).toBeCloseTo(9 / 15, 12);
  });

  it("cambiar precios futuros no cambia las decisiones pasadas", () => {
    const a = bars([10, 11, 12, 11, 10, 9, 10, 12, 14, 13]);
    const b = bars([10, 11, 12, 11, 10, 9, 10, 12, 50, 1]);
    const s = { kind: "sma_cross", fast: 2, slow: 3 } as const;
    const pa = backtest(a, s).position.slice(0, 8);
    const pb = backtest(b, s).position.slice(0, 8);
    expect(pa).toEqual(pb);
  });
});

describe("Bollinger", () => {
  it("compra bajo la banda inferior y vende al volver a la media", () => {
    const closes = [...Array(20).fill(100), 80, 85, 101, 102];
    const sig = signals(bars(closes), { kind: "bollinger_revert", length: 20, k: 2 });
    expect(sig[20]).toBe(1); // 80 está muy por debajo de la banda
    expect(sig[22]).toBe(0); // 101 supera la media
  });
});

describe("métricas", () => {
  it("cuenta operaciones, aciertos y exposición", () => {
    const r = backtest(bars([10, 10, 12, 15, 15, 9, 9]), { kind: "sma_cross", fast: 1, slow: 2 }, {
      commission: 0,
      interval: "1d",
    });
    expect(r.metrics.trades).toBe(1);
    expect(r.metrics.winRate).toBe(0);
    expect(r.metrics.exposure).toBeCloseTo(2 / 7, 12);
    expect(r.metrics.maxDrawdown).toBeCloseTo(9 / 15 - 1, 12);
  });
});
