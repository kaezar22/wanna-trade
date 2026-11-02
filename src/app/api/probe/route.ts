import { connection } from "next/server";

// Ruta temporal (fase 3): prueba fuentes de tasas de CDT y datos de ETF desde
// Vercel. Se borra cuando elijamos las fuentes.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function probe(name: string, url: string, read: (res: Response) => Promise<unknown>) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    return { name, status: res.status, ms: Date.now() - start, result: await read(res) };
  } catch (e) {
    return { name, ms: Date.now() - start, error: String(e) };
  }
}

const json = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 400);
  }
};

export async function GET() {
  await connection();

  const results = await Promise.all([
    // 1. Datos abiertos: dataset de tasas de captación (metadatos y primeras filas)
    probe("datos.gov.co axk9-g2nh metadatos", "https://www.datos.gov.co/api/views/axk9-g2nh.json", async (res) => {
      const d = await json(res);
      if (typeof d !== "object" || d === null) return d;
      const v = d as Record<string, unknown>;
      return {
        name: v.name,
        attribution: v.attribution,
        description: String(v.description ?? "").slice(0, 500),
        rowsUpdatedAt: v.rowsUpdatedAt,
        columns: (v.columns as { fieldName: string; name: string }[] | undefined)?.map(
          (c) => `${c.fieldName} (${c.name})`,
        ),
      };
    }),
    probe(
      "datos.gov.co axk9-g2nh filas",
      "https://www.datos.gov.co/resource/axk9-g2nh.json?$limit=5&$order=:id DESC",
      json,
    ),
    // 2. Catálogo de datos abiertos: otros datasets de tasas de captación / CDT
    probe(
      "datos.gov.co catálogo",
      "https://api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=tasas%20captacion%20CDT&limit=15",
      async (res) => {
        const d = (await json(res)) as { results?: { resource: Record<string, unknown> }[] };
        return (d.results ?? []).map((r) => ({
          id: r.resource.id,
          name: r.resource.name,
          attribution: r.resource.attribution,
          updatedAt: r.resource.data_updated_at,
        }));
      },
    ),
    // 3. Superfinanciera: tasas pasivas por entidad (página JSF)
    probe(
      "superfinanciera tasas pasivas",
      "https://www.superfinanciera.gov.co/Superfinanciera-Tasas/faces/generic/passiveInterestRates.xhtml",
      async (res) => {
        const html = await res.text();
        const cells = [...html.matchAll(/<td[^>]*>([^<]{2,80})<\/td>/g)].map((m) => m[1].trim());
        return { length: html.length, hasCDT: html.includes("CDT"), sampleCells: cells.slice(0, 40) };
      },
    ),
    // 4. Yahoo: perfil de ETF (costo, holdings)
    probe(
      "yahoo quoteSummary SPY",
      "https://query2.finance.yahoo.com/v10/finance/quoteSummary/SPY?modules=fundProfile,topHoldings,summaryDetail",
      async (res) => JSON.stringify(await json(res)).slice(0, 800),
    ),
    // 5. Yahoo: búsqueda (sirve para nombres y tipo de instrumento)
    probe(
      "yahoo search ICOLCAP",
      "https://query2.finance.yahoo.com/v1/finance/search?q=ICOLCAP&quotesCount=5&newsCount=0",
      async (res) => JSON.stringify(await json(res)).slice(0, 800),
    ),
  ]);

  return Response.json({ region: process.env.VERCEL_REGION ?? "local", results });
}
