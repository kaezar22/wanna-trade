"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTERVAL_LABELS, RANGES, type RangeKey } from "@/lib/market/ranges";
import { INTERVALS, type Interval } from "@/lib/market/types";

const QUICK = ["AAPL", "NVDA", "SPY", "ICOLCAP.CL", "COP=X"];

type Props = { symbol: string; interval: Interval; range: RangeKey };

export function QueryForm({ symbol, interval, range }: Props) {
  const router = useRouter();
  const [s, setS] = useState(symbol);
  const [i, setI] = useState<Interval>(interval);
  const [r, setR] = useState<RangeKey>(range);

  const go = (sym: string, iv = i, rg = r) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    router.push(`/analizar?${new URLSearchParams({ s: clean, i: iv, r: rg })}`);
  };

  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(s);
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Símbolo de Yahoo Finance
          <input
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="AAPL, SPY, ICOLCAP.CL…"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-56 rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Intervalo
          <select
            value={i}
            onChange={(e) => setI(e.target.value as Interval)}
            className="rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
          >
            {INTERVALS.map((iv) => (
              <option key={iv} value={iv}>
                {INTERVAL_LABELS[iv]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Periodo
          <select
            value={r}
            onChange={(e) => setR(e.target.value as RangeKey)}
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
          className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Analizar
        </button>
      </form>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        Prueba con
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setS(q);
              go(q);
            }}
            className="rounded border border-grid px-2 py-0.5 text-ink hover:border-ink-soft"
          >
            {q}
          </button>
        ))}
      </p>
    </div>
  );
}
