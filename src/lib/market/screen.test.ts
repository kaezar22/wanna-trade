import { describe, expect, it } from "vitest";
import { pickUncorrelated, rankRows, screen } from "./screen";
import type { Bar, PriceSeries } from "./types";

function series(symbol: string, closes: number[]): PriceSeries {
  const bars: Bar[] = closes.map((c, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
    return { time: i, date: d, open: c, high: c * 1.01, low: c * 0.99, close: c, adjClose: c, volume: 1 };
  });
  return {
    meta: { symbol, name: symbol, currency: "USD", exchange: null, type: null, timezone: "UTC" },
    interval: "1d",
    asOf: null,
    bars,
  };
}

const walk = (n: number, f: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => 100 * Math.exp(f(i)));

describe("ranking", () => {
  it("alcistas fuertes primero, bajistas fuertes al final", () => {
    const rows = [
      { s: "BAJA_FUERTE", trend: { direction: "down", strength: 4 }, sharpe: 0 },
      { s: "SUBE_DEBIL", trend: { direction: "up", strength: 1 }, sharpe: 0 },
      { s: "LATERAL", trend: { direction: "flat", strength: 0 }, sharpe: 0 },
      { s: "SUBE_FUERTE", trend: { direction: "up", strength: 4 }, sharpe: 0 },
      { s: "BAJA_DEBIL", trend: { direction: "down", strength: 1 }, sharpe: 0 },
    ] as const;
    expect(rankRows([...rows]).map((r) => r.s)).toEqual([
      "SUBE_FUERTE",
      "SUBE_DEBIL",
      "LATERAL",
      "BAJA_DEBIL",
      "BAJA_FUERTE",
    ]);
  });

  it("no elige dos instrumentos muy correlacionados", () => {
    const corr = (a: string, b: string) => (a[0] === b[0] ? 0.9 : 0.1);
    expect(pickUncorrelated(["A1", "A2", "B1", "C1", "B2"], corr, 5)).toEqual(["A1", "B1", "C1"]);
  });
});

describe("screen", () => {
  it("calcula métricas, correlación y selección", () => {
    const n = 120;
    const a = series("A", walk(n, (i) => i * 0.004 + Math.sin(i / 3) * 0.02));
    const aCopy = series("A2", walk(n, (i) => i * 0.004 + Math.sin(i / 3) * 0.02 + 0.001));
    const b = series("B", walk(n, (i) => i * 0.002 + Math.cos(i / 2.1) * 0.03));
    const short = series("CORTO", walk(10, (i) => i * 0.01));

    const r = screen([a, aCopy, b, short], "1d");
    expect(r.rows.map((x) => x.symbol).sort()).toEqual(["A", "A2", "B"]);
    expect(r.commonPeriods).toBe(n - 1);
    const sel = r.rows.filter((x) => x.selected).map((x) => x.symbol);
    expect(sel).toContain("B");
    expect(sel.filter((s) => s.startsWith("A"))).toHaveLength(1);
    const i = r.correlation.symbols.indexOf("A");
    const j = r.correlation.symbols.indexOf("A2");
    expect(r.correlation.values[i][j]).toBeGreaterThan(0.99);
  });
});
