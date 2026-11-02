import { describe, expect, it } from "vitest";
import {
  advance,
  behavior,
  buy,
  cdtValueAt,
  createGame,
  displayName,
  nextWeekday,
  openCdt,
  sell,
  valuate,
  type Game,
  type Quote,
} from "./engine";

const base = () =>
  createGame({
    name: "Prueba",
    startDate: "2024-01-02",
    endDate: "2024-12-31",
    initialCash: 10_000_000,
    universe: ["spy", "ICOLCAP.CL", "SPY"],
    blind: true,
    settings: { commission: 0.01, fxSpread: 0.02, cdtRetention: 0.04 },
    shuffle: (xs) => xs,
  });

const spy = (adj: number, date = "2024-01-02", monthReturn?: number): Quote => ({
  symbol: "SPY",
  currency: "USD",
  close: adj,
  adj,
  date,
  monthReturn,
});
const col = (adj: number, date = "2024-01-02"): Quote => ({
  symbol: "ICOLCAP.CL",
  currency: "COP",
  close: adj,
  adj,
  date,
});

function ok(r: ReturnType<typeof buy>): Game {
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

describe("partida nueva", () => {
  it("limpia el universo y asigna alias", () => {
    const g = base();
    expect(g.universe).toEqual(["SPY", "ICOLCAP.CL"]);
    expect(displayName(g, "SPY")).toBe("Activo A");
    expect(displayName({ ...g, finished: true }, "SPY")).toBe("SPY");
  });
});

describe("compras y ventas", () => {
  it("compra en pesos con comisión", () => {
    const g = ok(buy(base(), col(10_000), 1_000_000, 4000));
    expect(g.cash).toBe(9_000_000);
    expect(g.positions[0].units).toBeCloseTo(99, 10); // (1.000.000 − 1 %) / 10.000
    expect(g.positions[0].costCop).toBe(1_000_000);
  });

  it("compra en dólares paga el diferencial cambiario", () => {
    const g = ok(buy(base(), spy(500), 1_000_000, 4000));
    const units = 990_000 / (500 * 4080);
    expect(g.positions[0].units).toBeCloseTo(units, 12);
    // Valorada al precio de venta: 4000 × (1 − 2 %)
    const v = valuate(g, new Map([["SPY", spy(500)]]), 4000);
    expect(v.total).toBeCloseTo(9_000_000 + units * 500 * 4000, 6);
  });

  it("no deja comprar más de lo que hay en caja ni con precios del futuro", () => {
    expect(buy(base(), col(10), 20_000_000, 1).ok).toBe(false);
    expect(buy(base(), col(10, "2024-01-03"), 1000, 1).ok).toBe(false);
  });

  it("vende la mitad y registra ganancia y días", () => {
    let g = ok(buy(base(), col(10_000), 1_000_000, 1));
    g = advance(g, "2024-03-01");
    g = ok(sell(g, col(12_000, "2024-03-01"), 0.5, 1));
    const t = g.trades.at(-1)!;
    const proceeds = 49.5 * 12_000 * 0.99;
    expect(t.cashCop).toBeCloseTo(proceeds, 6);
    expect(t.realizedCop).toBeCloseTo(proceeds - 500_000, 6);
    expect(t.heldDays).toBe(59);
    expect(g.positions[0].units).toBeCloseTo(49.5, 10);
    expect(g.positions[0].costCop).toBeCloseTo(500_000, 6);
    // Vender todo cierra la posición.
    g = ok(sell(g, col(12_000, "2024-03-01"), 1, 1));
    expect(g.positions).toHaveLength(0);
  });
});

describe("CDT", () => {
  it("se paga al vencer con intereses netos", () => {
    let g = ok(openCdt(base(), { entity: "Banco X", amount: 1_000_000, rate: 0.12, termDays: 90 }));
    expect(g.cash).toBe(9_000_000);
    expect(g.cdts[0].maturity).toBe("2024-04-01");
    const mid = cdtValueAt(g.cdts[0], "2024-02-16", 0.04);
    expect(mid).toBeGreaterThan(1_000_000);
    g = advance(g, "2024-04-05");
    const net = 1_000_000 * (1.12 ** (90 / 365) - 1) * 0.96;
    expect(g.cash).toBeCloseTo(9_000_000 + 1_000_000 + net, 4);
    expect(g.cdts).toHaveLength(0);
    expect(g.trades.at(-1)!.kind).toBe("cdt_mature");
  });
});

describe("reloj", () => {
  it("no pasa de la fecha final ni retrocede", () => {
    const g = base();
    expect(advance(g, "2025-06-01").currentDate).toBe("2024-12-31");
    expect(advance(g, "2023-01-01")).toBe(g);
  });

  it("salta fines de semana", () => {
    expect(nextWeekday("2024-01-05", 1)).toBe("2024-01-08"); // viernes + 1 → lunes
    expect(nextWeekday("2024-01-02", 7)).toBe("2024-01-09");
  });
});

describe("comportamiento", () => {
  it("detecta compras persiguiendo subidas y cuánto se aguantan pérdidas", () => {
    let g = ok(buy(base(), spy(500, "2024-01-02", 0.15), 1_000_000, 4000));
    g = ok(buy(g, col(10_000), 1_000_000, 1));
    g = advance(g, "2024-02-01");
    g = ok(sell(g, col(12_000, "2024-02-01"), 1, 1)); // ganancia tras 30 días
    g = advance(g, "2024-06-01");
    g = ok(sell(g, spy(400, "2024-06-01"), 1, 4000)); // pérdida tras 151 días
    const b = behavior(g);
    expect(b.trades).toBe(4);
    expect(b.chaseBuys).toBe(1);
    expect(b.avgHeldWinners).toBe(30);
    expect(b.avgHeldLosers).toBe(151);
    expect(b.winRate).toBe(0.5);
    expect(b.feesCop).toBeGreaterThan(0);
  });
});
