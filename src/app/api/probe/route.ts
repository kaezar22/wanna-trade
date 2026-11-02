import { connection } from "next/server";

// Ruta temporal (fase 6): descubre las series del Banco de la República en su
// API SDMX y confirma que FRED responde desde Vercel. Se borra al terminar.

const UA = "Mozilla/5.0 (compatible; wanna-trade)";

async function get(url: string, accept = "*/*") {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept }, cache: "no-store" });
    const text = await res.text();
    return { url, status: res.status, ms: Date.now() - start, length: text.length, text };
  } catch (e) {
    return { url, status: 0, ms: Date.now() - start, length: 0, text: "", error: String(e) };
  }
}

export async function GET() {
  await connection();

  const [flows, fred] = await Promise.all([
    get("https://totoro.banrep.gov.co/nsi-jax-ws/rest/dataflow/all/all/latest", "application/xml"),
    get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS"),
  ]);

  // Extrae id y nombre (en español si hay) de cada dataflow del XML SDMX.
  const dataflows = [...flows.text.matchAll(/<str:Dataflow[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/str:Dataflow>/g)].map(
    (m) => {
      const es = /<com:Name[^>]*xml:lang="es"[^>]*>([^<]+)</.exec(m[2])?.[1];
      const any = /<com:Name[^>]*>([^<]+)</.exec(m[2])?.[1];
      return `${m[1]}: ${es ?? any ?? ""}`;
    },
  );

  return Response.json({
    region: process.env.VERCEL_REGION ?? "local",
    banrep: {
      status: flows.status,
      ms: flows.ms,
      error: "error" in flows ? flows.error : undefined,
      count: dataflows.length,
      dataflows,
      sample: dataflows.length ? undefined : flows.text.slice(0, 600),
    },
    fred: { status: fred.status, ms: fred.ms, head: fred.text.slice(0, 120), tail: fred.text.slice(-60) },
  });
}
