"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bollinger, chopZone, sma } from "@/lib/indicators";
import { formatDate, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import {
  advance,
  dayNumber,
  displayName,
  finish,
  nextWeekday,
  recordValue,
  valuate,
  type Game,
  type Valuation,
} from "@/lib/sim/engine";
import { exportGame, saveGame, useGame } from "@/lib/sim/storage";
import type { SimAsset } from "@/lib/sim/types";
import { cn } from "@/lib/utils";
import { PriceChart, type Overlays } from "../analyzer/price-chart";
import { LineChart, type LineSpec } from "../charts/line-chart";
import { Results } from "./results";
import { Tickets } from "./tickets";
import { useSimMarket } from "./use-market";

const money = (v: number) => `$${formatNumber(v, 0)}`;

export function GameScreen({ id }: { id: string }) {
  const game = useGame(id);
  if (game === undefined) return <div aria-busy="true" className="h-96 rounded-lg bg-paper-raised" />;
  if (game === null) {
    return (
      <div className="rounded-lg border border-grid bg-paper-raised p-6">
        <p className="font-semibold">No encontramos esta partida en este navegador.</p>
        <p className="mt-1 text-ink-soft">
          Las partidas se guardan en el navegador donde las creaste. Si la exportaste, impórtala desde{" "}
          <Link href="/simular" className="text-cobalt underline underline-offset-4">
            Simular
          </Link>
          .
        </p>
      </div>
    );
  }
  return game.finished ? <Results game={game} /> : <Playing game={game} />;
}

/** Fecha visible: el día de la partida en modo a ciegas, la fecha real si no. */
export function useDateLabel(game: Game) {
  return (date: string) => (game.blind && !game.finished ? `Día ${dayNumber(game, date)}` : formatDate(date));
}

function Playing({ game }: { game: Game }) {
  const { market, quotes, fx, unsupported, error, loading } = useSimMarket(game);
  const [selected, setSelected] = useState(game.universe[0]);
  const dateLabel = useDateLabel(game);

  const valuation: Valuation | null = market ? valuate(game, quotes, fx) : null;
  const ready = valuation !== null && valuation.missing.length === 0;

  // Guarda el valor del día en el historial cuando llegan los precios de la nueva fecha.
  const lastRecorded = game.history.at(-1)?.date;
  useEffect(() => {
    if (ready && lastRecorded !== game.currentDate) saveGame(recordValue(game, valuation.total));
  }, [ready, lastRecorded, game, valuation?.total]);

  const atEnd = game.currentDate >= game.endDate;
  const move = (days: number) => saveGame(advance(game, nextWeekday(game.currentDate, days)));
  const total = valuation?.total ?? game.history.at(-1)?.value ?? game.initialCash;
  const change = total / game.initialCash - 1;
  const asset = market?.assets.find((a) => a.symbol === selected);

  return (
    <div className="space-y-8">
      {/* Barra superior: fecha, valor y reloj */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-grid pb-6">
        <div>
          <p className="text-sm text-ink-soft">{game.name}</p>
          <h1 className="display text-3xl font-extrabold sm:text-4xl">{dateLabel(game.currentDate)}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {game.blind ? `de ${dayNumber(game, game.endDate)} días` : `La partida termina el ${formatDate(game.endDate)}`}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-sm text-ink-soft">Valor total</dt>
            <dd className="text-2xl font-semibold">{money(total)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Desde el inicio</dt>
            <dd className={cn("text-2xl font-semibold", change >= 0 ? "text-up" : "text-down")}>
              {formatPercent(change, true)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Efectivo</dt>
            <dd className="text-2xl font-semibold">{money(game.cash)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-soft">Avanzar</span>
          {[
            [1, "1 día"],
            [7, "1 semana"],
            [30, "1 mes"],
          ].map(([d, label]) => (
            <button
              key={label}
              type="button"
              disabled={loading || atEnd}
              onClick={() => move(d as number)}
              className="rounded-md border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper disabled:opacity-40"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (atEnd || window.confirm("¿Terminar la partida aquí? Verás los resultados y se revelará todo.")) {
                saveGame(finish(game));
              }
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              atEnd ? "bg-cobalt text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {atEnd ? "Ver resultados" : "Terminar"}
          </button>
        </div>
      </div>

      {atEnd && (
        <p role="status" className="rounded-lg border border-cobalt/40 bg-paper-raised p-4">
          Llegaste a la última fecha de la partida. Revisa tu portafolio y mira los resultados.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
          {error}
        </p>
      )}
      {market && (market.failed.length > 0 || unsupported.length > 0) && (
        <p className="text-sm text-ink-soft">
          Sin datos para operar:{" "}
          {[...market.failed.map((f) => f.symbol), ...unsupported].map((s) => displayName(game, s)).join(", ")}.
        </p>
      )}

      {/* Activos */}
      <div role="tablist" aria-label="Activos" className="flex flex-wrap gap-2">
        {game.universe.map((s) => {
          const q = quotes.get(s);
          return (
            <button
              key={s}
              role="tab"
              aria-selected={s === selected}
              onClick={() => setSelected(s)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-left text-sm",
                s === selected ? "border-ink bg-ink text-paper" : "border-grid hover:border-ink-soft",
              )}
            >
              <span className="block font-semibold">{displayName(game, s)}</span>
              <span
                className={cn(
                  "text-xs",
                  s === selected
                    ? "text-paper/80"
                    : (q?.monthReturn ?? 0) >= 0
                      ? "text-up"
                      : "text-down",
                )}
              >
                {q?.monthReturn === undefined ? "—" : `${formatPercent(q.monthReturn, true)} en un mes`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {asset ? (
            <SimChart key={asset.symbol} asset={asset} game={game} />
          ) : (
            <div aria-busy={loading} className="h-[420px] rounded-lg border border-grid bg-paper-raised" />
          )}
        </div>
        <div className="min-w-0">
          <Tickets game={game} symbol={selected} quote={quotes.get(selected) ?? null} fx={fx} />
        </div>
      </div>

      <Portfolio game={game} valuation={valuation} onSelect={setSelected} dateLabel={dateLabel} />
      <ValueChart game={game} />
      <TradeLog game={game} dateLabel={dateLabel} />

      <div className="flex flex-wrap gap-4 border-t border-grid pt-6 text-sm">
        <Link href="/simular" className="text-cobalt underline-offset-4 hover:underline">
          Todas las partidas
        </Link>
        <button type="button" onClick={() => exportGame(game)} className="text-cobalt underline-offset-4 hover:underline">
          Exportar esta partida
        </button>
      </div>
    </div>
  );
}

function SimChart({ asset, game }: { asset: SimAsset; game: Game }) {
  const [on, setOn] = useState({ sma: true, bollinger: false, chop: true });
  const [hover, setHover] = useState<number | null>(null);
  const bars = asset.bars;
  const close = useMemo(() => bars.map((b) => b.close), [bars]);
  const hasOHLC = useMemo(() => bars.some((b) => b.high !== b.low), [bars]);
  const dateLabel = useDateLabel(game);

  const overlays = useMemo<Overlays>(
    () => ({
      smaFast: on.sma ? { length: 20, values: sma(close, 20) } : undefined,
      smaSlow: on.sma ? { length: 50, values: sma(close, 50) } : undefined,
      bollinger: on.bollinger ? bollinger(close) : undefined,
      chopZone: on.chop
        ? chopZone(
            bars.map((b) => b.high),
            bars.map((b) => b.low),
            close,
          )
        : undefined,
    }),
    [on, bars, close],
  );
  const shown = bars[hover ?? bars.length - 1];
  const onHover = useMemo(() => (i: number | null) => setHover(i), []);

  return (
    <div className="overflow-hidden rounded-lg border border-grid bg-paper-raised">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grid px-4 py-2 text-sm">
        <p className="text-ink-soft">
          <span className="font-medium text-ink">{displayName(game, asset.symbol)}</span>{" "}
          {shown && (
            <>
              {dateLabel(shown.date)}: {formatPrice(shown.close, asset.meta.currency)}
            </>
          )}
        </p>
        <div className="flex gap-1.5">
          {(
            [
              ["sma", "Medias 20 y 50"],
              ["bollinger", "Bollinger"],
              ["chop", "Chop Zone"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={on[k]}
              onClick={() => setOn((o) => ({ ...o, [k]: !o[k] }))}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs",
                on[k] ? "border-ink bg-ink text-paper" : "border-grid text-ink-soft hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <PriceChart
        bars={bars}
        interval="1d"
        hasOHLC={hasOHLC}
        hasVolume={false}
        overlays={overlays}
        onHover={onHover}
        hideTime={game.blind}
      />
    </div>
  );
}

function Portfolio({
  game,
  valuation,
  onSelect,
  dateLabel,
}: {
  game: Game;
  valuation: Valuation | null;
  onSelect: (s: string) => void;
  dateLabel: (d: string) => string;
}) {
  if (game.positions.length === 0 && game.cdts.length === 0) {
    return (
      <section aria-labelledby="portfolio">
        <h2 id="portfolio" className="text-lg font-semibold">
          Tu portafolio
        </h2>
        <p className="mt-2 text-ink-soft">
          Todo está en efectivo. Elige un activo, compra o abre un CDT, y avanza el reloj para ver qué
          pasa.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="portfolio" className="space-y-4">
      <h2 id="portfolio" className="text-lg font-semibold">
        Tu portafolio
      </h2>
      {game.positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-grid text-ink-soft">
              <tr>
                <th className="py-2 pr-3 font-medium">Activo</th>
                <th className="py-2 pr-3 text-right font-medium">Invertido</th>
                <th className="py-2 pr-3 text-right font-medium">Vale hoy</th>
                <th className="py-2 pr-3 text-right font-medium">Resultado</th>
                <th className="py-2 text-right font-medium">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grid">
              {(valuation?.positions ?? game.positions.map((p) => ({ ...p, valueCop: NaN, pnlCop: NaN, pnlPct: NaN, weight: NaN }))).map(
                (p) => (
                  <tr key={p.symbol}>
                    <td className="py-2 pr-3">
                      <button type="button" onClick={() => onSelect(p.symbol)} className="font-medium text-cobalt hover:underline">
                        {displayName(game, p.symbol)}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-right">{money(p.costCop)}</td>
                    <td className="py-2 pr-3 text-right">{Number.isFinite(p.valueCop) ? money(p.valueCop) : "—"}</td>
                    <td className={cn("py-2 pr-3 text-right", p.pnlCop >= 0 ? "text-up" : "text-down")}>
                      {Number.isFinite(p.pnlPct) ? formatPercent(p.pnlPct, true) : "—"}
                    </td>
                    <td className="py-2 text-right">{Number.isFinite(p.weight) ? formatPercent(p.weight) : "—"}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      {game.cdts.length > 0 && (
        <ul className="divide-y divide-grid border-y border-grid text-sm">
          {game.cdts.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-medium">CDT {c.entity}</span>{" "}
                <span className="text-ink-soft">
                  {formatPercent(c.rate)} a {c.termDays} días
                </span>
              </span>
              <span className="text-ink-soft">
                {money(c.amount)}, vence {game.blind ? `el ${dateLabel(c.maturity).toLowerCase()}` : `el ${formatDate(c.maturity)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {valuation && valuation.cdtValue > 0 && (
        <p className="text-sm text-ink-soft">CDT con intereses causados: {money(valuation.cdtValue)}.</p>
      )}
    </section>
  );
}

function ValueChart({ game }: { game: Game }) {
  const lines = useMemo<LineSpec[]>(
    () => [
      {
        name: "Tu portafolio",
        color: "var(--cobalt)",
        data: game.history.map((h) => ({ time: h.date, value: h.value })),
      },
    ],
    [game.history],
  );
  if (game.history.length < 2) return null;
  return (
    <section aria-labelledby="value">
      <h2 id="value" className="text-lg font-semibold">
        Cómo ha ido tu portafolio
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Un punto por cada vez que avanzaste el reloj. La comparación con el mercado se muestra al
        terminar.
      </p>
      <div className="mt-3">
        <LineChart lines={lines} format="money" height={260} label="Valor del portafolio" hideTime={game.blind} />
      </div>
    </section>
  );
}

function TradeLog({ game, dateLabel }: { game: Game; dateLabel: (d: string) => string }) {
  if (game.trades.length === 0) return null;
  const label = { buy: "Compra", sell: "Venta", cdt_open: "Abre", cdt_mature: "Vence" } as const;
  return (
    <section aria-labelledby="log">
      <h2 id="log" className="text-lg font-semibold">
        Tus operaciones
      </h2>
      <ul className="mt-3 divide-y divide-grid border-y border-grid text-sm">
        {[...game.trades].reverse().map((t) => (
          <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span>
              <span className="text-ink-soft">{dateLabel(t.date)}</span>{" "}
              <span className="font-medium">{label[t.kind]}</span> {t.kind.startsWith("cdt") ? t.symbol : displayName(game, t.symbol)}
            </span>
            <span className={cn(t.realizedCop !== undefined && (t.realizedCop >= 0 ? "text-up" : "text-down"))}>
              {money(t.cashCop)}
              {t.realizedCop !== undefined &&
                ` (${t.realizedCop >= 0 ? "+" : "−"}${money(Math.abs(t.realizedCop))})`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
