"use client";

import { useMemo } from "react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { changeOver } from "@/lib/macro/parse";
import type { MacroSeries } from "@/lib/macro/sources";
import { cn } from "@/lib/utils";
import { LineChart } from "../charts/line-chart";

function fmt(v: number, unit: MacroSeries["unit"]) {
  return unit === "percent" ? formatPercent(v) : `$${formatNumber(v, 0)}`;
}

function fmtChange(v: number, unit: MacroSeries["unit"]) {
  if (unit === "percent") {
    const pts = v * 100;
    return `${pts >= 0 ? "+" : "−"}${formatNumber(Math.abs(pts), 2)} puntos`;
  }
  return `${v >= 0 ? "+" : "−"}$${formatNumber(Math.abs(v), 0)}`;
}

export function MacroView({ series }: { series: MacroSeries[] }) {
  return (
    <div className="space-y-12">
      <div className="max-w-2xl">
        <h1 className="display text-3xl font-extrabold">Contexto económico</h1>
        <p className="mt-2 text-ink-soft">
          Las tasas de interés y el dólar mueven casi todo lo demás. Antes de invertir, mira dónde
          están y hacia dónde han ido en el último año.
        </p>
      </div>
      {series.map((s) => (
        <SeriesBlock key={s.key} s={s} />
      ))}
      <p className="text-sm text-ink-soft">
        Pronto: la tasa de política monetaria del Banco de la República y la inflación en Colombia.
      </p>
    </div>
  );
}

function SeriesBlock({ s }: { s: MacroSeries }) {
  const last = s.points.at(-1);
  const change = changeOver(s.points, 12);
  const lines = useMemo(
    () => [{ name: s.name, color: "var(--cobalt)", data: s.points.map((p) => ({ time: p.date, value: p.value })) }],
    [s],
  );

  return (
    <section aria-labelledby={s.key} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <h2 id={s.key} className="text-lg font-semibold">
          {s.name}
        </h2>
        {last ? (
          <>
            <p className="display mt-2 text-4xl font-extrabold">{fmt(last.value, s.unit)}</p>
            <p className="text-sm text-ink-soft">Dato de {formatDate(last.date)}</p>
            {change !== null && (
              <p className={cn("mt-1 text-sm font-medium", change >= 0 ? "text-up" : "text-down")}>
                {fmtChange(change, s.unit)} en 12 meses
              </p>
            )}
          </>
        ) : (
          <p role="alert" className="mt-2 text-sm text-down">
            No se pudo cargar{ s.error ? `: ${s.error}` : "." }
          </p>
        )}
        <p className="mt-4 leading-relaxed text-ink-soft">{s.meaning}</p>
        <p className="mt-2 text-xs text-ink-soft">
          Fuente:{" "}
          <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="text-cobalt underline underline-offset-4">
            {s.source.label}
          </a>
        </p>
      </div>
      <div className="min-w-0">
        {s.points.length > 1 && (
          <LineChart lines={lines} format={s.unit === "percent" ? "percent" : "money"} height={260} label={s.name} />
        )}
      </div>
    </section>
  );
}
