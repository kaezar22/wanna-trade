import "server-only";

// Titulares de NewsAPI. El plan gratuito solo cubre aproximadamente el último
// mes; para el simulador (noticias de hace años) usaremos otra fuente.

export type Headline = {
  title: string;
  source: string | null;
  url: string;
  publishedAt: string; // ISO
};

export class NewsError extends Error {}

export async function fetchHeadlines(query: string, max = 20): Promise<Headline[]> {
  const key = process.env.NEWS_API_KEY;
  if (!key) throw new NewsError("Falta NEWS_API_KEY en las variables de entorno.");

  const params = new URLSearchParams({
    q: query,
    sortBy: "publishedAt",
    pageSize: String(max),
    language: "en",
    searchIn: "title,description",
  });

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    headers: { "X-Api-Key": key, "User-Agent": "wanna-trade" },
    cache: "no-store",
  }).catch((e) => {
    throw new NewsError(`No se pudo contactar a NewsAPI: ${String(e)}`);
  });

  const body = (await res.json().catch(() => null)) as {
    status?: string;
    message?: string;
    articles?: {
      title?: string | null;
      url?: string;
      publishedAt?: string;
      source?: { name?: string | null };
    }[];
  } | null;

  if (!res.ok || body?.status !== "ok") {
    throw new NewsError(`NewsAPI respondió: ${body?.message ?? res.status}`);
  }

  const seen = new Set<string>();
  return (body.articles ?? [])
    .filter((a) => a.title && a.url && a.publishedAt && a.title !== "[Removed]")
    .filter((a) => {
      const k = a.title!.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((a) => ({
      title: a.title!,
      source: a.source?.name ?? null,
      url: a.url!,
      publishedAt: a.publishedAt!,
    }));
}
