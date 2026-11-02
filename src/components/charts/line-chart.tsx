"use client";

import {
  ColorType,
  LineSeries,
  createChart,
  type PriceFormat,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

export type LineSpec = {
  name: string;
  /** Color CSS: un token como "var(--cobalt)" o un hex. */
  color: string;
  data: { time: Time; value: number }[];
};

function resolveColor(color: string) {
  const m = /^var\((--[\w-]+)\)$/.exec(color);
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : color;
}

/** Gráfico de líneas simple con leyenda. `format` define cómo se ven los números del eje. */
export function LineChart({
  lines,
  format,
  height = 320,
  label,
}: {
  lines: LineSpec[];
  format: "percent" | "money";
  height?: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setTheme((n) => n + 1);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = (v: string) => resolveColor(`var(${v})`);
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: c("--paper-raised") },
        textColor: c("--ink-soft"),
        fontFamily: '"Archivo Variable", system-ui, sans-serif',
      },
      grid: { vertLines: { color: c("--grid") }, horzLines: { color: c("--grid") } },
      rightPriceScale: { borderColor: c("--grid") },
      timeScale: { borderColor: c("--grid") },
      localization: {
        locale: "es-CO",
        priceFormatter:
          format === "percent"
            ? (v: number) => `${(v * 100).toFixed(2)} %`
            : (v: number) =>
                new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(v),
      },
    });
    const priceFormat: PriceFormat = { type: "custom", formatter: (v: number) => String(v), minMove: 0.0001 };
    for (const l of lines) {
      const s = chart.addSeries(LineSeries, {
        color: resolveColor(l.color),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat,
      });
      s.setData(l.data);
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [lines, format, theme]);

  return (
    <figure className="overflow-hidden rounded-lg border border-grid bg-paper-raised">
      {lines.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 border-b border-grid px-4 py-2 text-xs text-ink-soft">
          {lines.map((l) => (
            <li key={l.name} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block w-4" style={{ borderTop: `2px solid ${l.color}` }} />
              {l.name}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} style={{ height }} role="img" aria-label={label} />
    </figure>
  );
}
