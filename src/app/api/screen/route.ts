import type { NextRequest } from "next/server";
import { getPriceSeries } from "@/lib/market/prices";
import { isInterval, isRangeKey, rangeStart } from "@/lib/market/ranges";
import { MIN_BARS, screen } from "@/lib/market/screen";
import { MarketDataError, type PriceSeries } from "@/lib/market/types";

const MAX_TICKERS = 30;
const CONCURRENCY = 5;

// GET /api/screen?t=AAPL,MSFT,SPY&i=1d&r=1a
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const tickers = [
    ...new Set(
      (p.get("t") ?? "")
        .split(/[\s,;]+/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const iv = p.get("i");
  const rg = p.get("r");
  const interval = isInterval(iv) ? iv : "1d";
  const range = isRangeKey(rg) ? rg : "1a";

  if (tickers.length === 0) {
    return Response.json({ error: "Escribe al menos un símbolo." }, { status: 400 });
  }
  if (tickers.length > MAX_TICKERS) {
    return Response.json(
      { error: `Máximo ${MAX_TICKERS} símbolos por comparación.` },
      { status: 400 },
    );
  }

  const start = rangeStart(range);
  const loaded: PriceSeries[] = [];
  const failed: { symbol: string; message: string }[] = [];

  // Descarga en grupos pequeños para no saturar al proveedor.
  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    const batch = tickers.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((symbol) => getPriceSeries({ symbol, interval, start, asOf: null })),
    );
    results.forEach((r, j) => {
      if (r.status === "fulfilled") {
        if (r.value.bars.length < MIN_BARS) {
          failed.push({
            symbol: batch[j],
            message: `Solo hay ${r.value.bars.length} periodos; se necesitan al menos ${MIN_BARS}. Usa un periodo más largo o un intervalo más corto.`,
          });
        } else {
          loaded.push(r.value);
        }
      } else {
        const e = r.reason;
        if (!(e instanceof MarketDataError)) throw e;
        failed.push({ symbol: batch[j], message: e.message });
      }
    });
  }

  return Response.json({ ...screen(loaded, interval), failed, interval, range });
}
