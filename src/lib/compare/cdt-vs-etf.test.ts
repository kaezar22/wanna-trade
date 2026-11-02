import { describe, expect, it } from "vitest";
import { compareCdtVsEtf, forwardFill, rateKnownAt } from "./cdt-vs-etf";

describe("forwardFill", () => {
  it("usa el último valor conocido y null antes del primero", () => {
    expect(
      forwardFill(
        ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-05"],
        [
          { date: "2024-01-02", value: 4000 },
          { date: "2024-01-04", value: 4100 },
        ],
      ),
    ).toEqual([null, 4000, 4000, 4100]);
  });
});

describe("rateKnownAt", () => {
  const at = rateKnownAt([
    { month: "2024-01", rate: 0.12 },
    { month: "2024-02", rate: 0.11 },
  ]);
  it("usa el mes anterior, que ya terminó", () => {
    expect(at("2024-02-15")).toBe(0.12);
    expect(at("2024-03-01")).toBe(0.11);
  });
  it("si no hay mes anterior usa el mismo mes", () => {
    expect(at("2024-01-20")).toBe(0.12);
    expect(at("2023-06-01")).toBeNull();
  });
});

describe("compareCdtVsEtf", () => {
  it("convierte el ETF a pesos con la tasa de cambio del día", () => {
    const r = compareCdtVsEtf({
      amount: 1_000_000,
      etf: [
        { date: "2024-01-02", value: 100 },
        { date: "2024-01-03", value: 110 }, // +10 % en dólares
      ],
      fx: [
        { date: "2024-01-02", value: 4000 },
        { date: "2024-01-03", value: 3600 }, // el peso se revalúa 10 %
      ],
      cdtMonths: [{ month: "2024-01", rate: 0.12 }],
      termDays: 90,
      retention: 0.04,
    })!;
    expect(r.etf[0]).toBe(1_000_000);
    expect(r.etf[1]).toBeCloseTo(1_000_000 * ((110 * 3600) / (100 * 4000)), 6); // −1 % en pesos
    expect(r.cdt[1]).toBeGreaterThan(1_000_000);
    expect(r.startRate).toBe(0.12);
    expect(r.converted).toBe(true);
  });
});
