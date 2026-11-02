import type { NextRequest } from "next/server";
import { getPriceSeries } from "@/lib/market/prices";
import { MarketDataError, type Interval } from "@/lib/market/types";

// GET /api/prices?symbol=AAPL&interval=1d&start=2023-01-01&asOf=2024-06-28
// asOf es opcional: sin él, la serie llega hasta ahora.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const asOf = p.get("asOf");

  try {
    const series = await getPriceSeries({
      symbol: p.get("symbol") ?? "",
      interval: (p.get("interval") ?? "1d") as Interval,
      start: p.get("start") ?? defaultStart(),
      asOf: asOf && asOf !== "" ? asOf : null,
    });
    return Response.json(series);
  } catch (e) {
    if (e instanceof MarketDataError) {
      const status = e.code === "bad_request" ? 400 : e.code === "not_found" ? 404 : 502;
      return Response.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}

function defaultStart() {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
