import type { Metadata } from "next";
import { Suspense } from "react";
import { Analyzer } from "@/components/analyzer/analyzer";
import { QueryForm } from "@/components/analyzer/query-form";
import { getPriceSeries } from "@/lib/market/prices";
import { isInterval, isRangeKey, rangeStart } from "@/lib/market/ranges";
import { MarketDataError } from "@/lib/market/types";

export const metadata: Metadata = { title: "Analizar" };

export default function Page({ searchParams }: PageProps<"/analizar">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AnalyzerLoader searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyzerLoader({
  searchParams,
}: {
  searchParams: PageProps<"/analizar">["searchParams"];
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const symbol = (one(sp.s) ?? "AAPL").toUpperCase();
  const iv = one(sp.i);
  const rg = one(sp.r);
  const interval = isInterval(iv) ? iv : "1d";
  const range = isRangeKey(rg) ? rg : "1a";

  const key = `${symbol}-${interval}-${range}`;
  const result = await getPriceSeries({
    symbol,
    interval,
    start: rangeStart(range),
    asOf: null,
  }).then(
    (series) => ({ ok: true as const, series }),
    (e: unknown) => {
      if (e instanceof MarketDataError) return { ok: false as const, message: e.message };
      throw e;
    },
  );

  return (
    <div className="space-y-8">
      <QueryForm key={key} symbol={symbol} interval={interval} range={range} />
      {result.ok ? (
        <Analyzer key={key} series={result.series} />
      ) : (
        <div role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-5">
          <p className="font-semibold">No se pudieron cargar los precios de {symbol}</p>
          <p className="mt-1 text-ink-soft">{result.message}</p>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="h-16 w-full max-w-xl rounded-md bg-paper-raised" />
      <div className="h-[460px] w-full rounded-lg border border-grid bg-paper-raised sm:h-[560px]" />
      <p className="sr-only">Cargando precios…</p>
    </div>
  );
}
