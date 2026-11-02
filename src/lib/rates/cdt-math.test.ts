import { describe, expect, it } from "vitest";
import { buildSnapshot, cleanEntityName, cdtReturn, monthlyAverages, rollCdt, type RawCdtRow } from "./cdt-math";

// Filas reales de datos.gov.co (axk9-g2nh), corte 2026-10-30.
const day30: RawCdtRow[] = [
  { tipoentidad: "1", nombreentidad: "BBVA Colombia", subcuenta: "70", tasa: "11.59", monto: "89568506" },
  { tipoentidad: "1", nombreentidad: "Bancamía S.A.", subcuenta: "70", tasa: "10.17", monto: "133685.45" },
  { tipoentidad: "32", nombreentidad: "Cooperativa Financiera JFK", subcuenta: "70", tasa: "9.59", monto: "1642217.27" },
  { tipoentidad: "1", nombreentidad: "BBVA Colombia", subcuenta: "130", tasa: "12.64", monto: "29718499" },
  { tipoentidad: "4", nombreentidad: "GM Financial Colombia S.A. Compañía De Financiamiento", subcuenta: "140", tasa: "13.5", monto: "550000" },
  // Rangos y totales que no son plazos que mostramos:
  { tipoentidad: "1", nombreentidad: "BBVA Colombia", subcuenta: "80", tasa: "12.0", monto: "100" },
  { tipoentidad: "1", nombreentidad: "BBVA Colombia", subcuenta: "900", tasa: "11.83", monto: "186650449" },
  // La subcuenta 40 también se llama "A 30 DIAS" pero no es la de emisiones a 30 días:
  { tipoentidad: "32", nombreentidad: "Cooperativa Financiera JFK", subcuenta: "40", tasa: "4.42", monto: "24565.98" },
].map((r) => ({ ...r, fechacorte: "2026-10-30T00:00:00.000" }));

describe("buildSnapshot", () => {
  const snap = buildSnapshot([
    ...day30,
    // Un día antes: Banco X solo emitió ese día; BBVA tenía otra tasa.
    { tipoentidad: "1", nombreentidad: "Banco X", subcuenta: "70", tasa: "10.00", monto: "1000", fechacorte: "2026-10-29T00:00:00.000" },
    { tipoentidad: "1", nombreentidad: "BBVA Colombia", subcuenta: "70", tasa: "11.00", monto: "1000", fechacorte: "2026-10-29T00:00:00.000" },
  ]);
  const t90 = snap.find((t) => t.term === "90")!;

  it("se queda con la tasa más reciente de cada entidad y conserva las que no emitieron hoy", () => {
    expect(t90.quotes.map((q) => [q.entity, q.rate, q.date])).toEqual([
      ["BBVA Colombia", 0.1159, "2026-10-30"],
      ["Bancamía S.A.", 0.1017, "2026-10-30"],
      ["Banco X", 0.1, "2026-10-29"],
      ["Cooperativa Financiera JFK", 0.0959, "2026-10-30"],
    ]);
  });

  it("promedia ponderando por monto, como la DTF", () => {
    const expected =
      (0.1159 * 89568506 + 0.1017 * 133685.45 + 0.1 * 1000 + 0.0959 * 1642217.27) /
      (89568506 + 133685.45 + 1000 + 1642217.27);
    expect(t90.average).toBeCloseTo(expected, 12);
  });

  it("ignora rangos, totales y la subcuenta 40", () => {
    expect(snap.find((t) => t.term === "30")!.quotes).toHaveLength(0);
    expect(snap.find((t) => t.term === "360+")!.quotes[0].entityType).toBe(
      "Compañía de financiamiento",
    );
  });
});

describe("monthlyAverages", () => {
  it("promedia por mes ponderando por monto", () => {
    expect(
      monthlyAverages([
        { fechacorte: "2024-01-03T00:00:00.000", tasa: "10", monto: "100" },
        { fechacorte: "2024-01-20T00:00:00.000", tasa: "12", monto: "300" },
        { fechacorte: "2024-02-01T00:00:00.000", tasa: "9", monto: "50" },
        { fechacorte: "2024-02-02T00:00:00.000", tasa: "x", monto: "50" },
      ]),
    ).toEqual([
      { month: "2024-01", rate: 0.115 },
      { month: "2024-02", rate: 0.09 },
    ]);
  });
});

describe("cdtReturn", () => {
  it("360 días con retención del 4 %", () => {
    const r = cdtReturn(10_000_000, 0.12, 365, 0.04, 0.05);
    expect(r.gross).toBeCloseTo(1_200_000, 6);
    expect(r.retention).toBeCloseTo(48_000, 6);
    expect(r.net).toBeCloseTo(1_152_000, 6);
    expect(r.netAnnual).toBeCloseTo(0.1152, 10);
    expect(r.realAnnual!).toBeCloseTo(1.1152 / 1.05 - 1, 10);
  });

  it("90 días convierte la tasa al periodo", () => {
    const r = cdtReturn(1_000_000, 0.1, 90, 0);
    expect(r.gross).toBeCloseTo(1_000_000 * (1.1 ** (90 / 365) - 1), 6);
    expect(r.netAnnual).toBeCloseTo(0.1, 10);
  });
});

describe("rollCdt", () => {
  it("renueva al vencer con la tasa vigente y reinvierte intereses netos", () => {
    const dates = ["2024-01-01", "2024-03-31", "2024-04-01", "2024-06-29", "2024-06-30"];
    const rate = (d: string) => (d < "2024-03-31" ? 0.12 : 0.08);
    const path = rollCdt(dates, 1000, 90, rate, 0);
    // Primer tramo a 12 %, renovado el 2024-03-31 (90 días) al 8 %.
    const afterFirst = 1000 * 1.12 ** (90 / 365);
    expect(path[0].value).toBe(1000);
    expect(path[1].value).toBeCloseTo(afterFirst, 9);
    expect(path[2].value).toBeCloseTo(afterFirst * 1.08 ** (1 / 365), 9);
    // 2024-06-29 cumple 90 días del segundo tramo: vence y se renueva.
    const afterSecond = afterFirst * 1.08 ** (90 / 365);
    expect(path[3].value).toBeCloseTo(afterSecond, 9);
    expect(path[4].value).toBeCloseTo(afterSecond * 1.08 ** (1 / 365), 9);
  });
});

describe("cleanEntityName", () => {
  it("limpia los nombres tal como llegan de datos.gov.co", () => {
    expect(cleanEntityName('BANCO UNIÓN S.A. (en adelante el "Banco" o la "Sociedad")')).toBe(
      "Banco Unión S.A.",
    );
    expect(cleanEntityName('"KOA CF"')).toBe("KOA CF");
    expect(cleanEntityName('"Bold C.F.", "Bold CF S.A.", o "Bold. CF"')).toBe("Bold C.F.");
    expect(cleanEntityName("Lulo Bank S.A.")).toBe("Lulo Bank S.A.");
    expect(cleanEntityName("Banco de Bogotá S.A.")).toBe("Banco de Bogotá S.A.");
  });
});
