// Lógica pura de CDT: interpretar filas de la Superfinanciera, promedios,
// rendimiento neto y renovación sucesiva. Sin acceso a red, para poder probarla.

/** Plazos que ofrecemos y su subcuenta en el Formato 441 (unidad de captura 1). */
export const CDT_TERMS = [
  { key: "30", days: 30, subcuenta: "10", description: "A 30 DIAS", label: "30 días" },
  { key: "60", days: 60, subcuenta: "50", description: "A 60 DIAS", label: "60 días" },
  { key: "90", days: 90, subcuenta: "70", description: "A 90 DIAS", label: "90 días" },
  { key: "120", days: 120, subcuenta: "90", description: "A 120 DIAS", label: "120 días" },
  { key: "180", days: 180, subcuenta: "110", description: "A 180 DIAS", label: "180 días" },
  { key: "360", days: 360, subcuenta: "130", description: "A 360 DIAS", label: "360 días" },
  {
    key: "360+",
    days: 540,
    subcuenta: "140",
    description: "SUPERIORES A 360 DIAS",
    label: "Más de 360 días",
  },
] as const;

export type CdtTermKey = (typeof CDT_TERMS)[number]["key"];

export const CDT_DESCRIPTIONS: string[] = CDT_TERMS.map((t) => t.description);

const ENTITY_TYPES: Record<string, string> = {
  "1": "Banco",
  "2": "Corporación financiera",
  "4": "Compañía de financiamiento",
  "32": "Cooperativa financiera",
};

export function entityTypeLabel(code: string): string {
  return ENTITY_TYPES[code] ?? "Otra entidad";
}

export function isCdtTermKey(v: string | null | undefined): v is CdtTermKey {
  return CDT_TERMS.some((t) => t.key === v);
}

export function termByKey(key: CdtTermKey) {
  return CDT_TERMS.find((t) => t.key === key)!;
}

/** Fila tal como llega de datos.gov.co (todo en texto). */
export type RawCdtRow = {
  tipoentidad: string;
  nombreentidad: string;
  fechacorte?: string;
  subcuenta: string;
  tasa: string;
  monto: string;
};

export type CdtQuote = {
  entity: string;
  entityType: string;
  /** Tasa efectiva anual, en fracción (0.1159 = 11,59 %). */
  rate: number;
  /** Monto captado ese día, en las unidades del reporte (miles de pesos). */
  amount: number;
  date: string; // YYYY-MM-DD
};

export type CdtTermSnapshot = {
  term: CdtTermKey;
  label: string;
  /** Promedio ponderado por monto, como la DTF. */
  average: number | null;
  quotes: CdtQuote[]; // de mayor a menor tasa
};

const termBySubcuenta = new Map<string, CdtTermKey>(CDT_TERMS.map((t) => [t.subcuenta, t.key]));

/**
 * Agrupa filas de varios días: por cada entidad y plazo se queda con la
 * observación más reciente. Así una entidad que no emitió ese día no desaparece.
 */
export function buildSnapshot(rows: RawCdtRow[]): CdtTermSnapshot[] {
  const latest = new Map<string, CdtQuote & { term: CdtTermKey }>();
  for (const r of rows) {
    const term = termBySubcuenta.get(r.subcuenta);
    const rate = Number(r.tasa) / 100;
    const amount = Number(r.monto);
    if (!term || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(amount) || amount <= 0) continue;
    const date = (r.fechacorte ?? "").slice(0, 10);
    const key = `${term}|${r.nombreentidad}`;
    const prev = latest.get(key);
    if (!prev || date > prev.date) {
      latest.set(key, {
        term,
        entity: r.nombreentidad,
        entityType: entityTypeLabel(r.tipoentidad),
        rate,
        amount,
        date,
      });
    }
  }

  return CDT_TERMS.map((t) => {
    const quotes = [...latest.values()]
      .filter((q) => q.term === t.key)
      .map((q): CdtQuote => ({
        entity: q.entity,
        entityType: q.entityType,
        rate: q.rate,
        amount: q.amount,
        date: q.date,
      }))
      .sort((a, b) => b.rate - a.rate);
    return { term: t.key, label: t.label, average: weightedAverage(quotes), quotes };
  });
}

export function weightedAverage(items: { rate: number; amount: number }[]): number | null {
  const total = items.reduce((s, q) => s + q.amount, 0);
  if (total <= 0) return null;
  return items.reduce((s, q) => s + q.rate * q.amount, 0) / total;
}

/** Promedio ponderado por mes (YYYY-MM) a partir de filas diarias. */
export function monthlyAverages(rows: { fechacorte: string; tasa: string; monto: string }[]) {
  const acc = new Map<string, { tm: number; m: number }>();
  for (const r of rows) {
    const rate = Number(r.tasa) / 100;
    const amount = Number(r.monto);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(amount) || amount <= 0) continue;
    const month = r.fechacorte.slice(0, 7);
    const a = acc.get(month) ?? { tm: 0, m: 0 };
    a.tm += rate * amount;
    a.m += amount;
    acc.set(month, a);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, a]) => ({ month, rate: a.tm / a.m }));
}

export type CdtResult = {
  gross: number;
  retention: number;
  net: number;
  /** Rentabilidad neta expresada como efectiva anual. */
  netAnnual: number;
  /** Rentabilidad neta descontando inflación, si se indica. */
  realAnnual: number | null;
};

/**
 * Rendimiento de un CDT. Simplificación: interés compuesto con base 365 a la
 * tasa efectiva anual, y retención como porcentaje de los intereses. Cada
 * entidad liquida a su manera, así que el resultado es aproximado.
 */
export function cdtReturn(
  capital: number,
  annualRate: number,
  days: number,
  retentionRate = 0.04,
  inflation: number | null = null,
): CdtResult {
  const gross = capital * ((1 + annualRate) ** (days / 365) - 1);
  const retention = gross * retentionRate;
  const net = gross - retention;
  const netAnnual = (1 + net / capital) ** (365 / days) - 1;
  const realAnnual = inflation === null ? null : (1 + netAnnual) / (1 + inflation) - 1;
  return { gross, retention, net, netAnnual, realAnnual };
}

/**
 * Valor diario de un capital que se invierte en CDT y se renueva al vencer,
 * cada vez a la tasa vigente en la fecha de renovación. Los intereses netos se
 * reinvierten.
 *
 * `rateAt(date)` debe devolver la tasa efectiva anual conocida en esa fecha.
 */
export function rollCdt(
  dates: string[],
  capital: number,
  termDays: number,
  rateAt: (date: string) => number | null,
  retentionRate = 0.04,
): { date: string; value: number }[] {
  if (dates.length === 0) return [];
  const dayMs = 86_400_000;
  const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);

  let principal = capital;
  let start = toTime(dates[0]);
  let rate = rateAt(dates[0]) ?? 0;
  const out: { date: string; value: number }[] = [];

  for (const d of dates) {
    const t = toTime(d);
    // Renovar todas las veces que haga falta hasta esta fecha.
    while ((t - start) / dayMs >= termDays) {
      const gross = principal * ((1 + rate) ** (termDays / 365) - 1);
      principal += gross * (1 - retentionRate);
      start += termDays * dayMs;
      const renewDate = new Date(start).toISOString().slice(0, 10);
      rate = rateAt(renewDate) ?? rate;
    }
    // Valor con los intereses causados hasta hoy, ya descontada la retención.
    const elapsed = (t - start) / dayMs;
    const accrued = principal * ((1 + rate) ** (elapsed / 365) - 1) * (1 - retentionRate);
    out.push({ date: d, value: principal + accrued });
  }
  return out;
}
