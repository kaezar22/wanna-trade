"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  STRATEGY_LABELS,
  STRATEGY_RULES,
  backtest,
  type BacktestResult,
  type Strategy,
} from "@/lib/backtest/engine";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { RANGES, isRangeKey, rangeStart, type RangeKey } from "@/lib/market/ranges";
import type { Interval, PriceSeries } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { LineChart, type LineSpec } from "../charts/line-chart";
import { useApi } from "../use-api";

type Kind = Strategy["kind"];
const KINDS: Kind[] = ["sma_cross", "chop_trend", "bollinger_revert"];
const OTHER_SYMBOLS = ["SPY", "QQQ", "ICOLCAP.CL", "GLD", "TLT", "EEM"];
const BT_RANGES: RangeKey[] = ["1a", "2a", "5a", "10a"];

function strategyFrom(kind: Kind, fast: number, slow: number): Strategy {
  if (kind === "sma_cross") return { kind, fast, slow };
  if (kind === "bollinger_revert") return { kind, length: 20, k: 2 };
  if (kind === "chop_trend") return { kind };
  return { kind: "buy_hold" };
}

function pricesUrl(symbol: string, interval: Interval, range: RangeKey) {
  return `/api/prices?${new URLSearchParams({ symbol, interval, start: rangeStart(range) })}`;
}

