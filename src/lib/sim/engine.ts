// Motor del simulador. Lógica pura e inmutable: cada operación devuelve una
// partida nueva o un error en palabras. La interfaz y el servidor solo le pasan
// precios ya cortados en la fecha simulada.

import { addDays } from "../market/as-of";
import { cdtReturn } from "../rates/cdt-math";

export type Currency = "COP" | "USD";

export type Position = {
  symbol: string;
  units: number;
  /** Lo que costó en pesos, comisiones incluidas (costo promedio). */
  costCop: number;
  /** Fecha de la primera compra de la posición actual. */
  openedAt: string;
};

export type CdtHolding = {
  id: string;
  entity: string;
  amount: number;
  /** Tasa efectiva anual en fracción. */
  rate: number;
  termDays: number;
  start: string;
  maturity: string;
};

export type Trade = {
  id: string;
  date: string;
  kind: "buy" | "sell" | "cdt_open" | "cdt_mature";
  symbol: string;
  units: number;
  /** Precio de cierre mostrado (en la moneda del activo). */
  price: number;
  /** Pesos por unidad de moneda, ya con el diferencial aplicado. */
  fx: number;
  /** Pesos que salieron (compra) o entraron (venta) de la caja. */
  cashCop: number;
  feesCop: number;
  /** Para ventas: ganancia o pérdida realizada en pesos. */
  realizedCop?: number;
  /** Para ventas: días que se mantuvo la posición. */
  heldDays?: number;
  /** Rentabilidad del activo en los 21 periodos previos a la compra (perseguir subidas). */
  priorMonthReturn?: number;
};

export type GameSettings = {
  /** Comisión por operación, en fracción del monto. */
  commission: number;
  /** Diferencial al cambiar pesos por dólares y viceversa, en fracción. */
  fxSpread: number;
  /** Retención en la fuente sobre intereses de CDT. */
  cdtRetention: number;
};

export type Game = {
  id: string;
  name: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  currentDate: string;
  initialCash: number;
  cash: number;
  universe: string[];
  blind: boolean;
  /** Alias para el modo a ciegas: símbolo → "Activo A". */
  aliases: Record<string, string>;
  settings: GameSettings;
  positions: Position[];
  cdts: CdtHolding[];
  trades: Trade[];
  /** Valor total registrado en cada avance del reloj. */
  history: { date: string; value: number }[];
  finished: boolean;
  /** Valor final de las referencias, guardado al ver los resultados (para el perfil). */
  benchmarkFinals?: { spy?: number; icolcap?: number; cdt?: number };
};

export const DEFAULT_SETTINGS: GameSettings = {
  commission: 0.005,
  fxSpread: 0.01,
  cdtRetention: 0.04,
};

/** Precio conocido en la fecha simulada. `adj` sirve para valorar (incluye dividendos). */
export type Quote = {
  symbol: string;
  currency: Currency;
  close: number;
  adj: number;
  date: string;
  /** Rentabilidad de los últimos ~21 periodos, si se conoce. */
  monthReturn?: number;
};

export type Result = { ok: true; game: Game } | { ok: false; error: string };

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

