import { connection } from "next/server";

// Ruta temporal: qué medios aparecen en las noticias de geopolítica de GDELT
// (API DOC 2.0) y con qué país e idioma. Sirve para armar la tabla de medios
// antes de construir la pestaña. GDELT pide una consulta cada 5 segundos, así
// que las consultas van en serie con una pausa entre ellas.

export const maxDuration = 120;

const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";

const QUERIES = [
  "theme:ARMEDCONFLICT",
  "theme:SANCTIONS",
  "(tariffs OR \"trade war\" OR \"trade deal\")",
  "(summit OR \"foreign minister\" OR ceasefire OR diplomacy)",
  "(Trump OR Putin OR \"Xi Jinping\" OR Zelensky OR Netanyahu)",
  "(OPEC OR \"oil prices\" OR pipeline) sourcelang:spanish",
];

type Article = {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  await connection();
  const timespan = new URL(request.url).searchParams.get("timespan") ?? "3d";

  const runs: { query: string; status?: number; articles?: number; error?: string; head?: string }[] = [];
  const all: Article[] = [];

  for (const [i, query] of QUERIES.entries()) {
    if (i > 0) await sleep(5500);
    const url = `${GDELT}?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=250&format=json&sort=DateDesc&timespan=${timespan}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "wanna-trade" }, cache: "no-store" });
      const text = await res.text();
      try {
        const data = JSON.parse(text) as { articles?: Article[] };
        const articles = data.articles ?? [];
        all.push(...articles);
        runs.push({ query, status: res.status, articles: articles.length });
      } catch {
        runs.push({ query, status: res.status, error: "no es JSON", head: text.slice(0, 300) });
      }
    } catch (e) {
      runs.push({ query, error: String(e) });
    }
  }

  const unique = new Map(all.filter((a) => a.url).map((a) => [a.url!, a]));
  const byDomain = new Map<string, { domain: string; count: number; country: string; languages: Set<string>; sample: string }>();
  for (const a of unique.values()) {
    const d = a.domain ?? "?";
    const row = byDomain.get(d) ?? { domain: d, count: 0, country: a.sourcecountry ?? "", languages: new Set(), sample: a.title ?? "" };
    row.count += 1;
    if (a.language) row.languages.add(a.language);
    byDomain.set(d, row);
  }
  const domains = [...byDomain.values()]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, languages: [...r.languages].join(", ") }));

  const countries = new Map<string, number>();
  for (const r of domains) countries.set(r.country || "(sin país)", (countries.get(r.country || "(sin país)") ?? 0) + r.count);

  return Response.json({
    timespan,
    runs,
    totalArticles: unique.size,
    totalDomains: domains.length,
    articleExample: [...unique.values()][0] ?? null,
    countries: Object.fromEntries([...countries.entries()].sort((a, b) => b[1] - a[1])),
    domains,
  });
}
