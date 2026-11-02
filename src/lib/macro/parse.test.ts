import { describe, expect, it } from "vitest";
import { changeOver, monthlyLast, parseFredCsv } from "./parse";

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
