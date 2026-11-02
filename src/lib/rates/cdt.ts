import "server-only";

// Tasas de CDT por entidad y plazo, de la Superintendencia Financiera
// (Formato 441), publicadas a diario en datos.gov.co. Dataset axk9-g2nh,
// con datos desde enero de 2018.

import { cacheLife } from "next/cache";
import { addDays, isISODate } from "../market/as-of";
import type { ISODate } from "../market/types";
import {
  CDT_DESCRIPTIONS,
  buildSnapshot,
  monthlyAverages,
  termByKey,
  type CdtTermKey,
  type CdtTermSnapshot,
  type RawCdtRow,
} from "./cdt-math";

const DATASET = "https://www.datos.gov.co/resource/axk9-g2nh.json";
export const CDT_SOURCE_URL =
  "https://www.datos.gov.co/en/Hacienda-y-Cr-dito-P-blico/Tasas-de-inter-s-de-captaci-n-y-operaciones-del-me/axk9-g2nh";
export const CDT_DATA_START = "2018-01-31";

/** Días hacia atrás para buscar la última tasa de cada entidad. */
const WINDOW_DAYS = 10;
const PAGE = 50_000;

export class RatesError extends Error {}

const isoTs = (d: ISODate) => `${d}T00:00:00.000`;
const CDT_FILTER = `upper(nombre_unidad_de_captura) like '%EMISION%CDT%'`;

async function soql<T>(params: Record<string, string>): Promise<T[]> {
  if (process.env.MARKET_DATA_MOCK === "1") return mockCdtRows(params) as T[];
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const res = await fetch(`${DATASET}?${new URLSearchParams(params)}`, {
    headers,
    cache: "no-store",
  }).catch((e) => {
    throw new RatesError(`No se pudo contactar a datos.gov.co: ${String(e)}`);
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new RatesError(`datos.gov.co respondió ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T[];
}

export type CdtSnapshot = {
  /** Fecha de corte pedida (null = la más reciente disponible). */
  asOf: ISODate | null;
  /** Fecha más reciente con datos dentro de la ventana. */
  latestDate: string | null;
  windowStart: string;
  terms: CdtTermSnapshot[];
};

export type CdtResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Tasas de CDT conocidas en una fecha: para cada entidad y plazo, la última
 * observación dentro de los 10 días anteriores a la fecha de corte.
 */
export async function getCdtSnapshot(asOf: ISODate | null): Promise<CdtResult<CdtSnapshot>> {
  "use cache";

  const today = new Date().toISOString().slice(0, 10);
  let result: CdtResult<CdtSnapshot>;

  if (asOf !== null && (!isISODate(asOf) || asOf < CDT_DATA_START)) {
    result = { ok: false, message: `Hay tasas de CDT desde ${CDT_DATA_START}. Elige una fecha posterior.` };
  } else {
    const end = asOf ?? today;
    const windowStart = addDays(end, -WINDOW_DAYS);
    try {
      const rows = await soql<RawCdtRow>({
        $select: "tipoentidad, nombreentidad, fechacorte, subcuenta, tasa, monto",
        $where: `${CDT_FILTER} AND descripcion in (${CDT_DESCRIPTIONS.map((d) => `'${d}'`).join(", ")}) AND fechacorte between '${isoTs(windowStart)}' and '${isoTs(end)}'`,
        $order: "fechacorte DESC",
        $limit: String(PAGE),
      });
      const latestDate = rows[0]?.fechacorte?.slice(0, 10) ?? null;
      result = latestDate
        ? { ok: true, data: { asOf, latestDate, windowStart, terms: buildSnapshot(rows) } }
        : { ok: false, message: `No hay tasas de CDT publicadas entre ${windowStart} y ${end}.` };
    } catch (e) {
      result = { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  if (!result.ok) cacheLife("seconds");
  else if (asOf !== null && asOf < addDays(today, -15)) cacheLife("max");
  else cacheLife("hours");
  return result;
}

export type CdtHistory = { term: CdtTermKey; months: { month: string; rate: number }[] };

/**
 * Tasa promedio ponderada por mes para un plazo, entre dos fechas. Se usa para
 * el gráfico histórico y para renovar CDT en la comparación y el simulador.
 */
export async function getCdtHistory(
  term: CdtTermKey,
  from: ISODate,
  to: ISODate,
): Promise<CdtResult<CdtHistory>> {
  "use cache";

  const today = new Date().toISOString().slice(0, 10);
  const { subcuenta, description: desc } = termByKey(term);
  let result: CdtResult<CdtHistory>;

  try {
    const rows: (RawCdtRow & { fechacorte: string })[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = await soql<RawCdtRow & { fechacorte: string }>({
        $select: "fechacorte, subcuenta, tasa, monto",
        $where: `${CDT_FILTER} AND descripcion = '${desc}' AND fechacorte between '${isoTs(from)}' and '${isoTs(to)}'`,
        $order: "fechacorte",
        $limit: String(PAGE),
        $offset: String(offset),
      });
      rows.push(...page.filter((r) => r.subcuenta === subcuenta));
      if (page.length < PAGE) break;
    }
    result = { ok: true, data: { term, months: monthlyAverages(rows) } };
  } catch (e) {
    result = { ok: false, message: e instanceof Error ? e.message : String(e) };
  }

  if (!result.ok) cacheLife("seconds");
  else if (to < addDays(today, -15)) cacheLife("max");
  else cacheLife("days");
  return result;
}

// Filas simuladas (MARKET_DATA_MOCK=1) con la misma forma que datos.gov.co.
function mockCdtRows(params: Record<string, string>): (RawCdtRow & { fechacorte: string })[] {
  if (params.$offset && params.$offset !== "0") return [];
  const m = /between '(\d{4}-\d{2}-\d{2})T[^']*' and '(\d{4}-\d{2}-\d{2})T/.exec(params.$where ?? "");
  if (!m) return [];
  const [from, to] = [m[1], m[2]];
  const entities = [
    ["1", "Banco Uno S.A."],
    ["1", "Banco Dos Colombia"],
    ["4", "Financiera Tres S.A. Compañía De Financiamiento"],
    ["32", "Cooperativa Financiera Cuatro"],
  ] as const;
  const terms = ["10", "50", "70", "90", "110", "130", "140"];
  const out: (RawCdtRow & { fechacorte: string })[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const t = (Date.parse(d) - Date.parse("2018-01-01")) / 86_400_000;
    const base = 6 + 4 * Math.sin(t / 400) + (t > 1600 ? 3 : 0);
    entities.forEach(([type, name], e) =>
      terms.forEach((sub, k) => {
        if ((e + k + t) % 3 === 0) return; // no todas emiten todos los días
        out.push({
          tipoentidad: type,
          nombreentidad: name,
          fechacorte: `${d}T00:00:00.000`,
          subcuenta: sub,
          tasa: (base + k * 0.35 + e * 0.4).toFixed(2),
          monto: String(1_000_000 * (4 - e)),
        });
      }),
    );
  }
  return out.reverse();
}
