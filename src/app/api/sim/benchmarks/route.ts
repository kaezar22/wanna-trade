import type { NextRequest } from "next/server";
import { compareCdtVsEtf } from "@/lib/compare/cdt-vs-etf";
import { addDays, cutAt, isISODate } from "@/lib/market/as-of";
import { getPriceSeries } from "@/lib/market/prices";
import { getCdtHistory } from "@/lib/rates/cdt";
import type { SimBenchmarks } from "@/lib/sim/types";


// GET /api/sim/benchmarks?from=2023-01-02&asOf=2024-01-02&amount=10000000
// Qué habría pasado con el mismo capital en el S&P 500, el COLCAP o CDT a 90
// días, desde el inicio de la partida hasta la fecha simulada.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const from = p.get("from") ?? "";
  const asOf = p.get("asOf") ?? "";
  const amount = Number(p.get("amount") ?? "10000000");
  const today = new Date().toISOString().slice(0, 10);

  if (!isISODate(from) || !isISODate(asOf) || from > asOf || asOf > today || !(amount > 0)) {
    return Response.json({ error: "Parámetros no válidos." }, { status: 400 });
  }

  const load = (symbol: string) =>
    getPriceSeries({ symbol, interval: "1d", start: from, asOf: null }).then(
      (s) => cutAt(s.bars, asOf),
      () => null,
    );

  const [spy, icolcap, fx, history] = await Promise.all([
    load("SPY"),
    load("ICOLCAP.CL"),
    getPriceSeries({ symbol: "COP=X", interval: "1d", start: addDays(from, -10), asOf: null }).then(
      (s) => cutAt(s.bars, asOf),
      () => null,
    ),
    getCdtHistory("90", addDays(from, -62), asOf),
  ]);

  const months = history.ok ? history.data.months : [];
  const common = { amount, cdtMonths: months, termDays: 90, retention: 0.04 };

  const spyCmp =
    spy && fx
      ? compareCdtVsEtf({
          ...common,
          etf: spy.map((b) => ({ date: b.date, value: b.adjClose })),
          fx: fx.map((b) => ({ date: b.date, value: b.close })),
        })
      : null;
  const colCmp = icolcap
    ? compareCdtVsEtf({ ...common, etf: icolcap.map((b) => ({ date: b.date, value: b.adjClose })), fx: null })
    : null;

  const cdtSource = spyCmp ?? colCmp;
  const body: SimBenchmarks = {
    spy: spyCmp ? { dates: spyCmp.dates, values: spyCmp.etf } : null,
    icolcap: colCmp ? { dates: colCmp.dates, values: colCmp.etf } : null,
    cdt: cdtSource && months.length ? { dates: cdtSource.dates, values: cdtSource.cdt } : null,
  };
  return Response.json(body);
}
