// Comparación en pesos: invertir un monto en un ETF frente a CDT renovados con
// las tasas reales de cada momento. Lógica pura para poder probarla y
// reutilizarla en el simulador.

import { annualizedVolatility, maxDrawdown } from "../indicators/risk";
import { rollCdt } from "../rates/cdt-math";

export type DatedValue = { date: string; value: number };

export type PathSummary = {
  final: number;
  totalReturn: number;
  /** Rentabilidad anual compuesta. */
  annualReturn: number;
  maxDrawdown: number;
  volatility: number;
};

export type Comparison = {
  dates: string[];
  etf: number[];
  cdt: number[];
  etfSummary: PathSummary;
  cdtSummary: PathSummary;
  /** Tasa de CDT al inicio (efectiva anual). */
  startRate: number | null;
  converted: boolean;
};

/** Último valor conocido en o antes de cada fecha (rellena hacia adelante). */
export function forwardFill(dates: string[], series: DatedValue[]): (number | null)[] {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const out: (number | null)[] = [];
  let j = 0;
  let last: number | null = null;
  for (const d of dates) {
    while (j < sorted.length && sorted[j].date <= d) last = sorted[j++].value;
    out.push(last);
  }
  return out;
}

/**
 * Tasa que se conocía en una fecha: el promedio del mes anterior (el mes en
 * curso aún no ha terminado). Si no hay, la del mismo mes.
 */
export function rateKnownAt(months: { month: string; rate: number }[]) {
  const byMonth = new Map(months.map((m) => [m.month, m.rate]));
  return (date: string): number | null => {
    const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 1);
    const prev = d.toISOString().slice(0, 7);
    return byMonth.get(prev) ?? byMonth.get(date.slice(0, 7)) ?? null;
  };
}

function summarize(values: number[], dates: string[]): PathSummary {
  const first = values[0];
  const final = values[values.length - 1];
  const days = (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86_400_000;
  const totalReturn = final / first - 1;
  return {
    final,
    totalReturn,
    annualReturn: days > 0 ? (1 + totalReturn) ** (365 / days) - 1 : 0,
    maxDrawdown: maxDrawdown(values),
    volatility: annualizedVolatility(values, "1d"),
  };
}

export function compareCdtVsEtf(input: {
  amount: number;
  /** Precios ajustados del ETF en su moneda. */
  etf: DatedValue[];
  /** Pesos por unidad de la moneda del ETF (null si el ETF ya está en pesos). */
  fx: DatedValue[] | null;
  cdtMonths: { month: string; rate: number }[];
  termDays: number;
  retention: number;
}): Comparison | null {
  const dates = input.etf.map((p) => p.date);
  if (dates.length < 2) return null;

  const fx = input.fx ? forwardFill(dates, input.fx) : dates.map(() => 1);
  // Si el primer día no hay tasa de cambio, usa la primera disponible.
  const firstFx = fx.find((v) => v !== null) ?? null;
  if (firstFx === null) return null;
  const fxFilled = fx.map((v) => v ?? firstFx);

  const etfCop = input.etf.map((p, i) => p.value * fxFilled[i]);
  const etf = etfCop.map((v) => (input.amount * v) / etfCop[0]);

  const rateAt = rateKnownAt(input.cdtMonths);
  const cdt = rollCdt(dates, input.amount, input.termDays, rateAt, input.retention).map((p) => p.value);

  return {
    dates,
    etf,
    cdt,
    etfSummary: summarize(etf, dates),
    cdtSummary: summarize(cdt, dates),
    startRate: rateAt(dates[0]),
    converted: input.fx !== null,
  };
}
