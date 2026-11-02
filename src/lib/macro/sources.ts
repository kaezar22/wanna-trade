import "server-only";

// Series macro para el contexto económico. Cada una falla por separado: si una
// fuente no responde, las demás se muestran igual.

import { cacheLife } from "next/cache";
import { addDays } from "../market/as-of";
import { getPriceSeries } from "../market/prices";
import { getCdtHistory } from "../rates/cdt";
import { inflationFromUvr, monthlyLast, parseFredCsv, type MacroPoint } from "./parse";
import { parseSdmxJson, parseSdmxXml, parseSdmxXmlSeries } from "./sdmx";

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

const BANREP = "https://totoro.banrep.gov.co/nsi-jax-ws/rest/data";

/**
 * Serie de la API SDMX del Banco de la República, leída como SDMX-ML (con
 * respaldo SDMX-JSON). Las tasas vienen en porcentaje: `scale` = 0.01 las pasa a fracción.
 */
async function banrepSeries(
  flow: string,
  start: string,
  scale = 0.01,
  /** Si llegan varias series, usar solo las cuyo último valor supere este número. */
  minLast?: number,
): Promise<{ points: MacroPoint[]; error?: string }> {
  "use cache";
  // La API responde SDMX-ML genérico con application/xml (JSON da 406). Las
  // series diarias pueden no aceptar todos los formatos de fecha, así que se
  // prueban varias formas de pedir el periodo.
  const queries = [`startPeriod=${start}`, `startPeriod=${start.slice(0, 4)}`, "lastNObservations=4500", ""];
  const failures: string[] = [];
  let result: { points: MacroPoint[]; error?: string } | null = null;

  for (const q of queries) {
    const url = `${BANREP}/${flow}/all/all${q ? `?${q}` : ""}`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/xml", "User-Agent": "wanna-trade" }, cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        failures.push(`${q || "sin filtro"}: ${res.status}`);
        continue;
      }
      let points = parseSdmxXml(text, scale, minLast === undefined ? undefined : (x) => (x.points.at(-1)?.value ?? -Infinity) > minLast);
      if (!points.length && text.trim().startsWith("{")) points = parseSdmxJson(JSON.parse(text), scale);
      if (points.length) {
        result = { points };
        break;
      }
      // Diagnóstico: qué series llegaron y cómo se ve una observación.
      const found = parseSdmxXmlSeries(text, scale)
        .map((x) => `${Object.values(x.key).join(".") || "?"} (${x.points.length} datos, último ${x.points.at(-1)?.value ?? "—"})`)
        .join(", ");
      const obs = /<(?:\w+:)?Obs\b[\s\S]{0,300}/.exec(text)?.[0] ?? "sin <Obs>";
      failures.push(`${q || "sin filtro"}: sin datos legibles (series: ${found}; ejemplo: ${obs.replace(/\s+/g, " ")})`);
    } catch (e) {
      failures.push(`${q || "sin filtro"}: ${String(e)}`);
    }
  }
  result ??= { points: [], error: `El Banco de la República no entregó la serie ${flow}. Intentos: ${failures.join("; ")}` };
  if (result.error) cacheLife("seconds");
  else cacheLife("days");
  return result;
}

export async function getMacro(): Promise<MacroSeries[]> {
  const today = new Date().toISOString().slice(0, 10);
  const from = addDays(today, -365 * YEARS);

  const [tpm, uvr, cdt, fx, fed] = await Promise.allSettled([
    banrepSeries("DF_CBR_MONTHLY_HIST", from.slice(0, 7)),
    // La respuesta trae la UVR en pesos y su variación anual: se usa la del nivel (≈ 400 pesos).
    banrepSeries("DF_UVR_DAILY_HIST", addDays(from, -400), 1, 50),
    getCdtHistory("90", from < "2018-01-31" ? "2018-01-31" : from, today),
    getPriceSeries({ symbol: "COP=X", interval: "1d", start: from, asOf: null }),
    fredSeries("FEDFUNDS"),
  ]);

  const err = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : undefined;

  return [
    {
      key: "tpm",
      name: "Tasa del Banco de la República",
      unit: "percent",
      source: {
        label: "Banco de la República, tasa de política monetaria (promedio mensual)",
        url: "https://www.banrep.gov.co/es/glosario/tasa-interes-politica-monetaria",
      },
      meaning:
        "La tasa a la que el Banco de la República presta a los bancos. La sube para frenar la inflación y la baja para impulsar la economía. Arrastra a las tasas de los CDT y de los créditos.",
      points: tpm.status === "fulfilled" ? tpm.value.points : [],
      error: tpm.status === "fulfilled" ? tpm.value.error : err(tpm),
    },
    {
      key: "inflation",
      name: "Inflación anual en Colombia",
      unit: "percent",
      source: {
        label: "Calculada con la UVR del Banco de la República, que se ajusta con el IPC del DANE",
        url: "https://www.datos.gov.co/d/mtic-nvgq",
      },
      meaning:
        "Cuánto subieron los precios en 12 meses. Lo que ganas por encima de este número es tu rentabilidad real; un CDT que paga menos que la inflación te hace perder poder de compra.",
      points: uvr.status === "fulfilled" ? inflationFromUvr(uvr.value.points).filter((p) => p.date >= from) : [],
      error: uvr.status === "fulfilled" ? uvr.value.error : err(uvr),
    },
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
