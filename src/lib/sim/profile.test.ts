import { describe, expect, it } from "vitest";
import { advance, buy, createGame, finish, recordValue, sell, type Game, type Quote } from "./engine";
import { buildProfile } from "./profile";

const q = (adj: number, date: string, monthReturn?: number): Quote => ({
  symbol: "ICOLCAP.CL",
  currency: "COP",
  close: adj,
  adj,
  date,
  monthReturn,
});

function ok(r: { ok: true; game: Game } | { ok: false; error: string }) {
  if (!r.ok) throw new Error(r.error);
  return r.game;
}

function played(finalValue: number, spy: number, opts: { chase?: boolean; loserDays?: number } = {}) {
  let g = createGame({
    name: "x",
    startDate: "2024-01-02",
    endDate: "2024-12-31",
    initialCash: 1_000_000,
    universe: ["ICOLCAP.CL"],
    blind: false,
    settings: { commission: 0.01, fxSpread: 0 },
  });
  g = ok(buy(g, q(100, "2024-01-02", opts.chase ? 0.2 : 0), 500_000, 1));
  const sellDate = opts.loserDays ? "2024-07-01" : "2024-01-31";
  g = advance(g, sellDate);
  g = ok(sell(g, q(opts.loserDays ? 80 : 120, sellDate), 1, 1));
  g = advance(g, "2024-12-31");
  g = recordValue(g, finalValue);
  return { ...finish(g), benchmarkFinals: { spy, cdt: 1_100_000 } };
}

describe("perfil de decisiones", () => {
  it("sin partidas terminadas no hay perfil", () => {
    expect(buildProfile([])).toBeNull();
  });

  it("detecta que aguantas pérdidas, persigues subidas y te gana el índice", () => {
    const p = buildProfile([
      played(1_050_000, 1_200_000, { chase: true }),
      played(900_000, 1_100_000, { chase: true, loserDays: 181 }),
    ])!;
    expect(p.games).toBe(2);
    expect(p.avgReturn).toBeCloseTo(-0.025, 10);
    expect(p.vsSpy).toEqual({ beat: 0, of: 2 });
    expect(p.avgHeldWinners).toBe(29);
    expect(p.avgHeldLosers).toBe(181);
    expect(p.chaseRate).toBe(1);
    const titles = p.insights.map((i) => i.title);
    expect(titles).toContain("Aguantas las pérdidas");
    expect(titles).toContain("Persigues subidas");
    expect(titles).toContain("El índice te gana");
    expect(titles).toContain("No usas renta fija");
  });
});
