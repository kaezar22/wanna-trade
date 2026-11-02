// Lectura de respuestas SDMX (la API del Banco de la República). Acepta
// SDMX-JSON y las dos variantes de SDMX-ML (genérico y específico de
// estructura). Funciones puras para poder probarlas.

import type { MacroPoint } from "./parse";

/** Lleva los formatos de periodo comunes a AAAA-MM-DD. */
export function normalizeDate(period: string): string | null {
  const p = period.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(p))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p))) return `${m[3]}-${m[2]}-${m[1]}`;
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return `${m[1]}-${m[2]}-01`;
  if ((m = /^(\d{4})-?M(\d{2})$/.exec(p))) return `${m[1]}-${m[2]}-01`;
  if ((m = /^(\d{4})-?D(\d{3})$/.exec(p))) {
    const d = new Date(Date.UTC(Number(m[1]), 0, Number(m[2])));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** "385.12" → 385.12; "385,12" → 385.12; "1.234,5" → 1234.5. */
export function parseNumber(raw: string): number {
  const s = raw.trim();
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(",", "."));
  return Number(s);
}

function finish(points: { period: string; value: number }[], scale: number): MacroPoint[] {
  const byDate = new Map<string, number>();
  for (const p of points) {
    const date = normalizeDate(p.period);
    if (date && Number.isFinite(p.value)) byDate.set(date, p.value * scale);
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

type SdmxJson = {
  data?: SdmxJson;
  dataSets?: { series?: Record<string, { observations?: Record<string, (number | string | null)[]> }> }[];
  structure?: { dimensions?: { observation?: { id: string; values: { id: string }[] }[] } };
};

export function parseSdmxJson(body: unknown, scale = 1): MacroPoint[] {
  const root = (body as SdmxJson)?.data ?? (body as SdmxJson);
  const series = root?.dataSets?.[0]?.series ?? {};
  const timeDim = root?.structure?.dimensions?.observation?.find((d) => d.id === "TIME_PERIOD") ??
    root?.structure?.dimensions?.observation?.[0];
  if (!timeDim) return [];
  // Si hay varias series, se usa la que tiene más observaciones.
  const best = Object.values(series).sort(
    (a, b) => Object.keys(b.observations ?? {}).length - Object.keys(a.observations ?? {}).length,
  )[0];
  if (!best?.observations) return [];
  return finish(
    Object.entries(best.observations).map(([idx, obs]) => ({
      period: timeDim.values[Number(idx)]?.id ?? "",
      value: Number(obs[0]),
    })),
    scale,
  );
}

function attr(tag: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

export type SdmxSeries = {
  /** Dimensiones de la serie (REFERENCE_AREA, UNIT_MEASURE…). */
  key: Record<string, string>;
  points: MacroPoint[];
};

function seriesKey(block: string): Record<string, string> {
  const key: Record<string, string> = {};
  // Genérico: <generic:SeriesKey><generic:Value id="X" value="Y" />…
  const sk = /<(?:\w+:)?SeriesKey>([\s\S]*?)<\/(?:\w+:)?SeriesKey>/.exec(block)?.[1];
  if (sk) {
    for (const m of sk.matchAll(/<(?:\w+:)?Value\b[^>]*>/g)) {
      const id = attr(m[0], "id");
      const value = attr(m[0], "value");
      if (id && value !== undefined) key[id] = value;
    }
    return key;
  }
  // Específico de estructura: atributos en la etiqueta <Series …>
  const tag = /^<(?:\w+:)?Series\b[^>]*>/.exec(block)?.[0] ?? "";
  for (const m of tag.matchAll(/\b(\w+)="([^"]*)"/g)) key[m[1]] = m[2];
  return key;
}

function observations(block: string): { period: string; value: number }[] {
  const points: { period: string; value: number }[] = [];

  // Específico de estructura: <Obs TIME_PERIOD="2024-01" OBS_VALUE="13.0" />
  for (const m of block.matchAll(/<(?:\w+:)?Obs\b[^>]*>/g)) {
    const period = attr(m[0], "TIME_PERIOD");
    const value = attr(m[0], "OBS_VALUE");
    if (period && value !== undefined) points.push({ period, value: parseNumber(value) });
  }
  if (points.length) return points;

  // Genérico: <generic:Obs><generic:ObsDimension value="…"/><generic:ObsValue value="…"/></generic:Obs>
  for (const m of block.matchAll(/<(?:\w+:)?Obs\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Obs>/g)) {
    const dim = /<(?:\w+:)?ObsDimension\b[^>]*>/.exec(m[1])?.[0];
    const period = dim ? attr(dim, "value") : undefined;
    const valTag = /<(?:\w+:)?ObsValue\b[^>]*>(?:([^<]*)<\/(?:\w+:)?ObsValue>)?/.exec(m[1]);
    const value = valTag ? (attr(valTag[0], "value") ?? valTag[1]) : undefined;
    if (period && value !== undefined && value.trim() !== "") points.push({ period, value: parseNumber(value) });
  }
  return points;
}

/** Todas las series de una respuesta SDMX-ML, cada una con sus dimensiones. */
export function parseSdmxXmlSeries(xml: string, scale = 1): SdmxSeries[] {
  const starts = [...xml.matchAll(/<(?:\w+:)?Series\b/g)].map((m) => m.index);
  if (!starts.length) return [{ key: {}, points: finish(observations(xml), scale) }];
  return starts.map((start, i) => {
    const block = xml.slice(start, starts[i + 1] ?? xml.length);
    return { key: seriesKey(block), points: finish(observations(block), scale) };
  });
}

/**
 * Una serie de una respuesta SDMX-ML. Si hay varias, `pick` elige; si no, se
 * usa la que tiene más observaciones.
 */
export function parseSdmxXml(
  xml: string,
  scale = 1,
  pick?: (s: SdmxSeries) => boolean,
): MacroPoint[] {
  const all = parseSdmxXmlSeries(xml, scale).filter((s) => s.points.length);
  const chosen = (pick ? all.filter(pick) : all).sort((a, b) => b.points.length - a.points.length)[0];
  return chosen?.points ?? [];
}
