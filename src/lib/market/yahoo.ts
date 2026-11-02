import "server-only";

// Adaptador de Yahoo Finance (API de gráficos v8). Es el único archivo que
// conoce a Yahoo: para cambiar de proveedor basta con otro adaptador que
// devuelva lo mismo.

import { localDate } from "./as-of";
import { MarketDataError, type Bar, type InstrumentMeta } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

type YahooChart = {
  chart: {
    result:
      | {
          meta: {
            symbol: string;
            currency?: string;
            exchangeName?: string;
            fullExchangeName?: string;
            instrumentType?: string;
            exchangeTimezoneName?: string;
            longName?: string;
            shortName?: string;
          };
          timestamp?: number[];
          indicators: {
            quote: {
              open: (number | null)[];
              high: (number | null)[];
              low: (number | null)[];
              close: (number | null)[];
              volume: (number | null)[];
            }[];
            adjclose?: { adjclose: (number | null)[] }[];
          };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
};

export type YahooRawSeries = { meta: InstrumentMeta; bars: Bar[] };

/**
 * Descarga barras diarias u horarias entre dos instantes (segundos Unix).
 * Las barras con datos incompletos se descartan.
 */
export async function fetchYahooBars(
  symbol: string,
  interval: "1d" | "1h",
  period1: number,
  period2: number,
): Promise<YahooRawSeries> {
  const params = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval,
    includeAdjustedClose: "true",
    events: "div,split",
  });
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  } catch (e) {
    throw new MarketDataError(`No se pudo contactar a Yahoo: ${String(e)}`, "upstream");
  }

  const body = (await res.json().catch(() => null)) as YahooChart | null;
  const err = body?.chart?.error;
  if (res.status === 404 || err?.code === "Not Found") {
    throw new MarketDataError(`No existe el símbolo ${symbol} en Yahoo Finance.`, "not_found");
  }
  if (!res.ok || !body?.chart?.result?.[0]) {
    throw new MarketDataError(
      `Yahoo respondió ${res.status}${err ? `: ${err.description}` : ""}`,
      "upstream",
    );
  }

  const r = body.chart.result[0];
  const tz = r.meta.exchangeTimezoneName ?? "America/New_York";
  const q = r.indicators.quote[0];
  const adj = r.indicators.adjclose?.[0]?.adjclose;
  const ts = r.timestamp ?? [];

  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const open = q.open[i];
    const high = q.high[i];
    const low = q.low[i];
    const close = q.close[i];
    if (open == null || high == null || low == null || close == null) continue;
    bars.push({
      time: ts[i],
      date: localDate(ts[i], tz),
      open,
      high,
      low,
      close,
      adjClose: adj?.[i] ?? close,
      volume: q.volume[i] ?? 0,
    });
  }

  return {
    meta: {
      symbol: r.meta.symbol,
      name: r.meta.longName ?? r.meta.shortName ?? null,
      currency: r.meta.currency ?? null,
      exchange: r.meta.fullExchangeName ?? r.meta.exchangeName ?? null,
      type: r.meta.instrumentType ?? null,
      timezone: tz,
    },
    bars,
  };
}
