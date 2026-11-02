import { describe, expect, it } from "vitest";
import { cutAt, isISODate, localDate } from "./as-of";
import { resample } from "./resample";
import type { Bar } from "./types";

function bar(date: string, close: number, extra: Partial<Bar> = {}): Bar {
  return {
    time: Date.parse(`${date}T14:30:00Z`) / 1000,
    date,
    open: close,
    high: close,
    low: close,
    close,
    adjClose: close,
    volume: 1,
    ...extra,
  };
}

// Semana del lunes 2024-06-03 al viernes 2024-06-07, y lunes siguiente.
const week = [
  bar("2024-06-03", 10),
  bar("2024-06-04", 11),
  bar("2024-06-05", 12),
  bar("2024-06-06", 99, { high: 120 }), // jueves: no debe verse con corte el miércoles
  bar("2024-06-07", 98),
  bar("2024-06-10", 97),
];

describe("fecha de corte", () => {
  it("incluye el día de corte y nada posterior", () => {
    const cut = cutAt(week, "2024-06-05");
    expect(cut.map((b) => b.date)).toEqual(["2024-06-03", "2024-06-04", "2024-06-05"]);
  });

  it("sin fecha de corte devuelve todo", () => {
    expect(cutAt(week, null)).toHaveLength(week.length);
  });

  it("la semana parcial no filtra precios del futuro", () => {
    const weekly = resample(cutAt(week, "2024-06-05"), "1wk");
    expect(weekly).toHaveLength(1);
    expect(weekly[0].close).toBe(12);
    expect(weekly[0].high).toBe(12); // el máximo de 120 del jueves no aparece
    expect(weekly[0].date).toBe("2024-06-05");
  });

  it("agrupa semanas y meses completos", () => {
    const weekly = resample(week, "1wk");
    expect(weekly.map((b) => [b.date, b.open, b.close, b.high])).toEqual([
      ["2024-06-07", 10, 98, 120],
      ["2024-06-10", 97, 97, 97],
    ]);
    const monthly = resample([bar("2024-05-31", 5), ...week], "1mo");
    expect(monthly.map((b) => b.date)).toEqual(["2024-05-31", "2024-06-10"]);
  });

  it("usa la fecha local de la bolsa, no la UTC", () => {
    // 2024-06-05 23:30 en Bogotá ya es 6 de junio en UTC
    const t = Date.parse("2024-06-06T04:30:00Z") / 1000;
    expect(localDate(t, "America/Bogota")).toBe("2024-06-05");
    expect(localDate(t, "UTC")).toBe("2024-06-06");
  });

  it("valida fechas", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2024-6-1")).toBe(false);
  });
});
