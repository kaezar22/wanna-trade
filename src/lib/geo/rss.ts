// Lectura de RSS 2.0, RSS 1.0 (RDF) y Atom. Funciones puras para poder probarlas.

export type FeedItem = {
  title: string;
  url: string;
  /** ISO 8601 en UTC. */
  date: string;
  description: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Texto plano: sin CDATA, sin etiquetas HTML (también las escapadas) y con espacios normalizados. */
export function cleanText(raw: string): string {
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Las descripciones suelen traer HTML escapado (&lt;p&gt;): se decodifica y luego se quitan las etiquetas.
  s = decodeEntities(s);
  s = s.replace(/<[^>]*>/g, " ");
  s = decodeEntities(s);
  return s.replace(/\s+/g, " ").replace(/ ([.,;:!?])/g, "$1").trim();
}

function field(block: string, names: string[]): string {
  for (const name of names) {
    const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
    if (m && m[1].trim()) return m[1];
  }
  return "";
}

function link(block: string): string {
  const text = cleanText(field(block, ["link"]));
  if (/^https?:\/\//.test(text)) return text;
  // Atom: <link rel="alternate" href="…"/>
  const tags = [...block.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const alt = tags.find((t) => /rel="alternate"/.test(t)) ?? tags.find((t) => !/rel=/.test(t)) ?? tags[0];
  const href = alt && /href="([^"]+)"/.exec(alt)?.[1];
  if (href) return decodeEntities(href);
  const guid = cleanText(field(block, ["guid"]));
  return /^https?:\/\//.test(guid) ? guid : "";
}

function parseDate(raw: string): string | null {
  const s = cleanText(raw);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function parseFeed(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  for (const m of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const block = m[2];
    const title = cleanText(field(block, ["title"]));
    const url = link(block);
    const date = parseDate(field(block, ["pubDate", "dc:date", "published", "updated"]));
    if (!title || !url || !date) continue;
    out.push({
      title,
      url,
      date,
      description: cleanText(field(block, ["description", "summary", "content:encoded", "content"])),
    });
  }
  return out;
}

/** Codificación declarada en la cabecera HTTP o en el prólogo XML (por defecto UTF-8). */
export function detectCharset(contentType: string | null, head: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? "")?.[1];
  const fromXml = /<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(head)?.[1];
  return (fromHeader ?? fromXml ?? "utf-8").toLowerCase();
}

export function decodeBody(bytes: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 200));
  const charset = detectCharset(contentType, head);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