export function Backtester() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const p = {
    symbol: (params.get("s") ?? "SPY").toUpperCase(),
    kind: (KINDS as string[]).includes(params.get("e") ?? "") ? (params.get("e") as Kind) : "sma_cross",
    fast: Number(params.get("f") ?? 50) || 50,
    slow: Number(params.get("l") ?? 200) || 200,
    range: isRangeKey(params.get("r")) ? (params.get("r") as RangeKey) : "5a",
    interval: (params.get("i") === "1wk" ? "1wk" : "1d") as Interval,
    commission: Number(params.get("c") ?? 0.5),
  };

  const [form, setForm] = useState(p);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data, error, loading } = useApi<PriceSeries>(pricesUrl(p.symbol, p.interval, p.range));
  const strategy = useMemo(() => strategyFrom(p.kind, p.fast, p.slow), [p.kind, p.fast, p.slow]);
  const opts = useMemo(() => ({ commission: p.commission / 100, interval: p.interval }), [p.commission, p.interval]);

  const result = useMemo(() => (data ? backtest(data.bars, strategy, opts) : null), [data, strategy, opts]);
  const hold = useMemo(() => (data ? backtest(data.bars, { kind: "buy_hold" }, opts) : null), [data, opts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams({
      s: form.symbol.trim().toUpperCase() || "SPY",
      e: form.kind,
      f: String(form.fast),
      l: String(form.slow),
      r: form.range,
      i: form.interval,
      c: String(form.commission),
    });
    router.push(`${pathname}?${sp}`, { scroll: false });
  };

  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h1 className="display text-3xl font-extrabold">Probar una estrategia</h1>
        <p className="mt-2 text-ink-soft">
          Aplica una regla simple al pasado y compárala con comprar y mantener. La señal se calcula
          con el cierre de un día y se ejecuta al cierre del siguiente, así que nunca usa información
          del futuro.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Símbolo
            <input
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              spellCheck={false}
              className="w-36 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Estrategia
            <select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as Kind)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {STRATEGY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          {form.kind === "sma_cross" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Media rápida
                <input
                  type="number"
                  min={2}
                  max={200}
                  value={form.fast}
                  onChange={(e) => set("fast", Number(e.target.value))}
                  className="w-24 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink-soft">
                Media lenta
                <input
                  type="number"
                  min={3}
                  max={400}
                  value={form.slow}
                  onChange={(e) => set("slow", Number(e.target.value))}
                  className="w-24 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Periodo
            <select
              value={form.range}
              onChange={(e) => set("range", e.target.value as RangeKey)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            >
              {BT_RANGES.map((k) => (
                <option key={k} value={k}>
                  {RANGES[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Velas
            <select
              value={form.interval}
              onChange={(e) => set("interval", e.target.value as Interval)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            >
              <option value="1d">Diarias</option>
              <option value="1wk">Semanales</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Comisión (%)
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={form.commission}
              onChange={(e) => set("commission", Number(e.target.value))}
              className="w-24 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
          </label>
          <button type="submit" className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90">
            Probar
          </button>
        </div>
        <p className="text-sm text-ink-soft">{STRATEGY_RULES[form.kind]}</p>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
          {error}
        </p>
      )}
      {loading && <div aria-busy="true" className="h-[360px] rounded-lg border border-grid bg-paper-raised" />}
      {result && hold && data && (
        <Report symbol={data.meta.symbol} result={result} hold={hold} label={STRATEGY_LABELS[p.kind]} />
      )}

      {result && (
        <Robustness key={`${p.kind}-${p.fast}-${p.slow}-${p.range}-${p.interval}-${p.commission}`} strategy={strategy} range={p.range} interval={p.interval} commission={p.commission} current={p.symbol} />
      )}

      <aside className="border-l-4 border-cut py-1 pl-4">
        <p className="text-sm font-semibold">Ojo con el sobreajuste</p>
        <p className="mt-1 max-w-3xl">
          Si pruebas muchos parámetros hasta encontrar el que mejor le fue a un activo, casi siempre
          encuentras uno bueno por pura suerte. Una regla vale la pena si funciona en varios activos y
          periodos sin retocarla. Luego pruébala a ciegas en el{" "}
          <Link href="/simular" className="text-cobalt underline underline-offset-4">
            simulador
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}

function Report({ symbol, result, hold, label }: { symbol: string; result: BacktestResult; hold: BacktestResult; label: string }) {
  const lines = useMemo<LineSpec[]>(
    () => [
      { name: label, color: "var(--cobalt)", data: result.dates.map((d, i) => ({ time: d, value: result.equity[i] - 1 })) },
      { name: "Comprar y mantener", color: "var(--ink-soft)", data: hold.dates.map((d, i) => ({ time: d, value: hold.equity[i] - 1 })) },
    ],
    [result, hold, label],
  );
  const m = result.metrics;
  const h = hold.metrics;
  const beat = m.totalReturn > h.totalReturn;

  return (
    <section aria-labelledby="report" className="space-y-6">
      <h2 id="report" className="sr-only">
        Resultado
      </h2>
      <p className="max-w-3xl text-lg leading-relaxed">
        En {symbol}, la estrategia terminó en{" "}
        <strong className={m.totalReturn >= 0 ? "text-up" : "text-down"}>{formatPercent(m.totalReturn, true)}</strong>{" "}
        frente a <strong>{formatPercent(h.totalReturn, true)}</strong> de comprar y mantener
        {beat ? ", ganándole" : ", quedando por debajo"}. Estuvo invertida {formatPercent(m.exposure)} del tiempo y su
        peor caída fue {formatPercent(m.maxDrawdown)}, contra {formatPercent(h.maxDrawdown)}.
      </p>

      <LineChart lines={lines} format="percent" height={340} label={`Rentabilidad acumulada en ${symbol}`} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-grid text-ink-soft">
            <tr>
              <th className="py-2 pr-3 font-medium" />
              <th className="py-2 pr-3 text-right font-medium">{label}</th>
              <th className="py-2 text-right font-medium">Comprar y mantener</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grid">
            <Row label="Rentabilidad total" a={formatPercent(m.totalReturn, true)} b={formatPercent(h.totalReturn, true)} />
            <Row label="Rentabilidad anual" a={formatPercent(m.annualReturn, true)} b={formatPercent(h.annualReturn, true)} />
            <Row label="Volatilidad anual" a={formatPercent(m.volatility)} b={formatPercent(h.volatility)} />
            <Row label="Caída máxima" a={formatPercent(m.maxDrawdown)} b={formatPercent(h.maxDrawdown)} />
            <Row label="Sharpe" a={formatNumber(m.sharpe)} b={formatNumber(h.sharpe)} />
            <Row label="Operaciones" a={String(m.trades)} b={String(h.trades)} />
            <Row label="Operaciones con ganancia" a={m.winRate === null ? "—" : formatPercent(m.winRate)} b="—" />
            <Row label="Comisiones pagadas (del capital inicial)" a={formatPercent(m.fees)} b={formatPercent(h.fees)} />
          </tbody>
        </table>
      </div>

      {result.trades.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-cobalt">
            Ver las {result.trades.length} operaciones
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-grid text-ink-soft">
                <tr>
                  <th className="py-2 pr-3 font-medium">Compra</th>
                  <th className="py-2 pr-3 font-medium">Venta</th>
                  <th className="py-2 pr-3 text-right font-medium">Días</th>
                  <th className="py-2 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grid">
                {[...result.trades].reverse().map((t) => (
                  <tr key={t.entryDate}>
                    <td className="py-1.5 pr-3">{formatDate(t.entryDate)}</td>
                    <td className="py-1.5 pr-3">{t.exitDate ? formatDate(t.exitDate) : "Abierta"}</td>
                    <td className="py-1.5 pr-3 text-right">{t.days}</td>
                    <td className={cn("py-1.5 text-right", t.return >= 0 ? "text-up" : "text-down")}>
                      {formatPercent(t.return, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-3 font-normal text-ink-soft">
        {label}
      </th>
      <td className="py-2 pr-3 text-right font-medium">{a}</td>
      <td className="py-2 text-right font-medium">{b}</td>
    </tr>
  );
}

type RobustRow = { symbol: string; strategy: number; hold: number; error?: string };

/** La misma regla, sin tocarla, en otros activos. */
function Robustness({
  strategy,
  range,
  interval,
  commission,
  current,
}: {
  strategy: Strategy;
  range: RangeKey;
  interval: Interval;
  commission: number;
  current: string;
}) {
  const [rows, setRows] = useState<RobustRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const symbols = OTHER_SYMBOLS.filter((s) => s !== current);

  const run = async () => {
    setRunning(true);
    const opts = { commission: commission / 100, interval };
    const out = await Promise.all(
      symbols.map(async (symbol): Promise<RobustRow> => {
        try {
          const res = await fetch(pricesUrl(symbol, interval, range));
          const body = await res.json();
          if (!res.ok) return { symbol, strategy: NaN, hold: NaN, error: body.error };
          const s: PriceSeries = body;
          return {
            symbol,
            strategy: backtest(s.bars, strategy, opts).metrics.totalReturn,
            hold: backtest(s.bars, { kind: "buy_hold" }, opts).metrics.totalReturn,
          };
        } catch {
          return { symbol, strategy: NaN, hold: NaN, error: "Sin conexión" };
        }
      }),
    );
    setRows(out);
    setRunning(false);
  };

  const valid = rows?.filter((r) => !r.error) ?? [];
  const wins = valid.filter((r) => r.strategy > r.hold).length;

  return (
    <section aria-labelledby="robust" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="robust" className="text-lg font-semibold">
          ¿Funciona en otros activos?
        </h2>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md border border-cobalt px-3 py-1.5 text-sm font-medium text-cobalt hover:bg-cobalt hover:text-white disabled:opacity-50"
        >
          {running ? "Probando…" : `Probar la misma regla en ${symbols.length} activos`}
        </button>
      </div>
      {rows && (
        <>
          <p>
            Le ganó a comprar y mantener en <strong>{wins} de {valid.length}</strong> activos.
            {valid.length > 0 && wins <= valid.length / 2
              ? " No es una ventaja consistente."
              : " Es una señal más sólida, pero sigue siendo el pasado."}
          </p>
          <ul className="divide-y divide-grid border-y border-grid text-sm">
            {rows.map((r) => (
              <li key={r.symbol} className="grid grid-cols-[7rem_1fr_1fr] gap-3 py-2">
                <span className="font-medium">{r.symbol}</span>
                {r.error ? (
                  <span className="col-span-2 text-ink-soft">{r.error}</span>
                ) : (
                  <>
                    <span className={r.strategy > r.hold ? "text-up" : "text-down"}>
                      Estrategia {formatPercent(r.strategy, true)}
                    </span>
                    <span className="text-ink-soft">Mantener {formatPercent(r.hold, true)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
