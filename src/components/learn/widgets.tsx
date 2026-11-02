"use client";

import { useId, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";

const money = (v: number) => `$${formatNumber(v, 0)}`;

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex justify-between text-sm">
        <label htmlFor={id} className="text-ink-soft">
          {label}
        </label>
        <span className="font-semibold">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--cobalt)]"
      />
    </div>
  );
}

/** Interés compuesto: aportes mensuales y crecimiento año a año. */
export function CompoundWidget() {
  const [initial, setInitial] = useState(5_000_000);
  const [monthly, setMonthly] = useState(300_000);
  const [rate, setRate] = useState(0.1);
  const [years, setYears] = useState(15);

  const monthlyRate = (1 + rate) ** (1 / 12) - 1;
  const rows: { year: number; contributed: number; value: number }[] = [];
  let value = initial;
  let contributed = initial;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + monthlyRate) + monthly;
      contributed += monthly;
    }
    rows.push({ year: y, contributed, value });
  }
  const last = rows.at(-1)!;
  const max = last.value;

  return (
    <figure className="rounded-lg border border-grid bg-paper-raised p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Monto inicial" value={initial} min={0} max={50_000_000} step={500_000} onChange={setInitial} format={money} />
        <Slider label="Aporte mensual" value={monthly} min={0} max={3_000_000} step={50_000} onChange={setMonthly} format={money} />
        <Slider label="Rentabilidad anual" value={rate} min={0} max={0.2} step={0.005} onChange={setRate} format={(v) => formatPercent(v)} />
        <Slider label="Años" value={years} min={1} max={40} step={1} onChange={setYears} format={(v) => `${v}`} />
      </div>

      <div className="mt-6 flex h-40 items-end gap-[2px]" role="img" aria-label={`Valor final ${money(last.value)}, aportado ${money(last.contributed)}`}>
        {rows.map((r) => (
          <div key={r.year} className="flex h-full flex-1 flex-col justify-end" title={`Año ${r.year}: ${money(r.value)}`}>
            <div className="bg-up/70" style={{ height: `${((r.value - r.contributed) / max) * 100}%` }} />
            <div className="bg-cobalt" style={{ height: `${(r.contributed / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>Año 1</span>
        <span>Año {years}</span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <span aria-hidden className="h-2.5 w-2.5 bg-cobalt" /> Lo que aportaste
          </dt>
          <dd className="text-lg font-semibold">{money(last.contributed)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <span aria-hidden className="h-2.5 w-2.5 bg-up/70" /> Lo que ganaste
          </dt>
          <dd className="text-lg font-semibold">{money(last.value - last.contributed)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Total al final</dt>
          <dd className="text-lg font-semibold">{money(last.value)}</dd>
        </div>
      </dl>
      <figcaption className="mt-3 text-xs text-ink-soft">
        Antes de impuestos e inflación, con una rentabilidad constante. En la realidad la
        rentabilidad varía año a año.
      </figcaption>
    </figure>
  );
}

/** Anatomía de dos velas: una alcista y una bajista. */
export function CandleWidget() {
  const label = "fill-[var(--ink-soft)] text-[11px]";
  return (
    <figure className="rounded-lg border border-grid bg-paper-raised p-5">
      <svg viewBox="0 0 520 240" className="mx-auto block h-auto w-full max-w-xl" role="img" aria-label="Una vela verde y una roja con apertura, cierre, máximo, mínimo, cuerpo y mechas señalados">
        {/* Vela verde */}
        <line x1="130" x2="130" y1="20" y2="220" stroke="var(--up)" strokeWidth="3" />
        <rect x="105" y="60" width="50" height="110" fill="var(--up)" />
        {/* Vela roja */}
        <line x1="380" x2="380" y1="30" y2="215" stroke="var(--down)" strokeWidth="3" />
        <rect x="355" y="70" width="50" height="100" fill="var(--down)" />

        {/* Etiquetas verde */}
        <g className={label}>
          <line x1="138" x2="200" y1="20" y2="20" stroke="var(--grid)" />
          <text x="205" y="24">Máximo</text>
          <line x1="160" x2="200" y1="60" y2="60" stroke="var(--grid)" />
          <text x="205" y="64">Cierre</text>
          <line x1="160" x2="200" y1="170" y2="170" stroke="var(--grid)" />
          <text x="205" y="174">Apertura</text>
          <line x1="138" x2="200" y1="220" y2="220" stroke="var(--grid)" />
          <text x="205" y="224">Mínimo</text>
          <text x="20" y="120">Cuerpo</text>
          <line x1="64" x2="100" y1="116" y2="116" stroke="var(--grid)" />
          <text x="20" y="40">Mecha</text>
          <line x1="56" x2="124" y1="36" y2="36" stroke="var(--grid)" />
        </g>
        {/* Etiquetas roja */}
        <g className={label}>
          <line x1="300" x2="350" y1="70" y2="70" stroke="var(--grid)" />
          <text x="252" y="74">Apertura</text>
          <line x1="300" x2="350" y1="170" y2="170" stroke="var(--grid)" />
          <text x="262" y="174">Cierre</text>
        </g>
        <text x="130" y="238" textAnchor="middle" className="fill-[var(--up)] text-[12px] font-semibold">
          Sube: cierra arriba
        </text>
        <text x="380" y="238" textAnchor="middle" className="fill-[var(--down)] text-[12px] font-semibold">
          Baja: cierra abajo
        </text>
      </svg>
    </figure>
  );
}

/** Diversificación: volatilidad de un portafolio de dos activos según la correlación. */
export function DiversificationWidget() {
  const [volA, setVolA] = useState(0.2);
  const [volB, setVolB] = useState(0.15);
  const [weightA, setWeightA] = useState(0.5);
  const [corr, setCorr] = useState(0.2);

  const wB = 1 - weightA;
  const portfolio = Math.sqrt(
    weightA ** 2 * volA ** 2 + wB ** 2 * volB ** 2 + 2 * weightA * wB * corr * volA * volB,
  );
  const naive = weightA * volA + wB * volB;
  const bars = [
    { label: "Activo A solo", value: volA, color: "bg-ink-soft" },
    { label: "Activo B solo", value: volB, color: "bg-ink-soft" },
    { label: "Si se movieran igual", value: naive, color: "bg-grid" },
    { label: "Tu portafolio", value: portfolio, color: "bg-cobalt" },
  ];
  const max = Math.max(...bars.map((b) => b.value), 0.01);

  return (
    <figure className="rounded-lg border border-grid bg-paper-raised p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Volatilidad del activo A" value={volA} min={0.02} max={0.6} step={0.01} onChange={setVolA} format={(v) => formatPercent(v)} />
        <Slider label="Volatilidad del activo B" value={volB} min={0.02} max={0.6} step={0.01} onChange={setVolB} format={(v) => formatPercent(v)} />
        <Slider label="Peso del activo A" value={weightA} min={0} max={1} step={0.05} onChange={setWeightA} format={(v) => formatPercent(v).replace(",0", "")} />
        <Slider label="Correlación entre A y B" value={corr} min={-1} max={1} step={0.05} onChange={setCorr} format={(v) => formatNumber(v)} />
      </div>
      <ul className="mt-6 space-y-2">
        {bars.map((b) => (
          <li key={b.label} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-3 text-sm">
            <span className="text-ink-soft">{b.label}</span>
            <span className="h-3 rounded-sm bg-paper">
              <span className={`block h-3 rounded-sm ${b.color}`} style={{ width: `${(b.value / max) * 100}%` }} />
            </span>
            <span className="text-right font-semibold">{formatPercent(b.value)}</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 text-sm text-ink-soft">
        Con correlación 1 la volatilidad es el simple promedio. Cuanto más baja la correlación, más
        cae la volatilidad del conjunto, sin cambiar la rentabilidad esperada.
      </figcaption>
    </figure>
  );
}
