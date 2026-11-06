import { describe, expect, it } from "vitest";
import { flag, isCountryCode, parseClassification } from "./classify";
import { looksGeopolitical } from "./outlets";
import { cleanText, decodeBody, detectCharset, parseFeed } from "./rss";

describe("RSS", () => {
  it("lee RSS 2.0 con CDATA y HTML escapado", () => {
    const xml = `<rss><channel><title>Canal</title>
      <item><title><![CDATA[Tariffs &amp; trade]]></title><link>https://a.com/1</link>
        <pubDate>Fri, 06 Nov 2026 16:23:16 GMT</pubDate>
        <description>&lt;p&gt;Leaders met &lt;a href="x"&gt;today&lt;/a&gt;.&lt;/p&gt;</description></item>
      <item><title>Sin fecha</title><link>https://a.com/2</link></item>
    </channel></rss>`;
    expect(parseFeed(xml)).toEqual([
      { title: "Tariffs & trade", url: "https://a.com/1", date: "2026-11-06T16:23:16.000Z", description: "Leaders met today." },
    ]);
  });

  it("lee Atom y RDF con zona horaria", () => {
    const atom = `<feed><entry><title>Summit</title><link rel="alternate" href="https://b.com/x?a=1&amp;b=2"/>
      <updated>2026-11-06T14:37:00-05:00</updated><summary>Texto</summary></entry></feed>`;
    expect(parseFeed(atom)[0]).toMatchObject({ url: "https://b.com/x?a=1&b=2", date: "2026-11-06T19:37:00.000Z" });
    const rdf = `<rdf:RDF><item rdf:about="https://c.com"><title>T</title><link>https://c.com/1</link><dc:date>2026-11-06T14:37:00Z</dc:date></item></rdf:RDF>`;
    expect(parseFeed(rdf)[0].url).toBe("https://c.com/1");
  });

  it("respeta la codificación declarada (tildes en ISO-8859-1)", () => {
    const bytes = new Uint8Array([...'<?xml version="1.0" encoding="ISO-8859-1"?><t>'].map((c) => c.charCodeAt(0)).concat([0x41, 0x70, 0xf3, 0x73]));
    expect(detectCharset(null, '<?xml version="1.0" encoding="ISO-8859-1"?>')).toBe("iso-8859-1");
    expect(decodeBody(bytes.buffer, "text/xml")).toContain("Após");
  });

  it("limpia entidades numéricas", () => {
    expect(cleanText("Kyiv&#8217;s &#x201C;plan&#x201D;")).toBe("Kyiv’s “plan”");
  });
});

describe("clasificación", () => {
  it("valida taxonomía, índices y países; descarta lo no geopolítico", () => {
    const raw = JSON.stringify({
      items: [
        { i: 0, geo: true, summary: "Resumen", people: ["Donald Trump", "Donald Trump", 5], countries: ["us", "CN", "XX", "EU"], topic: "Comercio", subtopic: "Aranceles", tone: "Negativo", risk: "aumenta" },
        { i: 1, geo: false },
        { i: 2, geo: true, summary: "Otro", topic: "deportes", tone: "positivo", risk: "baja" },
        { i: 3, geo: true, summary: "Energía", topic: "energia", tone: "raro", risk: "baja", countries: [] },
        { i: 9, geo: true, summary: "Fuera de rango", topic: "conflicto" },
        { i: 0, geo: true, summary: "Duplicado", topic: "conflicto" },
      ],
    });
    const r = parseClassification(raw, 4);
    expect(r.map((x) => x.i)).toEqual([0, 3]);
    expect(r[0]).toMatchObject({ people: ["Donald Trump"], countries: ["US", "CN", "EU"], topic: "comercio", tone: "negativo", risk: "aumenta" });
    expect(r[1]).toMatchObject({ tone: "neutral", risk: "neutral" });
    expect(parseClassification("no json", 3)).toEqual([]);
  });

  it("códigos de país y banderas", () => {
    expect(isCountryCode("CO")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
    expect(flag("co")).toBe("🇨🇴");
  });

  it("filtro de feeds mezclados", () => {
    expect(looksGeopolitical("Putin and Xi meet in Beijing")).toBe(true);
    expect(looksGeopolitical("Aranceles de EE. UU. golpean a México")).toBe(true);
    expect(looksGeopolitical("4 opciones naturales para perfumar la casa")).toBe(false);
  });
});
