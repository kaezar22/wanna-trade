"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { describeTrend } from "@/lib/indicators/describe";
import { formatNumber, formatPercent } from "@/lib/format";
import { INTERVAL_LABELS, RANGES, isInterval, isRangeKey, type RangeKey } from "@/lib/market/ranges";
import type { ScreenResult } from "@/lib/market/screen";
import { INTERVALS, type Interval } from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Response = ScreenResult & { failed: { symbol: string; message: string }[] };

const DEFAULT_TICKERS =
  "AAPL, MSFT, NVDA, AMZN, GOOGL, JPM, V, PG, XOM, KO, SPY, GLD, TLT, ICOLCAP.CL";

export function Screener() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlTickers = params.get("t");
  const iv = params.get("i");
  const rg = params.get("r");
  const [text, setText] = useState(urlTickers?.replaceAll(",", ", ") ?? DEFAULT_TICKERS);
  const [interval, setInterval] = useState<Interval>(isInterval(iv) ? iv : "1d");
  const [range, setRange] = useState<RangeKey>(isRangeKey(rg) ? rg : "1a");

  // La URL es la fuente de verdad: así se puede compartir o volver atrás.
  const query = urlTickers
    ? new URLSearchParams({ t: urlTickers, i: iv ?? "1d", r: rg ?? "1a" }).toString()
    : null;
  const [result, setResult] = useState<{
    query: string;
    data?: Response;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    fetch(`/api/screen?${query}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "No se pudo completar la comparación.");
        setResult({ query, data: body });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setResult({ query, error: e.message });
      });
    return () => ctrl.abort();
  }, [query]);

  const loading = query !== null && result?.query !== query;
  const data = !loading ? (result?.data ?? null) : null;
  const error = !loading ? (result?.error ?? null) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const tickers = text
      .split(/[\s,;]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .join(",");
    if (!tickers) return;
    router.push(`${pathname}?${new URLSearchParams({ t: tickers, i: interval, r: range })}`);
  };

  const selected = data?.rows.filter((r) => r.selected) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-extrabold">Comparar instrumentos</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Ordena por tendencia (Chop Zone) y elige hasta 5 que se muevan distinto entre sí, para no
          concentrar el riesgo en instrumentos que suben y bajan juntos.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Símbolos de Yahoo Finance, separados por comas (máximo 30)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            spellCheck={false}
            className="w-full rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
          />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Intervalo
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as Interval)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
            >
              {INTERVALS.map((v) => (
                <option key={v} value={v}>
                  {INTERVAL_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Periodo
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
            >
              {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                <option key={k} value={k}>
                  {RANGES[k].label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Comparando…" : "Comparar"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          <section aria-labelledby="results">
            <h2 id="results" className="text-lg font-semibold">
              Resultados
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Marcados con ✓ los {selected.length} elegidos: los mejores en tendencia que no tienen
              correlación de 0,5 o más con otro elegido. Correlación calculada sobre{" "}
              {data.commonPeriods} periodos en común.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-grid text-ink-soft">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Elegido</th>
                    <th className="py-2 pr-3 font-medium">Símbolo</th>
                    <th className="py-2 pr-3 font-medium">Tendencia</th>
                    <th className="py-2 pr-3 text-right font-medium">Rentabilidad</th>
                    <th className="py-2 pr-3 text-right font-medium">Volatilidad</th>
                    <th className="py-2 pr-3 text-right font-medium">Caída máx.</th>
                    <th className="py-2 text-right font-medium">Sharpe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grid">
                  {data.rows.map((r) => (
                    <tr key={r.symbol} className={cn(r.selected && "bg-paper-raised")}>
                      <td className="py-2 pr-3">
                        {r.selected ? <span aria-label="Elegido">✓</span> : null}
                      </td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/analizar?${new URLSearchParams({ s: r.symbol, i: interval, r: range })}`}
                          className="font-semibold text-cobalt underline-offset-4 hover:underline"
                        >
                          {r.symbol}
                        </Link>
                        {r.name && r.name !== r.symbol && (
                          <span className="block text-xs text-ink-soft">{r.name}</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-3",
                          r.trend?.direction === "up" && "text-up",
                          r.trend?.direction === "down" && "text-down",
                        )}
                      >
                        {r.trend ? describeTrend(r.trend) : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-3 text-right",
                          r.totalReturn >= 0 ? "text-up" : "text-down",
                        )}
                      >
                        {formatPercent(r.totalReturn, true)}
                      </td>
                      <td className="py-2 pr-3 text-right">{formatPercent(r.volatility)}</td>
                      <td className="py-2 pr-3 text-right">{formatPercent(r.maxDrawdown)}</td>
                      <td className="py-2 text-right">{formatNumber(r.sharpe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.failed.length > 0 && (
              <div className="mt-4 text-sm text-ink-soft">
                <p className="font-medium text-ink">No se incluyeron:</p>
                <ul className="mt-1 list-disc pl-5">
                  {data.failed.map((f) => (
                    <li key={f.symbol}>
                      <span className="font-medium text-ink">{f.symbol}</span>: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {selected.length > 1 && (
            <CorrelationGrid data={data} symbols={selected.map((r) => r.symbol)} />
          )}
        </>
      )}
    </div>
  );
}

function cellColor(v: number) {
  // Divergente: azul (se mueven opuesto) — neutro — rojo (se mueven igual).
  const a = Math.min(1, Math.abs(v));
  return v >= 0 ? `rgba(194, 65, 58, ${0.12 + a * 0.6})` : `rgba(40, 72, 200, ${0.12 + a * 0.6})`;
}

function CorrelationGrid({ data, symbols }: { data: Response; symbols: string[] }) {
  const idx = new Map(data.correlation.symbols.map((s, i) => [s, i]));
  return (
    <section aria-labelledby="corr">
      <h2 id="corr" className="text-lg font-semibold">
        Correlación entre los elegidos
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        1 significa que se mueven igual, 0 que no tienen relación y −1 que se mueven al revés.
        Rojo más intenso, más se parecen.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th />
              {symbols.map((s) => (
                <th key={s} scope="col" className="px-2 py-1 font-medium text-ink-soft">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((row) => (
              <tr key={row}>
                <th scope="row" className="py-1 pr-3 text-left font-medium text-ink-soft">
                  {row}
                </th>
                {symbols.map((col) => {
                  const v = data.correlation.values[idx.get(row)!][idx.get(col)!];
                  return (
                    <td
                      key={col}
                      className="h-12 w-20 text-center font-medium"
                      style={{ background: cellColor(v) }}
                    >
                      {formatNumber(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
