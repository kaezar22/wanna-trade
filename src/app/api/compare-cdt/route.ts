import type { NextRequest } from "next/server";
import { compareCdtVsEtf } from "@/lib/compare/cdt-vs-etf";
import { addDays, isISODate } from "@/lib/market/as-of";
import { getPriceSeries } from "@/lib/market/prices";
import { MarketDataError } from "@/lib/market/types";
import { CDT_DATA_START, getCdtHistory } from "@/lib/rates/cdt";
import { isCdtTermKey, termByKey } from "@/lib/rates/cdt-math";

// GET /api/compare-cdt?symbol=SPY&desde=2023-01-02&monto=10000000&plazo=90&retencion=0.04
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const symbol = (p.get("symbol") ?? "").trim().toUpperCase();
  const desde = p.get("desde") ?? "";
  const monto = Number(p.get("monto") ?? "10000000");
  const plazo = p.get("plazo") ?? "90";
  const retencion = Number(p.get("retencion") ?? "0.04");
  const today = new Date().toISOString().slice(0, 10);

  if (!symbol) return Response.json({ error: "Elige un ETF o símbolo." }, { status: 400 });
  if (!isISODate(desde) || desde < CDT_DATA_START || desde >= addDays(today, -30)) {
    return Response.json(
      { error: `La fecha de inicio debe estar entre ${CDT_DATA_START} y hace un mes.` },
      { status: 400 },
    );
  }
  if (!Number.isFinite(monto) || monto <= 0 || monto > 1e13) {
    return Response.json({ error: "El monto debe ser un número positivo." }, { status: 400 });
  }
  if (!isCdtTermKey(plazo)) return Response.json({ error: "Plazo no válido." }, { status: 400 });
  if (!Number.isFinite(retencion) || retencion < 0 || retencion > 0.5) {
    return Response.json({ error: "La retención debe estar entre 0 % y 50 %." }, { status: 400 });
  }

  try {
    const etf = await getPriceSeries({ symbol, interval: "1d", start: desde, asOf: null });
    const currency = etf.meta.currency ?? "USD";
    if (currency !== "COP" && currency !== "USD") {
      return Response.json(
        { error: `${symbol} cotiza en ${currency}. Por ahora solo se comparan ETFs en pesos o dólares.` },
        { status: 400 },
      );
    }
    const fx =
      currency === "USD"
        ? await getPriceSeries({ symbol: "COP=X", interval: "1d", start: addDays(desde, -10), asOf: null })
        : null;

    const history = await getCdtHistory(plazo, addDays(desde, -62), today);
    if (!history.ok) return Response.json({ error: history.message }, { status: 502 });

    const comparison = compareCdtVsEtf({
      amount: monto,
      etf: etf.bars.map((b) => ({ date: b.date, value: b.adjClose })),
      fx: fx ? fx.bars.map((b) => ({ date: b.date, value: b.close })) : null,
      cdtMonths: history.data.months,
      termDays: termByKey(plazo).days,
      retention: retencion,
    });
    if (!comparison) {
      return Response.json({ error: "No hay suficientes datos para comparar." }, { status: 404 });
    }

    return Response.json({
      symbol: etf.meta.symbol,
      name: etf.meta.name,
      currency,
      termLabel: termByKey(plazo).label,
      ...comparison,
    });
  } catch (e) {
    if (e instanceof MarketDataError) {
      return Response.json({ error: e.message }, { status: e.code === "bad_request" ? 400 : 502 });
    }
    throw e;
  }
}
