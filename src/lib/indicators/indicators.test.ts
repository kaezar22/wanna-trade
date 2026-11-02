import { describe, expect, it } from "vitest";
import ref from "./__fixtures__/tradex-reference.json";
import {
  annualizedVolatility,
  bollinger,
  chopZone,
  correlation,
  ema,
  ichimoku,
  maxDrawdown,
  returns,
  roundHalfEven,
  sma,
  zoneTrend,
  type Series,
} from "./index";

// Valores de referencia generados con el código Python original de tradex
// (scripts/make_tradex_fixture.py). Si cambias un indicador a
// propósito, regenera el fixture.

const close = ref.close as number[];
const high = ref.high as number[];
const low = ref.low as number[];

function expectSeriesClose(actual: Series, expected: (number | null)[]) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i];
    const a = actual[i];
    if (e === null) {
      expect(a, `índice ${i}`).toBeNull();
    } else {
      expect(a, `índice ${i}`).not.toBeNull();
      expect(a!).toBeCloseTo(e, 9);
    }
  }
}

describe("medias móviles", () => {
  it("SMA igual a pandas rolling().mean()", () => {
    expectSeriesClose(sma(close, 9), ref.sma9);
    expectSeriesClose(sma(close, 21), ref.sma21);
  });

  it("EMA igual a pandas ewm(adjust=False, min_periods=span)", () => {
    expectSeriesClose(ema(close, 34), ref.ema34);
  });
});

describe("Bollinger", () => {
  it("igual a tradex compute_bollinger_bands", () => {
    const bb = bollinger(close);
    expectSeriesClose(bb.middle, ref.bb_mid);
    expectSeriesClose(bb.upper, ref.bb_up);
    expectSeriesClose(bb.lower, ref.bb_down);
  });
});

describe("Ichimoku", () => {
  const ich = ichimoku(high, low, close);
  const n = close.length;

  it("tenkan, kijun y chikou iguales a tradex", () => {
    expectSeriesClose(ich.tenkan, ref.tenkan);
    expectSeriesClose(ich.kijun, ref.kijun);
    expectSeriesClose(ich.chikou, ref.chikou);
  });

  it("la nube coincide con tradex en el rango histórico", () => {
    expectSeriesClose(ich.senkouA.slice(0, n), ref.senkou_a);
    expectSeriesClose(ich.senkouB.slice(0, n), ref.senkou_b);
  });

  it("proyecta la nube 26 barras hacia adelante (tradex la perdía)", () => {
    expect(ich.senkouA.length).toBe(n + 26);
    expect(ich.senkouB.length).toBe(n + 26);
    expect(ich.senkouA.slice(n).every((v) => v !== null)).toBe(true);
  });
});

describe("Chop Zone", () => {
  it("mismas zonas que tradex chop_zone", () => {
    const cz = chopZone(high, low, close);
    expect(cz).toEqual(ref.cz);
  });

  it("precio plano da zona 8 en vez de dividir por cero", () => {
    const flat = new Array(60).fill(50);
    const cz = chopZone(flat, flat, flat);
    expect(cz.slice(34).every((z) => z === 8)).toBe(true);
  });

  it("zoneTrend separa dirección y fuerza", () => {
    expect(zoneTrend(0)).toEqual({ direction: "up", strength: 4 });
    expect(zoneTrend(3)).toEqual({ direction: "up", strength: 1 });
    expect(zoneTrend(4)).toEqual({ direction: "down", strength: 4 });
    expect(zoneTrend(7)).toEqual({ direction: "down", strength: 1 });
    expect(zoneTrend(8)).toEqual({ direction: "flat", strength: 0 });
  });

  it("roundHalfEven redondea como numpy", () => {
    expect([0.5, 1.5, 2.5, -0.5, -1.5, 2.4, 2.6].map(roundHalfEven)).toEqual([
      0, 2, 2, -0, -2, 2, 3,
    ]);
  });
});

describe("riesgo", () => {
  it("volatilidad anualizada igual a pandas std()*sqrt(252)", () => {
    expect(annualizedVolatility(close, "1d")).toBeCloseTo(ref.vol_annual, 10);
  });

  it("correlación igual a pandas corr()", () => {
    const other = ref.other as number[];
    expect(correlation(returns(close), returns(other))).toBeCloseTo(ref.corr_other, 10);
  });

  it("drawdown máximo", () => {
    expect(maxDrawdown([100, 120, 90, 130, 65, 140])).toBeCloseTo(-0.5, 12);
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });
});
