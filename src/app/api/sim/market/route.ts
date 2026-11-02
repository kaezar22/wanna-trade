import type { NextRequest } from "next/server";
import { cutAt, isISODate } from "@/lib/market/as-of";
import { getPriceSeries } from "@/lib/market/prices";
import { MarketDataError } from "@/lib/market/types";
import type { SimAsset, SimMarket } from "@/lib/sim/types";

const MAX_SYMBOLS = 15;

// GET /api/sim/market?symbols=SPY,ICOLCAP.CL&from=2023-01-02&asOf=2024-01-02
// Precios diarios desde `from` hasta la fecha simulada, y nada posterior.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const symbols = [
    ...new Set(
      (p.get("symbols") ?? "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const from = p.get("from") ?? "";
  const asOf = p.get("asOf") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  if (symbols.length === 0 || symbols.length > MAX_SYMBOLS) {
    return Response.json({ error: `Entre 1 y ${MAX_SYMBOLS} símbolos.` }, { status: 400 });
  }
  if (!isISODate(from) || !isISODate(asOf) || from > asOf || asOf > today) {
    return Response.json({ error: "Fechas no válidas." }, { status: 400 });
  }

  // Se pide la serie completa desde `from` (misma clave de caché en toda la
  // partida) y se corta aquí, en el servidor, en la fecha simulada.
  const load = (symbol: string) => getPriceSeries({ symbol, interval: "1d", start: from, asOf: null });

  const [results, fxResult] = await Promise.all([
    Promise.allSettled(symbols.map(load)),
    load("COP=X").then(
      (s) => s,
      () => null,
    ),
  ]);

  const assets: SimAsset[] = [];
  const failed: SimMarket["failed"] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      assets.push({ symbol: symbols[i], meta: r.value.meta, bars: cutAt(r.value.bars, asOf) });
    } else {
      const e = r.reason;
      if (!(e instanceof MarketDataError)) throw e;
      failed.push({ symbol: symbols[i], message: e.message });
    }
  });

  const body: SimMarket = {
    asOf,
    assets,
    fx: fxResult ? cutAt(fxResult.bars, asOf) : [],
    failed,
  };
  return Response.json(body);
}
