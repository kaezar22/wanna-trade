// Perfil de decisiones: patrones acumulados de todas las partidas terminadas.

import { behavior, type Game } from "./engine";

export type Profile = {
  games: number;
  avgReturn: number;
  /** Partidas con referencia guardada y cuántas veces le ganaste. */
  vsSpy: { beat: number; of: number };
  vsCdt: { beat: number; of: number };
  trades: number;
  tradesPerMonth: number;
  /** Comisiones y diferencial como fracción del capital inicial, promedio por partida. */
  feesShare: number;
  avgHeldWinners: number | null;
  avgHeldLosers: number | null;
  /** Fracción de compras hechas tras una subida de más de 10 % en un mes. */
  chaseRate: number | null;
  /** Fracción de partidas en las que abriste algún CDT. */
  cdtUsage: number;
  /** Fracción de partidas en las que nunca vendiste nada. */
  passiveGames: number;
  insights: { title: string; text: string; tone: "good" | "warn" }[];
};

const DAY = 86_400_000;

export function buildProfile(all: Game[]): Profile | null {
  const games = all.filter((g) => g.finished && g.history.length > 1);
  if (games.length === 0) return null;

  const returns = games.map((g) => (g.history.at(-1)!.value / g.initialCash) - 1);
  const finals = games.map((g) => g.history.at(-1)!.value);

  const vs = (key: "spy" | "cdt") => {
    const with_ = games.map((g, i) => ({ ref: g.benchmarkFinals?.[key], final: finals[i] })).filter((x) => x.ref !== undefined);
    return { beat: with_.filter((x) => x.final > x.ref!).length, of: with_.length };
  };

  let winnerDays = 0;
  let winners = 0;
  let loserDays = 0;
  let losers = 0;
  let buys = 0;
  let chase = 0;
  let trades = 0;
  let months = 0;
  let feesShareSum = 0;

  for (const g of games) {
    const b = behavior(g);
    const sells = g.trades.filter((t) => t.kind === "sell");
    for (const t of sells) {
      if ((t.realizedCop ?? 0) > 0) {
        winners++;
        winnerDays += t.heldDays ?? 0;
      } else {
        losers++;
        loserDays += t.heldDays ?? 0;
      }
    }
    buys += b.buys;
    chase += b.chaseBuys;
    trades += b.trades;
    feesShareSum += b.feesCop / g.initialCash;
    months += Math.max(1, (Date.parse(g.currentDate) - Date.parse(g.startDate)) / DAY / 30.4);
  }

  const avgHeldWinners = winners ? winnerDays / winners : null;
  const avgHeldLosers = losers ? loserDays / losers : null;
  const chaseRate = buys ? chase / buys : null;
  const tradesPerMonth = trades / months;
  const cdtUsage = games.filter((g) => g.trades.some((t) => t.kind === "cdt_open")).length / games.length;
  const passiveGames = games.filter((g) => !g.trades.some((t) => t.kind === "sell")).length / games.length;
  const spy = vs("spy");
  const cdt = vs("cdt");
  const feesShare = feesShareSum / games.length;

  const insights: Profile["insights"] = [];
  if (avgHeldWinners !== null && avgHeldLosers !== null) {
    insights.push(
      avgHeldLosers > avgHeldWinners * 1.3
        ? {
            title: "Aguantas las pérdidas",
            text: `Vendes lo que gana en ${Math.round(avgHeldWinners)} días y aguantas lo que pierde ${Math.round(avgHeldLosers)}. Antes de vender, pregúntate qué esperas de cada activo hacia adelante, no si vas ganando o perdiendo.`,
            tone: "warn",
          }
        : {
            title: "Cortas pérdidas a tiempo",
            text: `Mantienes ganancias ${Math.round(avgHeldWinners)} días y pérdidas ${Math.round(avgHeldLosers)}: no se ve el sesgo de aguantar lo que pierde.`,
            tone: "good",
          },
    );
  }
  if (chaseRate !== null) {
    insights.push(
      chaseRate > 0.3
        ? {
            title: "Persigues subidas",
            text: `${Math.round(chaseRate * 100)} % de tus compras llegan después de que el activo subió más de 10 % en un mes. Prueba esperar un retroceso o comprar por partes.`,
            tone: "warn",
          }
        : {
            title: "No persigues el precio",
            text: "Pocas de tus compras llegan tras subidas fuertes.",
            tone: "good",
          },
    );
  }
  if (tradesPerMonth > 4 || feesShare > 0.02) {
    insights.push({
      title: "Operas mucho",
      text: `Haces ${tradesPerMonth.toFixed(1)} operaciones al mes y en costos se va en promedio ${(feesShare * 100).toFixed(1)} % de tu capital por partida. Menos movimientos suele dar mejores resultados.`,
      tone: "warn",
    });
  }
  if (spy.of > 0) {
    insights.push(
      spy.beat / spy.of >= 0.5
        ? {
            title: "Le ganas al S&P 500",
            text: `Superaste al S&P 500 en ${spy.beat} de ${spy.of} partidas. Pruébalo a ciegas para confirmar que no es memoria de lo que pasó.`,
            tone: "good",
          }
        : {
            title: "El índice te gana",
            text: `El S&P 500 te superó en ${spy.of - spy.beat} de ${spy.of} partidas. Comprar un ETF del índice y no tocarlo es una estrategia difícil de batir.`,
            tone: "warn",
          },
    );
  }
  if (cdtUsage === 0 && games.length >= 2) {
    insights.push({
      title: "No usas renta fija",
      text: "En ninguna partida abriste CDT. Una parte en renta fija reduce las caídas y te da caja para comprar cuando el mercado baja.",
      tone: "warn",
    });
  }

  return {
    games: games.length,
    avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
    vsSpy: spy,
    vsCdt: cdt,
    trades,
    tradesPerMonth,
    feesShare,
    avgHeldWinners,
    avgHeldLosers,
    chaseRate,
    cdtUsage,
    passiveGames,
    insights,
  };
}
