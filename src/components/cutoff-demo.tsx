"use client";

import { useId, useState } from "react";

// Serie ilustrativa y determinista (no son precios reales): un paseo aleatorio
// semanal de nov-2023 a nov-2026 generado con una semilla fija.
const WEEKS = 157;
const START = Date.UTC(2023, 10, 6);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildSeries() {
  let seed = 20231106;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const values: number[] = [];
  let v = 100;
  for (let i = 0; i < WEEKS; i++) {
    v *= 1 + (rand() - 0.47) * 0.06;
    values.push(v);
  }
  return values;
}

const SERIES = buildSeries();

const W = 1000;
const H = 280;
const PAD_Y = 16;

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function CutoffDemo() {
  const values = SERIES;
  const [cut, setCut] = useState(Math.round(WEEKS * 0.55));
  const sliderId = useId();

  // La escala usa solo lo conocido hasta la fecha de corte: si usara toda la
  // serie, el eje dejaría adivinar el futuro.
  const knownValues = values.slice(0, cut + 1);
  const min = Math.min(...knownValues);
  const max = Math.max(...knownValues);
  const x = (i: number) => (i / (WEEKS - 1)) * W;
  const y = (val: number) =>
    PAD_Y + (1 - (val - min) / (max - min)) * (H - PAD_Y * 2);

  const known = knownValues
    .map((val, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(val).toFixed(1)}`)
    .join(" ");

  const cutX = x(cut);
  const change = (values[cut] / values[0] - 1) * 100;
  const cutDate = dateFmt.format(new Date(START + cut * WEEK_MS));

  return (
    <figure className="rounded-lg border border-grid bg-paper-raised">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 pt-4 sm:px-6">
        <p className="text-sm text-ink-soft">
          Lo que sabías el{" "}
          <span className="font-semibold text-ink">{cutDate}</span>
        </p>
        <p
          className={
            change >= 0 ? "text-sm font-semibold text-up" : "text-sm font-semibold text-down"
          }
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% desde el inicio
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 block h-auto w-full"
        role="img"
        aria-label={`Serie de precios ilustrativa visible hasta el ${cutDate}; lo posterior está oculto.`}
      >
        <defs>
          <pattern
            id="future"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="var(--grid)" strokeWidth="3" />
          </pattern>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--grid)"
            strokeWidth="1"
          />
        ))}

        <rect x={cutX} y="0" width={W - cutX} height={H} fill="url(#future)" />
        <path d={known} fill="none" stroke="var(--ink)" strokeWidth="2.25" strokeLinejoin="round" />
        <line x1={cutX} x2={cutX} y1="0" y2={H} stroke="var(--cut)" strokeWidth="2.5" />
        <circle cx={cutX} cy={y(values[cut])} r="5" fill="var(--cut)" />
      </svg>

      <div className="px-4 pb-4 sm:px-6">
        <label htmlFor={sliderId} className="sr-only">
          Mover la fecha de corte
        </label>
        <input
          id={sliderId}
          type="range"
          min={8}
          max={WEEKS - 1}
          value={cut}
          onChange={(e) => setCut(Number(e.target.value))}
          className="w-full accent-[var(--cut)]"
        />
        <figcaption className="mt-2 text-sm text-ink-soft">
          Mueve la línea: a la derecha está el futuro, y en el simulador no lo
          ves hasta que avanzas el reloj. Serie ilustrativa, no son precios
          reales.
        </figcaption>
      </div>
    </figure>
  );
}
