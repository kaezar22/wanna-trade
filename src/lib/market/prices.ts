import "server-only";

import { cacheLife } from "next/cache";
import { addDays, cutAt, dayStartUnix, isISODate } from "./as-of";
import { resample } from "./resample";
import {
  INTERVALS,
  MarketDataError,
  type Interval,
  type ISODate,
  type PriceSeries,
} from "./types";
import { fetchYahooBars } from "./yahoo";

export type PriceQuery = {
  symbol: string;
  interval: Interval;
  /** Primera fecha a incluir. */
  start: ISODate;
  /** Fecha de corte. null = en vivo (hasta ahora). */
  asOf: ISODate | null;
};

const SYMBOL = /^[A-Za-z0-9.\-=^]{1,20}$/;
// Yahoo solo guarda unos 730 días de barras horarias.
const MAX_HOURLY_DAYS = 729;

export function validateQuery(q: PriceQuery): PriceQuery {
  const symbol = q.symbol.trim().toUpperCase();
  if (!SYMBOL.test(symbol)) {
    throw new MarketDataError(`Símbolo no válido: "${q.symbol}".`, "bad_request");
  }
  if (!INTERVALS.includes(q.interval)) {
    throw new MarketDataError(`Intervalo no válido: "${q.interval}".`, "bad_request");
  }
  if (!isISODate(q.start)) {
    throw new MarketDataError("La fecha de inicio debe tener formato AAAA-MM-DD.", "bad_request");
  }
  if (q.asOf !== null) {
    if (!isISODate(q.asOf)) {
      throw new MarketDataError("La fecha de corte debe tener formato AAAA-MM-DD.", "bad_request");
    }
    if (q.asOf < q.start) {
      throw new MarketDataError("La fecha de corte es anterior a la de inicio.", "bad_request");
    }
  }
  return { ...q, symbol };
}

/**
 * Serie de precios hasta la fecha de corte. Ninguna barra posterior a asOf
 * sale de esta función.
 *
 * Nota: Yahoo ajusta los precios históricos por splits posteriores, así que en
 * una fecha pasada el nivel de precio puede no coincidir con el que se veía
 * entonces (p. ej. NVDA antes del split de 2024). Las rentabilidades sí son
 * correctas.
 */
export async function getPriceSeries(query: PriceQuery): Promise<PriceSeries> {
  const q = validateQuery(query);

  if (q.interval === "1h") {
    const end = q.asOf ?? new Date().toISOString().slice(0, 10);
    if (q.start < addDays(end, -MAX_HOURLY_DAYS)) {
      throw new MarketDataError(
        "Yahoo solo tiene datos por hora de los últimos dos años. Usa una fecha de inicio más reciente o el intervalo diario.",
        "bad_request",
      );
    }
  }

  const result = await cachedSeries(q.symbol, q.interval, q.start, q.asOf);
  if (!result.ok) throw new MarketDataError(result.message, result.code);
  return result.series;
}

// Los errores lanzados dentro de "use cache" pierden su tipo al serializarse,
// así que se devuelven como dato y se vuelven a lanzar afuera.
type CachedResult =
  | { ok: true; series: PriceSeries }
  | { ok: false; code: MarketDataError["code"]; message: string };

async function cachedSeries(
  symbol: string,
  interval: Interval,
  start: ISODate,
  asOf: ISODate | null,
): Promise<CachedResult> {
  "use cache";

  const nowSec = Math.floor(Date.now() / 1000);
  const today = new Date(nowSec * 1000).toISOString().slice(0, 10);

  let result: CachedResult;
  try {
    result = { ok: true, series: await loadSeries(symbol, interval, start, asOf, nowSec) };
  } catch (e) {
    if (!(e instanceof MarketDataError)) throw e;
    result = { ok: false, code: e.code, message: e.message };
  }

  // Un solo cacheLife por llamada. Los errores casi no se guardan; cuanto más
  // vieja la fecha de corte, menos cambia la respuesta.
  if (!result.ok) cacheLife("seconds");
  else if (asOf === null) cacheLife("minutes");
  else if (asOf < addDays(today, -7)) cacheLife("max");
  else cacheLife("hours");

  return result;
}

async function loadSeries(
  symbol: string,
  interval: Interval,
  start: ISODate,
  asOf: ISODate | null,
  nowSec: number,
): Promise<PriceSeries> {
  // Pedimos con un margen de 2 días después del corte (zonas horarias) y luego
  // cortamos por fecha local de la bolsa.
  const period1 = dayStartUnix(addDays(start, -1));
  const period2 = asOf ? Math.min(dayStartUnix(addDays(asOf, 2)), nowSec) : nowSec;
  const sourceInterval = interval === "1h" ? "1h" : "1d";

  const raw = await fetchYahooBars(symbol, sourceInterval, period1, period2);
  const inRange = cutAt(raw.bars, asOf).filter((b) => b.date >= start);

  const bars =
    interval === "1wk" || interval === "1mo" ? resample(inRange, interval) : inRange;

  if (bars.length === 0) {
    throw new MarketDataError(
      `No hay datos de ${symbol} entre ${start} y ${asOf ?? "hoy"}.`,
      "not_found",
    );
  }

  return { meta: raw.meta, interval, asOf, bars };
}
