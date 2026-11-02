// Agrupa barras diarias en semanales o mensuales.
//
// No usamos las barras semanales/mensuales de Yahoo: Yahoo etiqueta la semana
// con el lunes pero incluye hasta el viernes, así que con una fecha de corte a
// mitad de semana filtraría precios del futuro. Agrupando nosotros las barras
// diarias ya cortadas, la última semana o mes queda parcial y sin fugas.

import type { Bar } from "./types";

function weekKey(date: string): string {
  // Lunes de la semana ISO de la fecha.
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function resample(daily: Bar[], to: "1wk" | "1mo"): Bar[] {
  const keyOf = to === "1wk" ? weekKey : monthKey;
  const out: Bar[] = [];
  let current: Bar | null = null;
  let currentKey = "";

  for (const b of daily) {
    const key = keyOf(b.date);
    if (current === null || key !== currentKey) {
      if (current) out.push(current);
      current = { ...b };
      currentKey = key;
      continue;
    }
    current.high = Math.max(current.high, b.high);
    current.low = Math.min(current.low, b.low);
    current.close = b.close;
    current.adjClose = b.adjClose;
    current.volume += b.volume;
    current.date = b.date; // última sesión incluida
  }
  if (current) out.push(current);
  return out;
}
