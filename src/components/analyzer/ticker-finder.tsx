"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { TickerResult } from "@/lib/llm/tickers";
import { useApi } from "../use-api";

type Data = { query: string; results: TickerResult[] };

const EXAMPLES = [
  "10 empresas de energía renovable",
  "Acciones colombianas del sector financiero",
  "ETFs de bonos del Tesoro de EE. UU.",
];

export function TickerFinder() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q");
  const [text, setText] = useState(q ?? "");
  const { loading, data, error } = useApi<Data>(
    q ? `/api/tickers?${new URLSearchParams({ q })}` : null,
  );

  const search = (query: string) => {
    if (query.trim()) router.push(`${pathname}?${new URLSearchParams({ q: query.trim() })}`);
  };

  const valid = data?.results.filter((r) => r.valid) ?? [];
  const invalid = data?.results.filter((r) => !r.valid) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-extrabold">Buscar tickers</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Describe lo que buscas y DeepSeek sugiere símbolos. Cada uno se verifica en Yahoo Finance
          antes de mostrarlo, porque los modelos a veces inventan símbolos.
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          search(text);
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          ¿Qué buscas?
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Por ejemplo: 10 empresas de energía renovable"
            className="w-full max-w-2xl rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                search(ex);
              }}
              className="rounded border border-grid px-2 py-1 text-sm text-ink-soft hover:border-ink-soft hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
          {error}
        </p>
      )}

      {data && (
        <section aria-labelledby="found" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="found" className="text-lg font-semibold">
              {valid.length} símbolos verificados
            </h2>
            {valid.length > 1 && (
              <Link
                href={`/analizar/comparar?${new URLSearchParams({ t: valid.map((r) => r.symbol).join(",") })}`}
                className="rounded-md border border-cobalt px-3 py-1.5 text-sm font-medium text-cobalt hover:bg-cobalt hover:text-white"
              >
                Comparar los {valid.length}
              </Link>
            )}
          </div>

          <ul className="divide-y divide-grid border-y border-grid">
            {valid.map((r) => (
              <li key={r.symbol} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr_auto] sm:gap-4">
                <Link
                  href={`/analizar?${new URLSearchParams({ s: r.symbol })}`}
                  className="font-semibold text-cobalt hover:underline"
                >
                  {r.symbol}
                </Link>
                <div>
                  <p>{r.name}</p>
                  {r.reason && <p className="text-sm text-ink-soft">{r.reason}</p>}
                </div>
                <p className="text-sm text-ink-soft sm:text-right">
                  {r.lastClose !== null ? formatPrice(r.lastClose, r.currency) : ""}
                  {r.exchange && <span className="block">{r.exchange}</span>}
                </p>
              </li>
            ))}
          </ul>

          {invalid.length > 0 && (
            <p className="text-sm text-ink-soft">
              Descartados porque Yahoo Finance no tiene precios recientes:{" "}
              {invalid.map((r) => r.symbol).join(", ")}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
