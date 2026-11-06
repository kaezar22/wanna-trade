// Medios internacionales con su país. El país lo fijamos nosotros (no lo
// adivina el modelo). `ownership` distingue los medios públicos con
// independencia editorial (BBC, DW…) de los controlados por un Estado (TASS,
// CGTN…): ayuda a leer el tono. `mixed` = el feed trae de todo: se filtra antes por
// palabras clave para no gastar el cupo del medio en noticias locales.

export type Outlet = {
  id: string;
  name: string;
  /** ISO 3166-1 alfa-2 del país del medio. */
  country: string;
  ownership?: "publico" | "estatal";
  mixed?: boolean;
  url: string;
};

export const OUTLETS: Outlet[] = [
  { id: "bbc", name: "BBC", country: "GB", ownership: "publico", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "guardian", name: "The Guardian", country: "GB", url: "https://www.theguardian.com/world/rss" },
  { id: "nyt", name: "The New York Times", country: "US", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "cbc", name: "CBC", country: "CA", ownership: "publico", url: "https://www.cbc.ca/webfeed/rss/rss-world" },
  { id: "dw", name: "DW", country: "DE", ownership: "publico", url: "https://rss.dw.com/rdf/rss-en-world" },
  { id: "france24", name: "France 24", country: "FR", ownership: "publico", url: "https://www.france24.com/en/rss" },
  { id: "elpais", name: "El País", country: "ES", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada" },
  { id: "kyiv", name: "Kyiv Independent", country: "UA", url: "https://kyivindependent.com/news-archive/rss/" },
  { id: "tass", name: "TASS", country: "RU", ownership: "estatal", url: "https://tass.com/rss/v2.xml" },
  { id: "jpost", name: "The Jerusalem Post", country: "IL", url: "https://www.jpost.com/Rss/RssFeedsInternational" },
  { id: "aljazeera", name: "Al Jazeera", country: "QA", ownership: "estatal", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { id: "anadolu", name: "Anadolu", country: "TR", ownership: "estatal", url: "https://www.aa.com.tr/en/rss/default?cat=world" },
  { id: "scmp", name: "South China Morning Post", country: "HK", url: "https://www.scmp.com/rss/91/feed" },
  { id: "cgtn", name: "CGTN", country: "CN", ownership: "estatal", url: "https://www.cgtn.com/subscribe/rss/section/world.xml" },
  { id: "toi", name: "The Times of India", country: "IN", mixed: true, url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms" },
  { id: "japantimes", name: "The Japan Times", country: "JP", mixed: true, url: "https://www.japantimes.co.jp/feed/" },
  { id: "eltiempo", name: "El Tiempo", country: "CO", url: "https://www.eltiempo.com/rss/mundo.xml" },
  { id: "infobae", name: "Infobae", country: "AR", mixed: true, url: "https://www.infobae.com/arc/outboundfeeds/rss/" },
  { id: "folha", name: "Folha de S.Paulo", country: "BR", url: "https://feeds.folha.uol.com.br/mundo/rss091.xml" },
];

// Palabras que suelen aparecer en noticias internacionales (inglés, español,
// portugués). Solo se usan para los feeds `mixed`.
const GEO_WORDS =
  /\b(war|guerra|military|militar|missile|misil|troops|tropas|ceasefire|alto el fuego|sanction|sanci|tariff|arancel|tarifa|trade|comercio|summit|cumbre|diplomat|minister|ministro|president|presidente|election|elecci|elei|nato|otan|un\b|onu|china|russia|rusia|ukrain|ucrania|iran|israel|gaza|taiwan|korea|corea|trump|putin|xi\b|modi|opec|opep|oil|petr[oó]leo|g7|g20|brics|eu\b|ue\b|europe|europa|border|frontera|nuclear|treaty|tratado|refugee|migra)/i;

export function looksGeopolitical(text: string) {
  return GEO_WORDS.test(text);
}
