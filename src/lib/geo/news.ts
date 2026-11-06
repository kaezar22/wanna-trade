import "server-only";

// Noticias de geopolítica enriquecidas: se leen los RSS de una lista fija de
// medios, se toma lo más reciente de cada uno y DeepSeek resume y clasifica
// cada noticia (personas, países, tema, tono y efecto en el riesgo). Sin base
// de datos: el resultado se guarda en caché una hora.

import { cacheLife } from "next/cache";
import { chat } from "../deepseek";
import { parseClassification, TOPICS, type Classification } from "./classify";
import { looksGeopolitical, OUTLETS, type Outlet } from "./outlets";
import { decodeBody, parseFeed, type FeedItem } from "./rss";
import { mockGeoNews } from "./mock";

export type GeoItem = Omit<Classification, "i"> & {
  id: string;
  title: string;
  url: string;
  date: string;
  outlet: Pick<Outlet, "id" | "name" | "country" | "ownership">;
};

export type OutletStatus = { id: string; name: string; country: string; fetched: number; used: number; error?: string };

export type GeoNews =
  | { ok: true; generatedAt: string; items: GeoItem[]; outlets: OutletStatus[]; candidates: number }
  | { ok: false; message: string };

const PER_OUTLET = 5;
const WINDOW_HOURS = 48;
const BATCH = 15;

async function readOutlet(o: Outlet): Promise<{ items: FeedItem[]; error?: string }> {
  try {
    const res = await fetch(o.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; wanna-trade/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { items: [], error: `respondió ${res.status}` };
    return { items: parseFeed(decodeBody(await res.arrayBuffer(), res.headers.get("content-type"))) };
  } catch (e) {
    return { items: [], error: e instanceof Error && e.name === "TimeoutError" ? "no respondió a tiempo" : "no se pudo leer" };
  }
}

const SYSTEM = `Eres un analista de geopolítica que prepara datos para inversionistas.
Respondes siempre en español y solo con un objeto JSON válido.
Usa únicamente el título y la descripción de cada noticia; no agregues hechos que sepas por otra vía.
Describe sin tomar partido: el tono es el de la noticia, no tu opinión sobre las personas o los países.`;

function prompt(batch: { o: Outlet; item: FeedItem }[]) {
  const list = batch
    .map(({ o, item }, i) => `[${i}] (${o.name}) ${item.title}\n${item.description.slice(0, 500)}`)
    .join("\n\n");
  const topics = Object.entries(TOPICS)
    .map(([k, v]) => `"${k}" (${v})`)
    .join(", ");
  return `Noticias:

${list}

Para cada noticia devuelve un elemento en "items":
{"i": índice, "geo": true si trata de relaciones entre países, conflictos, comercio internacional, sanciones,
 energía, diplomacia, elecciones o política de un país con efecto internacional; false si es local, sucesos,
 deportes, farándula, ciencia o consumo,
 "summary": "1 o 2 frases en español con lo esencial",
 "people": ["personas protagonistas, nombre y apellido como se conocen en español, máximo 4"],
 "countries": ["códigos ISO 3166-1 alfa-2 de los países involucrados, EU para la Unión Europea, máximo 6"],
 "topic": uno de ${topics},
 "subtopic": "2 a 4 palabras en español, p. ej. Guerra en Ucrania, Aranceles de EE. UU.",
 "tone": "positivo" | "neutral" | "negativo",
 "risk": "aumenta" | "neutral" | "disminuye" (si la noticia sube o baja la incertidumbre que perciben los mercados)}

Si "geo" es false basta con {"i": índice, "geo": false}.
Responde: {"items": [...]}`;
}

async function classify(batch: { o: Outlet; item: FeedItem }[]): Promise<Classification[]> {
  const raw = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt(batch) },
    ],
    { json: true, temperature: 0.1, maxTokens: 3500 },
  );
  return parseClassification(raw, batch.length);
}

async function build(): Promise<GeoNews> {
  const since = Date.now() - WINDOW_HOURS * 3600_000;
  const reads = await Promise.all(OUTLETS.map(readOutlet));

  const candidates: { o: Outlet; item: FeedItem }[] = [];
  const outlets: OutletStatus[] = OUTLETS.map((o, k) => {
    const { items, error } = reads[k];
    const recent = items
      .filter((it) => Date.parse(it.date) >= since)
      .filter((it) => !o.mixed || looksGeopolitical(`${it.title} ${it.description}`))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, PER_OUTLET);
    candidates.push(...recent.map((item) => ({ o, item })));
    return { id: o.id, name: o.name, country: o.country, fetched: items.length, used: 0, error };
  });

  if (!candidates.length) return { ok: false, message: "Ningún medio entregó noticias recientes. Intenta más tarde." };

  const batches: { o: Outlet; item: FeedItem }[][] = [];
  for (let k = 0; k < candidates.length; k += BATCH) batches.push(candidates.slice(k, k + BATCH));
  const results = await Promise.allSettled(batches.map(classify));

  const items: GeoItem[] = [];
  results.forEach((r, b) => {
    if (r.status !== "fulfilled") return;
    for (const c of r.value) {
      const { o, item } = batches[b][c.i];
      const { i: _i, ...rest } = c;
      void _i;
      items.push({
        ...rest,
        id: `${o.id}-${item.url}`,
        title: item.title,
        url: item.url,
        date: item.date,
        outlet: { id: o.id, name: o.name, country: o.country, ownership: o.ownership },
      });
    }
  });

  if (!results.some((r) => r.status === "fulfilled")) {
    const first = results.find((r) => r.status === "rejected");
    const reason = first?.status === "rejected" && first.reason instanceof Error ? first.reason.message : "";
    return { ok: false, message: `No se pudieron clasificar las noticias con DeepSeek. ${reason}`.trim() };
  }

  for (const it of items) {
    const s = outlets.find((x) => x.id === it.outlet.id);
    if (s) s.used += 1;
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return { ok: true, generatedAt: new Date().toISOString(), items, outlets, candidates: candidates.length };
}

/** Tabla de noticias de geopolítica. Se recalcula como mucho una vez por hora. */
export async function getGeoNews(): Promise<GeoNews> {
  "use cache";
  let result: GeoNews;
  try {
    result = process.env.MARKET_DATA_MOCK === "1" ? mockGeoNews() : await build();
  } catch (e) {
    result = { ok: false, message: e instanceof Error ? e.message : "Error desconocido." };
  }
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}
