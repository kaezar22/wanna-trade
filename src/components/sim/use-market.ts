"use client";

import { useMemo } from "react";
import { addDays } from "@/lib/market/as-of";
import type { Game, Quote } from "@/lib/sim/engine";
import type { SimAsset, SimBenchmarks, SimMarket } from "@/lib/sim/types";
import { useApi } from "../use-api";

/** Días de historia previa que se muestran antes del inicio de la partida. */
const LOOKBACK_DAYS = 365;

export function quoteFrom(asset: SimAsset): Quote | null {
  const bars = asset.bars;
  const last = bars.at(-1);
  if (!last) return null;
  const currency = asset.meta.currency === "COP" ? "COP" : asset.meta.currency === "USD" ? "USD" : null;
  if (!currency) return null;
  const monthAgo = bars.at(-22);
  return {
    symbol: asset.symbol,
    currency,
    close: last.close,
    adj: last.adjClose,
    date: last.date,
    monthReturn: monthAgo ? last.adjClose / monthAgo.adjClose - 1 : undefined,
  };
}

/** Precios de la partida hasta la fecha simulada (nunca después). */
export function useSimMarket(game: Game) {
  const url = `/api/sim/market?${new URLSearchParams({
    symbols: game.universe.join(","),
    from: addDays(game.startDate, -LOOKBACK_DAYS),
    asOf: game.currentDate,
  })}`;
  const { data, error, loading } = useApi<SimMarket>(url);

  return useMemo(() => {
    const current = data && data.asOf === game.currentDate ? data : null;
    const quotes = new Map<string, Quote>();
    const unsupported: string[] = [];
    for (const a of current?.assets ?? []) {
      const q = quoteFrom(a);
      if (q) quotes.set(a.symbol, q);
      else unsupported.push(a.symbol);
    }
    const fx = current?.fx.at(-1)?.close ?? null;
    return { market: current, quotes, fx, unsupported, error, loading: loading || (!current && !error) };
  }, [data, error, loading, game.currentDate]);
}

export function useBenchmarks(game: Game) {
  return useApi<SimBenchmarks>(
    `/api/sim/benchmarks?${new URLSearchParams({
      from: game.startDate,
      asOf: game.currentDate,
      amount: String(game.initialCash),
    })}`,
  );
}
