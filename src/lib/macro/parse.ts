// Lectura de series macro. Funciones puras para poder probarlas.

export type MacroPoint = { date: string; value: number };

/**
 * CSV de FRED (fredgraph.csv): una columna de fecha y una de valor. Los datos
 * faltantes vienen como "." y se descartan. Los valores quedan en fracción
 * (5.33 → 0.0533).
 */
export function parseFredCsv(csv: string): MacroPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  const out: MacroPoint[] = [];
  for (const line of lines.slice(1)) {
    const [date, raw] = line.split(",");
    const v = Number(raw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || raw === "." || !Number.isFinite(v)) continue;
    out.push({ date, value: v / 100 });
  }
  return out;
}

/** Último valor de cada mes (para series diarias). */
export function monthlyLast(points: MacroPoint[]): MacroPoint[] {
  const byMonth = new Map<string, MacroPoint>();
  for (const p of points) byMonth.set(p.date.slice(0, 7), p);
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Cambio entre el último valor y el de hace `months` meses. */
export function changeOver(points: MacroPoint[], months: number): number | null {
  const last = points.at(-1);
  if (!last) return null;
  const target = new Date(`${last.date.slice(0, 7)}-01T00:00:00Z`);
  target.setUTCMonth(target.getUTCMonth() - months);
  const key = target.toISOString().slice(0, 7);
  const prev = [...points].reverse().find((p) => p.date.slice(0, 7) <= key);
  return prev ? last.value - prev.value : null;
}

function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/**
 * Inflación anual a partir de la UVR diaria.
 *
 * La UVR crece del día 16 de un mes al 15 del siguiente con la variación del
 * IPC del mes calendario anterior al inicio de ese periodo. Así, entre el 15 de
 * M−12 y el 15 de M acumula la inflación de los 12 meses que terminan en M−2:
 *   inflación anual(X) = UVR(15 de X+2) / UVR(15 de X−10) − 1
 */
export function inflationFromUvr(uvr: MacroPoint[]): MacroPoint[] {
  const on15 = new Map(uvr.filter((p) => p.date.endsWith("-15")).map((p) => [p.date.slice(0, 7), p.value]));
  const out: MacroPoint[] = [];
  for (const month of [...on15.keys()].sort()) {
    const x = shiftMonth(month, -2); // mes de la inflación que se puede calcular con este dato
    const start = on15.get(shiftMonth(x, -10));
    const end = on15.get(month);
    if (start && end) out.push({ date: `${x}-01`, value: end / start - 1 });
  }
  return out;
}
