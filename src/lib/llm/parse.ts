// Validación de las respuestas JSON del LLM. Nunca confiamos en que el modelo
// siga el formato al pie de la letra: lo que no encaja se descarta.

export type Mood = "alcista" | "bajista" | "volatil" | "neutral";
const MOODS: readonly Mood[] = ["alcista", "bajista", "volatil", "neutral"];

export type SentimentAnalysis = {
  overall: Mood;
  /** −1 (muy negativo) a 1 (muy positivo). */
  score: number;
  summary: string;
  themes: string[];
  /** Sentimiento por titular, en el mismo orden de los titulares enviados. */
  items: ("positivo" | "negativo" | "neutral")[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function parseSentiment(raw: string, headlineCount: number): SentimentAnalysis | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const o = asRecord(data);
  if (!o) return null;

  const overall = normalize(String(o.overall ?? "")) as Mood;
  if (!MOODS.includes(overall)) return null;

  const score = Number(o.score);
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  if (!summary) return null;

  const themes = Array.isArray(o.themes)
    ? o.themes.filter((t): t is string => typeof t === "string" && t.trim() !== "").slice(0, 6)
    : [];

  const allowed = ["positivo", "negativo", "neutral"] as const;
  const rawItems = Array.isArray(o.items) ? o.items : [];
  const items = Array.from({ length: headlineCount }, (_, i) => {
    const v = normalize(String(rawItems[i] ?? "neutral"));
    return (allowed as readonly string[]).includes(v) ? (v as (typeof allowed)[number]) : "neutral";
  });

  return {
    overall,
    score: Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0,
    summary,
    themes,
    items,
  };
}

export type TickerSuggestion = { symbol: string; name: string; reason: string };

const SYMBOL = /^[A-Z0-9.\-=^]{1,20}$/;

export function parseTickers(raw: string, max = 15): TickerSuggestion[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = asRecord(data)?.tickers;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const out: TickerSuggestion[] = [];
  for (const item of list) {
    const o = asRecord(item);
    if (!o) continue;
    const symbol = String(o.symbol ?? "").trim().toUpperCase();
    if (!SYMBOL.test(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      symbol,
      name: typeof o.name === "string" ? o.name.trim() : "",
      reason: typeof o.reason === "string" ? o.reason.trim() : "",
    });
    if (out.length === max) break;
  }
  return out;
}