let counter = 0;
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function letterAlias(i: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Activo ${i < 26 ? letters[i] : `${letters[Math.floor(i / 26) - 1]}${letters[i % 26]}`}`;
}

export function createGame(opts: {
  name: string;
  startDate: string;
  endDate: string;
  initialCash: number;
  universe: string[];
  blind: boolean;
  settings?: Partial<GameSettings>;
  /** Para pruebas: orden de barajado determinista. */
  shuffle?: <T>(xs: T[]) => T[];
}): Game {
  const universe = [...new Set(opts.universe.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const shuffle =
    opts.shuffle ??
    (<T,>(xs: T[]) => {
      const a = [...xs];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  const aliases = Object.fromEntries(shuffle(universe).map((s, i) => [s, letterAlias(i)]));
  return {
    id: newId("g"),
    name: opts.name,
    createdAt: new Date().toISOString(),
    startDate: opts.startDate,
    endDate: opts.endDate,
    currentDate: opts.startDate,
    initialCash: opts.initialCash,
    cash: opts.initialCash,
    universe,
    blind: opts.blind,
    aliases,
    settings: { ...DEFAULT_SETTINGS, ...opts.settings },
    positions: [],
    cdts: [],
    trades: [],
    history: [{ date: opts.startDate, value: opts.initialCash }],
    finished: false,
  };
}

/** Nombre a mostrar: el alias en modo a ciegas mientras la partida sigue. */
export function displayName(game: Game, symbol: string) {
  return game.blind && !game.finished ? (game.aliases[symbol] ?? symbol) : symbol;
}

/** Día de la partida (1 = fecha de inicio), para el modo a ciegas. */
export function dayNumber(game: Game, date = game.currentDate) {
  return daysBetween(game.startDate, date) + 1;
}

/** Pesos por unidad para comprar (pagas el diferencial) o vender (lo descuentan). */
function effectiveFx(q: Quote, fx: number, side: "buy" | "sell", spread: number) {
  if (q.currency === "COP") return 1;
  return side === "buy" ? fx * (1 + spread) : fx * (1 - spread);
}

export function buy(game: Game, q: Quote, amountCop: number, fx: number): Result {
  if (game.finished) return { ok: false, error: "La partida ya terminó." };
  if (!(amountCop > 0)) return { ok: false, error: "Escribe un monto mayor que cero." };
  if (amountCop > game.cash + 1e-6) {
    return { ok: false, error: "No tienes suficiente efectivo para esa compra." };
  }
  if (q.date > game.currentDate) return { ok: false, error: "Precio posterior a la fecha simulada." };

  const fee = amountCop * game.settings.commission;
  const rate = effectiveFx(q, fx, "buy", game.settings.fxSpread);
  const units = (amountCop - fee) / (q.adj * rate);

  const existing = game.positions.find((p) => p.symbol === q.symbol);
  const positions = existing
    ? game.positions.map((p) =>
        p.symbol === q.symbol ? { ...p, units: p.units + units, costCop: p.costCop + amountCop } : p,
      )
    : [...game.positions, { symbol: q.symbol, units, costCop: amountCop, openedAt: game.currentDate }];

  const trade: Trade = {
    id: newId("t"),
    date: game.currentDate,
    kind: "buy",
    symbol: q.symbol,
    units,
    price: q.close,
    fx: rate,
    cashCop: amountCop,
    feesCop: fee + (q.currency === "USD" ? (amountCop - fee) * (1 - fx / rate) : 0),
    priorMonthReturn: q.monthReturn,
  };
  return { ok: true, game: { ...game, cash: game.cash - amountCop, positions, trades: [...game.trades, trade] } };
}

/** Vende una fracción (0–1] de la posición. */
export function sell(game: Game, q: Quote, fraction: number, fx: number): Result {
  if (game.finished) return { ok: false, error: "La partida ya terminó." };
  const pos = game.positions.find((p) => p.symbol === q.symbol);
  if (!pos) return { ok: false, error: "No tienes ese activo." };
  if (!(fraction > 0 && fraction <= 1)) return { ok: false, error: "Elige cuánto vender." };
  if (q.date > game.currentDate) return { ok: false, error: "Precio posterior a la fecha simulada." };

  const units = fraction === 1 ? pos.units : pos.units * fraction;
  const rate = effectiveFx(q, fx, "sell", game.settings.fxSpread);
  const gross = units * q.adj * rate;
  const fee = gross * game.settings.commission;
  const proceeds = gross - fee;
  const costPart = pos.costCop * (units / pos.units);

  const remaining = pos.units - units;
  const positions =
    remaining <= pos.units * 1e-9
      ? game.positions.filter((p) => p.symbol !== q.symbol)
      : game.positions.map((p) =>
          p.symbol === q.symbol ? { ...p, units: remaining, costCop: p.costCop - costPart } : p,
        );

  const trade: Trade = {
    id: newId("t"),
    date: game.currentDate,
    kind: "sell",
    symbol: q.symbol,
    units,
    price: q.close,
    fx: rate,
    cashCop: proceeds,
    feesCop: fee + (q.currency === "USD" ? units * q.adj * (fx - rate) : 0),
    realizedCop: proceeds - costPart,
    heldDays: daysBetween(pos.openedAt, game.currentDate),
  };
  return { ok: true, game: { ...game, cash: game.cash + proceeds, positions, trades: [...game.trades, trade] } };
}

export function openCdt(
  game: Game,
  opts: { entity: string; amount: number; rate: number; termDays: number },
): Result {
  if (game.finished) return { ok: false, error: "La partida ya terminó." };
  if (!(opts.amount > 0)) return { ok: false, error: "Escribe un monto mayor que cero." };
  if (opts.amount > game.cash + 1e-6) return { ok: false, error: "No tienes suficiente efectivo." };
  const maturity = addDays(game.currentDate, opts.termDays);
  const cdt: CdtHolding = { id: newId("c"), start: game.currentDate, maturity, ...opts };
  const trade: Trade = {
    id: newId("t"),
    date: game.currentDate,
    kind: "cdt_open",
    symbol: `CDT ${opts.termDays} días`,
    units: 0,
    price: opts.rate,
    fx: 1,
    cashCop: opts.amount,
    feesCop: 0,
  };
  return {
    ok: true,
    game: { ...game, cash: game.cash - opts.amount, cdts: [...game.cdts, cdt], trades: [...game.trades, trade] },
  };
}

/** Valor de un CDT en una fecha: capital más intereses netos causados. */
export function cdtValueAt(c: CdtHolding, date: string, retention: number) {
  const days = Math.max(0, Math.min(c.termDays, daysBetween(c.start, date)));
  return days === 0 ? c.amount : c.amount + cdtReturn(c.amount, c.rate, days, retention).net;
}

/**
 * Mueve el reloj. Los CDT que vencen en el camino se pagan a la caja con sus
 * intereses netos. `value` es el valor total en la nueva fecha (lo calcula
 * quien tiene los precios) y queda en el historial.
 */
export function advance(game: Game, newDate: string): Game {
  if (game.finished || newDate <= game.currentDate) return game;
  const date = newDate > game.endDate ? game.endDate : newDate;

  let cash = game.cash;
  const trades = [...game.trades];
  const cdts: CdtHolding[] = [];
  for (const c of game.cdts) {
    if (c.maturity <= date) {
      const r = cdtReturn(c.amount, c.rate, c.termDays, game.settings.cdtRetention);
      cash += c.amount + r.net;
      trades.push({
        id: newId("t"),
        date: c.maturity,
        kind: "cdt_mature",
        symbol: `CDT ${c.termDays} días`,
        units: 0,
        price: c.rate,
        fx: 1,
        cashCop: c.amount + r.net,
        feesCop: r.retention,
        realizedCop: r.net,
        heldDays: c.termDays,
      });
    } else {
      cdts.push(c);
    }
  }
  return { ...game, currentDate: date, cash, cdts, trades };
}

export type Valuation = {
  cash: number;
  positions: (Position & { valueCop: number; pnlCop: number; pnlPct: number; weight: number; quote?: Quote })[];
  cdtValue: number;
  total: number;
  /** Símbolos sin precio en la fecha (no se pudieron valorar). */
  missing: string[];
};

/** Valor de la partida en la fecha actual. Valora al precio de venta (con diferencial). */
export function valuate(game: Game, quotes: Map<string, Quote>, fx: number | null): Valuation {
  const missing: string[] = [];
  const rows = game.positions.map((p) => {
    const q = quotes.get(p.symbol);
    if (!q || (q.currency === "USD" && fx === null)) {
      missing.push(p.symbol);
      return { ...p, valueCop: p.costCop, pnlCop: 0, pnlPct: 0, weight: 0, quote: q };
    }
    const rate = q.currency === "COP" ? 1 : fx!;
    const valueCop = p.units * q.adj * rate;
    return { ...p, valueCop, pnlCop: valueCop - p.costCop, pnlPct: valueCop / p.costCop - 1, weight: 0, quote: q };
  });
  const cdtValue = game.cdts.reduce(
    (s, c) => s + cdtValueAt(c, game.currentDate, game.settings.cdtRetention),
    0,
  );
  const total = game.cash + cdtValue + rows.reduce((s, r) => s + r.valueCop, 0);
  return {
    cash: game.cash,
    positions: rows.map((r) => ({ ...r, weight: total > 0 ? r.valueCop / total : 0 })),
    cdtValue,
    total,
    missing,
  };
}

/** Registra el valor del día en el historial (reemplaza si ya existe la fecha). */
export function recordValue(game: Game, value: number): Game {
  const history = game.history.filter((h) => h.date !== game.currentDate);
  history.push({ date: game.currentDate, value });
  history.sort((a, b) => a.date.localeCompare(b.date));
  return { ...game, history };
}

export function finish(game: Game): Game {
  return { ...game, finished: true };
}

/** Siguiente día hábil (lunes a viernes) después de sumar `days`. */
export function nextWeekday(date: string, days: number) {
  let d = addDays(date, days);
  for (;;) {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) return d;
    d = addDays(d, 1);
  }
}

export type BehaviorStats = {
  trades: number;
  feesCop: number;
  /** Días promedio que mantuviste las ventas con ganancia y con pérdida. */
  avgHeldWinners: number | null;
  avgHeldLosers: number | null;
  /** Compras hechas después de que el activo subiera más de 10 % en un mes. */
  chaseBuys: number;
  buys: number;
  winRate: number | null;
};

/** Patrones de comportamiento a partir del historial de operaciones. */
export function behavior(game: Game): BehaviorStats {
  const sells = game.trades.filter((t) => t.kind === "sell");
  const buys = game.trades.filter((t) => t.kind === "buy");
  const winners = sells.filter((t) => (t.realizedCop ?? 0) > 0);
  const losers = sells.filter((t) => (t.realizedCop ?? 0) <= 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    trades: buys.length + sells.length,
    feesCop: game.trades.filter((t) => t.kind === "buy" || t.kind === "sell").reduce((s, t) => s + t.feesCop, 0),
    avgHeldWinners: avg(winners.map((t) => t.heldDays ?? 0)),
    avgHeldLosers: avg(losers.map((t) => t.heldDays ?? 0)),
    chaseBuys: buys.filter((t) => (t.priorMonthReturn ?? 0) > 0.1).length,
    buys: buys.length,
    winRate: sells.length ? winners.length / sells.length : null,
  };
}
