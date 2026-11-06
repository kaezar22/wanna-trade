import { connection } from "next/server";

// Ruta temporal (segunda prueba de geopolítica). La API DOC de GDELT respondió
// 429 a todo desde Vercel (IP compartida). Aquí se prueban tres caminos:
//  1. La API DOC con reintentos largos (una sola consulta).
//  2. Los archivos crudos de GDELT (data.gdeltproject.org), que no pasan por la API.
//  3. RSS de una lista de medios internacionales con país conocido.

export const maxDuration = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "Mozilla/5.0 (compatible; wanna-trade/1.0)" };

const FEEDS: { name: string; country: string; url: string }[] = [
  { name: "BBC World", country: "GB", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "The Guardian", country: "GB", url: "https://www.theguardian.com/world/rss" },
  { name: "Al Jazeera", country: "QA", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "New York Times", country: "US", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { name: "CBC", country: "CA", url: "https://www.cbc.ca/webfeed/rss/rss-world" },
  { name: "DW", country: "DE", url: "https://rss.dw.com/rdf/rss-en-world" },
  { name: "France 24", country: "FR", url: "https://www.france24.com/en/rss" },
  { name: "El País", country: "ES", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada" },
  { name: "TASS", country: "RU", url: "https://tass.com/rss/v2.xml" },
  { name: "Kyiv Independent", country: "UA", url: "https://kyivindependent.com/news-archive/rss/" },
  { name: "Times of Israel", country: "IL", url: "https://www.timesofisrael.com/feed/" },
  { name: "Anadolu", country: "TR", url: "https://www.aa.com.tr/en/rss/default?cat=world" },
  { name: "South China Morning Post", country: "HK", url: "https://www.scmp.com/rss/91/feed" },
  { name: "CGTN", country: "CN", url: "https://www.cgtn.com/subscribe/rss/section/world.xml" },
  { name: "Times of India", country: "IN", url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms" },
  { name: "Japan Times", country: "JP", url: "https://www.japantimes.co.jp/feed/" },
  { name: "ABC Australia", country: "AU", url: "https://www.abc.net.au/news/feed/52278/rss.xml" },
  { name: "El Tiempo", country: "CO", url: "https://www.eltiempo.com/rss/mundo.xml" },
  { name: "Infobae", country: "AR", url: "https://www.infobae.com/arc/outboundfeeds/rss/" },
  { name: "Folha de S.Paulo", country: "BR", url: "https://feeds.folha.uol.com.br/mundo/rss091.xml" },
];

function tag(block: string, name: string) {
  const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(block)?.[1] ?? "";
  return m.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function probeFeed(f: (typeof FEEDS)[number]) {
  try {
    const res = await fetch(f.url, { headers: UA, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    const items = [...text.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/g)].map((m) => m[0]);
    const first = items[0] ?? "";
    const desc = tag(first, "description") || tag(first, "summary") || tag(first, "content:encoded");
    return {
      ...f,
      status: res.status,
      items: items.length,
      firstTitle: tag(first, "title").slice(0, 120),
      firstDate: tag(first, "pubDate") || tag(first, "dc:date") || tag(first, "updated") || tag(first, "published"),
      descriptionChars: desc.length,
      descriptionSample: desc.slice(0, 160),
    };
  } catch (e) {
    return { ...f, error: String(e) };
  }
}

async function probeGdeltApi() {
  const url =
    "https://api.gdeltproject.org/api/v2/doc/doc?query=theme:ARMEDCONFLICT&mode=ArtList&maxrecords=50&format=json&timespan=1d";
  const attempts: string[] = [];
  for (const wait of [0, 12000, 20000]) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(url, { headers: UA, cache: "no-store" });
      const text = await res.text();
      if (res.ok && text.trim().startsWith("{")) {
        const n = (JSON.parse(text) as { articles?: unknown[] }).articles?.length ?? 0;
        attempts.push(`OK tras esperar ${wait / 1000}s: ${n} artículos`);
        return { ok: true, attempts };
      }
      attempts.push(`${res.status} tras esperar ${wait / 1000}s`);
    } catch (e) {
      attempts.push(String(e));
    }
  }
  return { ok: false, attempts };
}

async function probeGdeltFiles() {
  const out: Record<string, unknown> = {};
  try {
    const res = await fetch("http://data.gdeltproject.org/gdeltv2/lastupdate.txt", { headers: UA, cache: "no-store" });
    const text = await res.text();
    out.lastupdate = { status: res.status, body: text.slice(0, 600) };
    const gkg = /\S+gkg\.csv\.zip/.exec(text)?.[0];
    if (gkg) {
      const head = await fetch(gkg, { method: "HEAD", headers: UA, cache: "no-store" });
      out.gkgFile = { url: gkg, status: head.status, bytes: head.headers.get("content-length") };
    }
  } catch (e) {
    out.lastupdate = { error: String(e) };
  }
  try {
    const res = await fetch(
      "http://data.gdeltproject.org/blog/2018-news-outlets-by-country-may2018-update/MASTER-GDELTDOMAINSBYCOUNTRY-MAY2018.TXT",
      { headers: UA, cache: "no-store" },
    );
    const text = await res.text();
    out.domainsByCountry = { status: res.status, lines: text.split("\n").length, head: text.slice(0, 300) };
  } catch (e) {
    out.domainsByCountry = { error: String(e) };
  }
  return out;
}

export async function GET() {
  await connection();
  const [feeds, files, api] = await Promise.all([Promise.all(FEEDS.map(probeFeed)), probeGdeltFiles(), probeGdeltApi()]);
  return Response.json({
    resumen: {
      feedsOk: feeds.filter((f) => "items" in f && (f.items ?? 0) > 0).map((f) => f.name),
      feedsMal: feeds.filter((f) => !("items" in f) || !f.items).map((f) => f.name),
      gdeltApi: api.ok,
    },
    gdeltApi: api,
    gdeltFiles: files,
    feeds,
  });
}
