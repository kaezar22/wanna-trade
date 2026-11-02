import type { Time, UTCTimestamp } from "lightweight-charts";
import type { Bar, Interval } from "@/lib/market/types";

/** Tiempo para el gráfico: fecha de sesión en diario o mayor; instante en horario. */
export function chartTime(bar: Bar, interval: Interval): Time {
  return interval === "1h" ? (bar.time as UTCTimestamp) : bar.date;
}

function addDaysISO(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Posiciones futuras después de la última barra, para dibujar la nube de
 * Ichimoku y el rango esperado. Son solo tiempos, sin precios.
 */
export function futureTimes(last: Bar, interval: Interval, count: number): Time[] {
  const out: Time[] = [];
  if (interval === "1h") {
    for (let i = 1; i <= count; i++) out.push((last.time + i * 3600) as UTCTimestamp);
    return out;
  }
  let date = last.date;
  while (out.length < count) {
    if (interval === "1d") {
      date = addDaysISO(date, 1);
      const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue;
    } else if (interval === "1wk") {
      date = addDaysISO(date, 7);
    } else {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + 1, 1);
      date = d.toISOString().slice(0, 10);
    }
    out.push(date);
  }
  return out;
}
