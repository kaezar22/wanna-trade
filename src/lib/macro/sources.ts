import "server-only";

// Series macro para el contexto económico. Cada una falla por separado: si una
// fuente no responde, las demás se muestran igual.

import { cacheLife } from "next/cache";
import { addDays } from "../market/as-of";
import { getPriceSeries } from "../market/prices";
import { getCdtHistory } from "../rates/cdt";
import { monthlyLast, parseFredCsv, type MacroPoint } from "./parse";

export type MacroSeries = {
  key: string;
  name: string;
  unit: "percent" | "cop";
  source: { label: string; url: string };
  /** Qué significa para quien invierte desde Colombia. */
  meaning: string;
  points: MacroPoint[];
  error?: string;
};

const YEARS = 10;

// Los errores dentro de "use cache" pierden su mensaje: se devuelven como dato.
async function fredSeries(id: string): Promise<{ points: MacroPoint[]; error?: string }> {
  "use cache";
  let result: { points: MacroPoint[]; error?: string };
  try {
    const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, {
      headers: { "User-Agent": "wanna-trade" },
      cache: "no-store",
    });
    result = res.ok ? { points: parseFredCsv(await res.text()) } : { points: [], error: `FRED respondió ${res.status}` };
  } catch (e) {
    result = { points: [], error: `No se pudo contactar a FRED: ${String(e)}` };
  }
  if (result.error) cacheLife("seconds");
  else cacheLife("days");
  return result;
}

export async function getMacro(): Promise<MacroSeries[]> {
  const today = new Date().toISOString().slice(0, 10);
  const from = addDays(today, -365 * YEARS);

  const [cdt, fx, fed] = await Promise.allSettled([
    getCdtHistory("90", from < "2018-01-31" ? "2018-01-31" : from, today),
    getPriceSeries({ symbol: "COP=X", interval: "1d", start: from, asOf: null }),
    fredSeries("FEDFUNDS"),
  ]);

  const err = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : undefined;

  return [
    {
      key: "cdt90",
      name: "Tasa de CDT a 90 días",
      unit: "percent",
      source: {
        label: "Superintendencia Financiera (Formato 441)",
        url: "https://www.datos.gov.co/en/Hacienda-y-Cr-dito-P-blico/Tasas-de-inter-s-de-captaci-n-y-operaciones-del-me/axk9-g2nh",
      },
      meaning:
        "Lo que pagan los bancos por un CDT. Sigue de cerca a la tasa del Banco de la República: cuando sube, la renta fija paga más y las acciones suelen sufrir.",
      points:
        cdt.status === "fulfilled" && cdt.value.ok
          ? cdt.value.data.months.map((m) => ({ date: `${m.month}-01`, value: m.rate }))
          : [],
      error: cdt.status === "fulfilled" ? (cdt.value.ok ? undefined : cdt.value.message) : err(cdt),
    },
    {
      key: "usdcop",
      name: "Dólar en pesos",
      unit: "cop",
      source: { label: "Yahoo Finance (COP=X)", url: "https://finance.yahoo.com/quote/COP%3DX" },
      meaning:
        "Cuántos pesos cuesta un dólar. Si sube, tus inversiones en dólares valen más en pesos; si baja, valen menos.",
      points:
        fx.status === "fulfilled"
          ? monthlyLast(fx.value.bars.map((b) => ({ date: b.date, value: b.close })))
          : [],
      error: err(fx),
    },
    {
      key: "fed",
      name: "Tasa de la Reserva Federal (EE. UU.)",
      unit: "percent",
      source: { label: "FRED, Banco de la Reserva Federal de St. Louis", url: "https://fred.stlouisfed.org/series/FEDFUNDS" },
      meaning:
        "La tasa de referencia de EE. UU. Cuando sube, el dólar tiende a fortalecerse y los mercados emergentes, como Colombia, a sufrir.",
      points: fed.status === "fulfilled" ? fed.value.points.filter((p) => p.date >= from) : [],
      error: fed.status === "fulfilled" ? fed.value.error : err(fed),
    },
  ];
}
