"use client";

import { useCallback, useMemo, useState } from "react";
import {
  annualizedVolatility,
  bollinger,
  chopZone,
  describeZone,
  expectedRange,
  ichimoku,
  maxDrawdown,
  sharpe,
  sma,
  totalReturn,
  type ChopZone,
} from "@/lib/indicators";
import { formatDate, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import type { PriceSeries } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { ICHIMOKU_COLORS, PriceChart, type Overlays } from "./price-chart";

type Toggles = {
  sma: boolean;
  bollinger: boolean;
  ichimoku: boolean;
  chopZone: boolean;
  range: boolean;
};

const RANGE_STEPS = 20;

export function Analyzer({ series }: { series: PriceSeries }) {
  const { bars, meta, interval } = series;
  const [on, setOn] = useState<Toggles>({
    sma: true,
    bollinger: false,
    ichimoku: false,
    chopZone: true,
    range: false,
  });
  const [fast, setFast] = useState(9);
  const [slow, setSlow] = useState(21);
  const [hover, setHover] = useState<number | null>(null);

  const hasOHLC = useMemo(() => bars.some((b) => b.high !== b.low), [bars]);
  const hasVolume = useMemo(() => bars.some((b) => b.volume > 0), [bars]);

  const close = useMemo(() => bars.map((b) => b.close), [bars]);
  const high = useMemo(() => bars.map((b) => b.high), [bars]);
  const low = useMemo(() => bars.map((b) => b.low), [bars]);
  const adj = useMemo(() => bars.map((b) => b.adjClose), [bars]);

  const cz = useMemo(() => chopZone(high, low, close), [high, low, close]);
  const lastZone = cz.findLast((z): z is ChopZone => z !== null);

  const overlays = useMemo<Overlays>(
    () => ({
      smaFast: on.sma ? { length: fast, values: sma(close, fast) } : undefined,
      smaSlow: on.sma ? { length: slow, values: sma(close, slow) } : undefined,
      bollinger: on.bollinger ? bollinger(close) : undefined,
      ichimoku: on.ichimoku ? ichimoku(high, low, close) : undefined,
      chopZone: on.chopZone ? cz : undefined,
      expectedRange: on.range ? expectedRange(close, RANGE_STEPS) : undefined,
    }),
    [on, fast, slow, close, high, low, cz],
  );

  const stats = useMemo(
    () => ({
      change: totalReturn(adj),
      vol: annualizedVolatility(adj, interval),
      dd: maxDrawdown(adj),
      sharpe: sharpe(adj, interval),
    }),
    [adj, interval],
  );

  const onHover = useCallback((i: number | null) => setHover(i), []);
  const shown = bars[hover ?? bars.length - 1];
  const last = bars[bars.length - 1];

  const toggle = (key: keyof Toggles) => setOn((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="display text-3xl font-extrabold sm:text-4xl">{meta.symbol}</h1>
          <p className="mt-1 text-ink-soft">
            {[meta.name, meta.exchange, meta.type].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-semibold">{formatPrice(last.close, meta.currency)}</p>
          <p className={cn("text-sm font-medium", stats.change >= 0 ? "text-up" : "text-down")}>
            {formatPercent(stats.change, true)} en el periodo
          </p>
        </div>
      </div>

      <fieldset className="mt-6 flex flex-wrap items-center gap-2">
        <legend className="sr-only">Indicadores</legend>
        <ToggleChip pressed={on.sma} onClick={() => toggle("sma")}>
          Medias móviles
        </ToggleChip>
        {on.sma && (
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <NumberInput label="Media rápida" value={fast} onChange={setFast} min={2} max={100} />
            <span aria-hidden>y</span>
            <NumberInput label="Media lenta" value={slow} onChange={setSlow} min={5} max={250} />
          </span>
        )}
        <ToggleChip pressed={on.bollinger} onClick={() => toggle("bollinger")}>
          Bollinger
        </ToggleChip>
        <ToggleChip pressed={on.ichimoku} onClick={() => toggle("ichimoku")}>
          Ichimoku
        </ToggleChip>
        <ToggleChip pressed={on.chopZone} onClick={() => toggle("chopZone")}>
          Chop Zone
        </ToggleChip>
        <ToggleChip pressed={on.range} onClick={() => toggle("range")}>
          Rango esperado
        </ToggleChip>
      </fieldset>

      <div className="mt-4 overflow-hidden rounded-lg border border-grid bg-paper-raised">
        <p className="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid px-4 py-2 text-sm text-ink-soft">
          <span className="font-medium text-ink">{formatDate(shown.date)}</span>
          {hasOHLC ? (
            <>
              <span>Apertura {formatNumber(shown.open)}</span>
              <span>Máximo {formatNumber(shown.high)}</span>
              <span>Mínimo {formatNumber(shown.low)}</span>
            </>
          ) : null}
          <span>Cierre {formatNumber(shown.close)}</span>
          {hasVolume && <span>Volumen {formatNumber(shown.volume, 0)}</span>}
        </p>
        <Legend on={on} fast={fast} slow={slow} />
        <PriceChart
          bars={bars}
          interval={interval}
          hasOHLC={hasOHLC}
          hasVolume={hasVolume}
          overlays={overlays}
          onHover={onHover}
        />
      </div>

      {!hasOHLC && (
        <p className="mt-3 text-sm text-ink-soft">
          Yahoo solo tiene el precio de cierre de este instrumento, así que se muestra una línea en
          vez de velas. Ichimoku y Chop Zone pierden precisión sin máximos y mínimos reales.
        </p>
      )}
      {on.range && (
        <p className="mt-3 text-sm text-ink-soft">
          El rango esperado muestra qué tan lejos suele moverse el precio en los próximos{" "}
          {RANGE_STEPS} periodos según su volatilidad reciente. Cerca de 2 de cada 3 veces termina
          dentro. No predice la dirección.
        </p>
      )}

      <dl className="mt-8 grid gap-x-8 gap-y-6 border-t border-grid pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Volatilidad anual"
          value={formatPercent(stats.vol)}
          hint="Cuánto se mueve el precio en un año típico. Más alta, más riesgo."
        />
        <Stat
          label="Caída máxima"
          value={formatPercent(stats.dd)}
          hint="La peor caída desde un pico en el periodo. Lo que habrías tenido que aguantar."
        />
        <Stat
          label="Sharpe"
          value={formatNumber(stats.sharpe)}
          hint="Rentabilidad por unidad de riesgo, sin descontar la tasa libre de riesgo. Más de 1 es bueno."
        />
        <Stat
          label="Chop Zone hoy"
          value={lastZone === undefined ? "—" : describeZone(lastZone)}
          hint="Dirección y fuerza de la tendencia según la pendiente de la media exponencial."
        />
      </dl>
    </div>
  );
}

type LegendItem = { label: string; color: string; style: "solid" | "dashed" | "dotted" };

function Legend({ on, fast, slow }: { on: Toggles; fast: number; slow: number }) {
  const items: LegendItem[] = [];
  if (on.sma) {
    items.push({ label: `Media ${fast}`, color: "var(--cobalt)", style: "solid" });
    items.push({ label: `Media ${slow}`, color: "var(--cut)", style: "solid" });
  }
  if (on.bollinger) items.push({ label: "Bollinger ±2σ", color: "var(--ink-soft)", style: "dashed" });
  if (on.ichimoku) {
    items.push({ label: "Tenkan", color: ICHIMOKU_COLORS.tenkan, style: "solid" });
    items.push({ label: "Kijun", color: ICHIMOKU_COLORS.kijun, style: "solid" });
    items.push({ label: "Senkou A", color: "var(--up)", style: "solid" });
    items.push({ label: "Senkou B", color: "var(--down)", style: "solid" });
  }
  if (on.range) items.push({ label: "Rango esperado ±1σ", color: "var(--cobalt)", style: "dotted" });

  if (items.length === 0 && !on.chopZone) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b border-grid px-4 py-2 text-xs text-ink-soft">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block w-4"
            style={{ borderTop: `2px ${it.style} ${it.color}` }}
          />
          {it.label}
        </li>
      ))}
      {on.chopZone && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="flex h-2.5">
            {(["#26C6DA", "#43A047", "#FDD835", "#FF6D00", "#D50000"] as const).map((c) => (
              <span key={c} className="w-1.5" style={{ background: c }} />
            ))}
          </span>
          Chop Zone: azul y verde alcista, amarillo lateral, naranja y rojo bajista
        </li>
      )}
    </ul>
  );
}

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        pressed
          ? "border-ink bg-ink text-paper"
          : "border-grid text-ink-soft hover:border-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <input
      type="number"
      aria-label={label}
      title={label}
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
      }}
      className="w-16 rounded-md border border-grid bg-paper-raised px-2 py-1 text-ink"
    />
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
      <dd className="mt-1 text-sm text-ink-soft">{hint}</dd>
    </div>
  );
}
