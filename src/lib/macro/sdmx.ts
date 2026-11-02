// Lectura de respuestas SDMX (la API del Banco de la República). Acepta
// SDMX-JSON y las dos variantes de SDMX-ML (genérico y específico de
// estructura). Funciones puras para poder probarlas.

import type { MacroPoint } from "./parse";

/** "2024-03" → "2024-03-01"; "2024-03-15" se deja igual. */
function normalizeDate(period: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(period)) return period.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  if (/^\d{4}-M\d{2}$/.test(period)) return `${period.slice(0, 4)}-${period.slice(6)}-01`;
  return null;
}

function finish(points: { period: string; value: number }[], scale: number): MacroPoint[] {
  const out: MacroPoint[] = [];
  for (const p of points) {
    const date = normalizeDate(p.period);
    if (date && Number.isFinite(p.value)) out.push({ date, value: p.value * scale });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
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

export function parseSdmxXml(xml: string, scale = 1): MacroPoint[] {
  const points: { period: string; value: number }[] = [];

  // Específico de estructura: <Obs TIME_PERIOD="2024-01" OBS_VALUE="13.0" />
  for (const m of xml.matchAll(/<(?:\w+:)?Obs\b[^>]*\/?>/g)) {
    const period = attr(m[0], "TIME_PERIOD");
    const value = attr(m[0], "OBS_VALUE");
    if (period && value !== undefined) points.push({ period, value: Number(value) });
  }
  if (points.length) return finish(points, scale);

  // Genérico: <generic:Obs><generic:ObsDimension value="…"/><generic:ObsValue value="…"/></generic:Obs>
  for (const m of xml.matchAll(/<(?:\w+:)?Obs>([\s\S]*?)<\/(?:\w+:)?Obs>/g)) {
    const period = /<(?:\w+:)?ObsDimension[^>]*value="([^"]+)"/.exec(m[1])?.[1];
    const value = /<(?:\w+:)?ObsValue[^>]*value="([^"]+)"/.exec(m[1])?.[1];
    if (period && value !== undefined) points.push({ period, value: Number(value) });
  }
  return finish(points, scale);
}
