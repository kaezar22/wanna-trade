"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Comparison } from "@/lib/compare/cdt-vs-etf";
import { ETFS } from "@/lib/etfs";
import { formatNumber, formatPercent } from "@/lib/format";
import { addDays } from "@/lib/market/as-of";
import { cn } from "@/lib/utils";
import { LineChart } from "../charts/line-chart";
import { useApi } from "../use-api";

type CompareResponse = Comparison & {
  symbol: string;
  name: string | null;
  currency: string;
  termLabel: string;
};

const TERMS = [
  { key: "90", label: "90 días" },
  { key: "180", label: "180 días" },
  { key: "360", label: "360 días" },
];

const money = (v: number) => `$${formatNumber(v, 0)}`;

export function EtfView({ dataStart }: { dataStart: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = addDays(today, -3 * 365);

  const s = params.get("s");
  const [symbol, setSymbol] = useState(s ?? "ICOLCAP.CL");
  const [start, setStart] = useState(params.get("desde") ?? defaultStart);
  const [amount, setAmount] = useState(Number(params.get("monto") ?? 10_000_000));
  const [term, setTerm] = useState(params.get("plazo") ?? "90");

  const query = s
    ? new URLSearchParams({
        symbol: s,
        desde: params.get("desde") ?? defaultStart,
        monto: params.get("monto") ?? "10000000",
        plazo: params.get("plazo") ?? "90",
      }).toString()
    : null;
  const { data, error, loading } = useApi<CompareResponse>(query ? `/api/compare-cdt?${query}` : null);

  const submit = (sym = symbol) => {
    const sp = new URLSearchParams({ s: sym.trim().toUpperCase(), desde: start, monto: String(amount), plazo: term });
    router.push(`${pathname}?${sp}#comparar`, { scroll: false });
    document.getElementById("comparar")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <h1 className="display text-3xl font-extrabold">ETFs</h1>
        <p className="mt-2 text-ink-soft">
          Un ETF es un fondo que compras como una acción y que replica un índice: con uno solo tienes
          una canasta entera de empresas o bonos. Esta es una lista para empezar a explorar.
        </p>
      </div>

      <section aria-labelledby="list">
        <h2 id="list" className="sr-only">
          Lista de ETFs
        </h2>
        <ul className="divide-y divide-grid border-y border-grid">
          {ETFS.map((e) => (
            <li key={e.symbol} className="grid gap-x-6 gap-y-1 py-4 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div>
                <Link
                  href={`/analizar?${new URLSearchParams({ s: e.symbol })}`}
                  className="font-semibold text-cobalt hover:underline"
                >
                  {e.symbol}
                </Link>
                <p className="text-xs text-ink-soft">
                  {e.currency}, {e.exchange}
                </p>
              </div>
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-ink-soft">{e.tracks}</p>
              </div>
              <p className="text-sm text-ink-soft">
                <span className="text-ink">
                  {e.assetClass}, {e.region.endsWith(".") ? e.region : `${e.region}.`}
                </span>{" "}
                {e.role}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSymbol(e.symbol);
                  submit(e.symbol);
                }}
                className="self-start whitespace-nowrap rounded-md border border-grid px-3 py-1.5 text-sm hover:border-ink-soft"
              >
                Comparar con CDT
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Pronto: el costo anual de cada ETF, con su fuente. Es una de las cosas que más pesa en el
          largo plazo.
        </p>
      </section>

      <section id="comparar" aria-labelledby="cmp" className="scroll-mt-6 space-y-6">
        <div className="max-w-2xl">
          <h2 id="cmp" className="display text-2xl font-extrabold">
            ¿CDT o ETF?
          </h2>
          <p className="mt-2 text-ink-soft">
            Qué habría pasado con tu plata en pesos: en un ETF, o en CDT renovados al vencer con la tasa
            promedio real de cada momento y descontando la retención.
          </p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            ETF o símbolo
            <input
              list="etf-options"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              spellCheck={false}
              className="w-40 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
            <datalist id="etf-options">
              {ETFS.map((e) => (
                <option key={e.symbol} value={e.symbol}>
                  {e.name}
                </option>
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Desde
            <input
              type="date"
              value={start}
              min={dataStart}
              max={addDays(today, -31)}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Monto (pesos)
            <input
              inputMode="numeric"
              value={formatNumber(amount, 0)}
              onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
              className="w-40 rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            CDT a
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-ink"
            >
              {TERMS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Calculando…" : "Comparar"}
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
            {error}
          </p>
        )}
        {loading && <div aria-busy="true" className="h-[360px] rounded-lg border border-grid bg-paper-raised" />}
        {data && <ComparisonResult data={data} />}
      </section>
    </div>
  );
}

function ComparisonResult({ data }: { data: CompareResponse }) {
  const lines = useMemo(
    () => [
      {
        name: `${data.symbol} en pesos`,
        color: "var(--cobalt)",
        data: data.dates.map((d, i) => ({ time: d, value: data.etf[i] })),
      },
      {
        name: `CDT a ${data.termLabel}`,
        color: "var(--cut)",
        data: data.dates.map((d, i) => ({ time: d, value: data.cdt[i] })),
      },
    ],
    [data],
  );

  const e = data.etfSummary;
  const c = data.cdtSummary;
  const diff = e.final - c.final;
  const etfWins = diff >= 0;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-lg leading-relaxed">
        Con <strong>{data.symbol}</strong> habrías terminado con <strong>{money(e.final)}</strong>,{" "}
        <span className={etfWins ? "text-up" : "text-down"}>
          {money(Math.abs(diff))} {etfWins ? "más" : "menos"}
        </span>{" "}
        que con el CDT ({money(c.final)}). En el peor momento, el ETF llegó a estar{" "}
        <strong>{formatPercent(-e.maxDrawdown)}</strong> por debajo de su máximo; el CDT nunca bajó.
      </p>

      <LineChart lines={lines} format="money" height={360} label={`Valor en pesos: ${data.symbol} frente a CDT`} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-grid text-ink-soft">
            <tr>
              <th className="py-2 pr-3 font-medium" />
              <th className="py-2 pr-3 text-right font-medium">{data.symbol}</th>
              <th className="py-2 text-right font-medium">CDT a {data.termLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grid">
            <Tr label="Valor final" a={money(e.final)} b={money(c.final)} />
            <Tr label="Rentabilidad total" a={formatPercent(e.totalReturn, true)} b={formatPercent(c.totalReturn, true)} />
            <Tr label="Rentabilidad anual" a={formatPercent(e.annualReturn, true)} b={formatPercent(c.annualReturn, true)} />
            <Tr label="Caída máxima" a={formatPercent(e.maxDrawdown)} b={formatPercent(c.maxDrawdown)} />
            <Tr label="Volatilidad anual" a={formatPercent(e.volatility)} b={formatPercent(c.volatility)} />
          </tbody>
        </table>
      </div>

      <p className="text-sm text-ink-soft">
        {data.converted
          ? `${data.symbol} cotiza en dólares: su valor se convierte a pesos con la tasa de cambio de cada día, así que también refleja si el dólar subió o bajó. `
          : ""}
        El CDT arranca con {data.startRate === null ? "la tasa disponible" : formatPercent(data.startRate)}{" "}
        y se renueva al vencer con el promedio del mes anterior. No incluye comisiones del ETF ni del
        intermediario.
      </p>
    </div>
  );
}

function Tr({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <th scope="row" className={cn("py-2 pr-3 font-normal text-ink-soft")}>
        {label}
      </th>
      <td className="py-2 pr-3 text-right font-medium">{a}</td>
      <td className="py-2 text-right font-medium">{b}</td>
    </tr>
  );
}
