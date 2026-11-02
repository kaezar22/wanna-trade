import "server-only";

// Datos simulados para desarrollar sin conexión (MARKET_DATA_MOCK=1).
// Deterministas por símbolo. Los símbolos .CL imitan a Yahoo: solo cierre, sin volumen.

import { localDate } from "./as-of";
import type { Bar } from "./types";
import type { YahooRawSeries } from "./yahoo";

function seedFrom(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function mockBars(
  symbol: string,
  interval: "1d" | "1h",
  period1: number,
  period2: number,
): YahooRawSeries {
  let seed = seedFrom(symbol);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const closeOnly = symbol.endsWith(".CL");
  const step = interval === "1h" ? 3600 : 86400;
  const tz = closeOnly ? "America/Bogota" : "America/New_York";

  // Empieza en una fecha fija para que la misma fecha dé el mismo precio.
  const origin = Date.UTC(2010, 0, 4) / 1000 + 14.5 * 3600;
  let price = 20 + (seedFrom(symbol) % 300);
  const drift = (rand() - 0.45) * 0.002;
  const bars: Bar[] = [];

  for (let t = origin; t <= period2; t += step) {
    const day = new Date(t * 1000).getUTCDay();
    if (day === 0 || day === 6) continue;
    const open = price;
    price *= 1 + drift + (rand() - 0.5) * 0.04;
    const close = price;
    if (t < period1) continue;
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);
    bars.push({
      time: t,
      date: localDate(t, tz),
      open: closeOnly ? close : open,
      high: closeOnly ? close : high,
      low: closeOnly ? close : low,
      close,
      adjClose: close,
      volume: closeOnly ? 0 : Math.round(1e6 * (0.5 + rand())),
    });
  }

  return {
    meta: {
      symbol,
      name: `${symbol} (datos simulados)`,
      currency: closeOnly ? "COP" : "USD",
      exchange: closeOnly ? "Colombia" : "Simulado",
      type: closeOnly ? "ETF" : "EQUITY",
      timezone: tz,
    },
    bars,
  };
}
