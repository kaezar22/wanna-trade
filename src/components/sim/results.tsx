"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { maxDrawdown } from "@/lib/indicators/risk";
import { behavior, type Game } from "@/lib/sim/engine";
import { exportGame, saveGame } from "@/lib/sim/storage";
import { cn } from "@/lib/utils";
import { LineChart, type LineSpec } from "../charts/line-chart";
import { useBenchmarks } from "./use-market";

const money = (v: number) => `$${formatNumber(v, 0)}`;

export function Results({ game }: { game: Game }) {
  const { data: bench, loading, error } = useBenchmarks(game);
  const final = game.history.at(-1)?.value ?? game.initialCash;
  const ret = final / game.initialCash - 1;
  const dd = maxDrawdown(game.history.map((h) => h.value));
  const stats = behavior(game);

  // Guarda el valor final de las referencias para el perfil de decisiones.
  useEffect(() => {
    if (!bench || game.benchmarkFinals) return;
    saveGame({
      ...game,
      benchmarkFinals: {
        spy: bench.spy?.values.at(-1),
        icolcap: bench.icolcap?.values.at(-1),
        cdt: bench.cdt?.values.at(-1),
      },
    });
  }, [bench, game]);

  const rows = [
    { name: "Tu portafolio", final, highlight: true },
    ...(bench?.spy ? [{ name: "S&P 500 (SPY, en pesos)", final: bench.spy.values.at(-1)!, highlight: false }] : []),
    ...(bench?.icolcap ? [{ name: "COLCAP (ICOLCAP)", final: bench.icolcap.values.at(-1)!, highlight: false }] : []),
    ...(bench?.cdt ? [{ name: "CDT a 90 días renovado", final: bench.cdt.values.at(-1)!, highlight: false }] : []),
  ];
  const best = rows.reduce((a, b) => (b.final > a.final ? b : a), rows[0]);

  const lines = useMemo<LineSpec[]>(() => {
    const l: LineSpec[] = [
      { name: "Tu portafolio", color: "var(--cobalt)", data: game.history.map((h) => ({ time: h.date, value: h.value })) },
    ];
    const add = (name: string, color: string, line: { dates: string[]; values: number[] } | null | undefined) => {
      if (line) l.push({ name, color, data: line.dates.map((d, i) => ({ time: d, value: line.values[i] })) });
    };
    add("S&P 500", "var(--ink-soft)", bench?.spy);
    add("COLCAP", "var(--up)", bench?.icolcap);
    add("CDT 90 días", "var(--cut)", bench?.cdt);
    return l;
  }, [game.history, bench]);

  const insights: string[] = [];
  if (stats.trades > 0) {
    insights.push(
      `Hiciste ${stats.trades} operaciones y pagaste ${money(stats.feesCop)} en comisiones y diferencial cambiario.`,
    );
  } else {
    insights.push("No compraste ni vendiste activos: tu resultado depende solo del efectivo y los CDT.");
  }
  if (stats.avgHeldWinners !== null && stats.avgHeldLosers !== null) {
    const w = Math.round(stats.avgHeldWinners);
    const l = Math.round(stats.avgHeldLosers);
    insights.push(
      l > w * 1.3
        ? `Vendiste las ganancias en ${w} días en promedio, pero aguantaste las pérdidas ${l} días. Es el error más común entre inversionistas: cortar pronto lo que va bien y esperar a que se recupere lo que va mal.`
        : `Mantuviste las ventas con ganancia ${w} días y las de pérdida ${l} días en promedio: no se ve el sesgo de vender pronto lo que gana y aguantar lo que pierde.`,
    );
  }
  if (stats.buys > 0) {
    insights.push(
      stats.chaseBuys > 0
        ? `${stats.chaseBuys} de tus ${stats.buys} compras fueron después de que el activo subiera más de 10 % en un mes. Comprar lo que ya subió mucho suele salir caro.`
        : "Ninguna compra fue justo después de una subida fuerte: no perseguiste el precio.",
    );
  }
  if (stats.winRate !== null) {
    insights.push(`${formatPercent(stats.winRate)} de tus ventas fueron con ganancia.`);
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-ink-soft">{game.name}, partida terminada</p>
        <h1 className="display mt-1 text-4xl font-extrabold sm:text-5xl">
          {money(final)}{" "}
          <span className={cn("text-2xl sm:text-3xl", ret >= 0 ? "text-up" : "text-down")}>
            {formatPercent(ret, true)}
          </span>
        </h1>
        <p className="mt-2 text-ink-soft">
          Del {formatDate(game.startDate)} al {formatDate(game.currentDate)}, empezando con{" "}
          {money(game.initialCash)}. Tu peor caída desde un máximo, medida en las fechas en que
          avanzaste el reloj, fue {formatPercent(dd)}.
        </p>
      </div>

      {game.blind && (
        <section aria-labelledby="reveal" className="rounded-lg border border-cobalt/40 bg-paper-raised p-5">
          <h2 id="reveal" className="font-semibold">
            Lo que estaba oculto
          </h2>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {game.universe.map((s) => (
              <li key={s}>
                {game.aliases[s]} era <span className="font-semibold">{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="vs" className="space-y-4">
        <h2 id="vs" className="text-lg font-semibold">
          Contra el mercado
        </h2>
        {error && <p role="alert" className="text-sm text-down">No se pudo cargar la comparación: {error}</p>}
        {loading && <div aria-busy="true" className="h-[320px] rounded-lg border border-grid bg-paper-raised" />}
        {bench && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-grid text-ink-soft">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Con el mismo capital en…</th>
                    <th className="py-2 pr-3 text-right font-medium">Terminaría con</th>
                    <th className="py-2 text-right font-medium">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grid">
                  {rows.map((r) => (
                    <tr key={r.name} className={cn(r.highlight && "font-semibold")}>
                      <td className="py-2 pr-3">
                        {r.name}
                        {r === best && <span className="ml-2 text-xs font-normal text-up">el mejor</span>}
                      </td>
                      <td className="py-2 pr-3 text-right">{money(r.final)}</td>
                      <td className={cn("py-2 text-right", r.final >= game.initialCash ? "text-up" : "text-down")}>
                        {formatPercent(r.final / game.initialCash - 1, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LineChart lines={lines} format="money" height={340} label="Tu portafolio frente al mercado" />
          </>
        )}
      </section>

      <section aria-labelledby="habits">
        <h2 id="habits" className="text-lg font-semibold">
          Tus hábitos
        </h2>
        <ul className="mt-3 max-w-3xl space-y-3">
          {insights.map((t) => (
            <li key={t} className="border-l-2 border-grid pl-4 leading-relaxed">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="today" className="rounded-lg border border-grid bg-paper-raised p-5">
        <h2 id="today" className="font-semibold">
          ¿Y hoy qué harías?
        </h2>
        <p className="mt-1 max-w-3xl text-ink-soft">
          Mira los mismos activos con los datos de hoy en el analizador. Antes de decidir, piensa qué
          harías distinto de lo que hiciste en esta partida.
        </p>
        <Link
          href={`/analizar/comparar?${new URLSearchParams({ t: game.universe.join(",") })}`}
          className="mt-3 inline-block rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Comparar estos activos hoy
        </Link>
      </section>

      <div className="flex flex-wrap gap-4 border-t border-grid pt-6 text-sm">
        <Link href="/simular" className="text-cobalt underline-offset-4 hover:underline">
          Nueva partida
        </Link>
        <Link href="/simular/perfil" className="text-cobalt underline-offset-4 hover:underline">
          Tu perfil de inversionista
        </Link>
        <button type="button" onClick={() => exportGame(game)} className="text-cobalt underline-offset-4 hover:underline">
          Exportar esta partida
        </button>
      </div>
    </div>
  );
}
