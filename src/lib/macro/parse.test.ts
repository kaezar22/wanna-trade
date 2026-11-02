import { describe, expect, it } from "vitest";
import { changeOver, inflationFromUvr, monthlyLast, parseFredCsv } from "./parse";

describe("FRED", () => {
  it("lee el CSV, descarta faltantes y pasa a fracción", () => {
    const csv = "observation_date,FEDFUNDS\n2024-01-01,5.33\n2024-02-01,.\n2024-03-01,5.33\r\n";
    expect(parseFredCsv(csv)).toEqual([
      { date: "2024-01-01", value: 0.0533 },
      { date: "2024-03-01", value: 0.0533 },
    ]);
  });
});

describe("series", () => {
  it("se queda con el último dato de cada mes", () => {
    expect(
      monthlyLast([
        { date: "2024-01-02", value: 1 },
        { date: "2024-01-31", value: 2 },
        { date: "2024-02-15", value: 3 },
      ]),
    ).toEqual([
      { date: "2024-01-31", value: 2 },
      { date: "2024-02-15", value: 3 },
    ]);
  });

  it("calcula el cambio en 12 meses", () => {
    const pts = [
      { date: "2023-06-01", value: 0.1 },
      { date: "2024-01-01", value: 0.12 },
      { date: "2024-06-01", value: 0.09 },
    ];
    expect(changeOver(pts, 12)).toBeCloseTo(-0.01, 12);
    expect(changeOver(pts, 60)).toBeNull();
  });
});

describe("inflación desde la UVR", () => {
  it("usa el 15 de X+2 y el 15 de X−10", () => {
    const uvr = [
      { date: "2024-01-15", value: 100 },
      { date: "2024-01-16", value: 100.01 },
      { date: "2025-01-15", value: 105 },
      { date: "2025-02-15", value: 105.5 },
    ];
    // 2025-01-15 / 2024-01-15 → inflación anual de noviembre de 2024
    const r = inflationFromUvr(uvr);
    expect(r).toHaveLength(1);
    expect(r[0].date).toBe("2024-11-01");
    expect(r[0].value).toBeCloseTo(0.05, 12);
  });
});
