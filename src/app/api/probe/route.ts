import { connection } from "next/server";

// Ruta temporal (fase 6, segunda prueba): muestra cómo responde la API SDMX
// del Banco de la República y busca la serie del IPC en datos.gov.co.

async function sample(url: string, accept: string) {
  try {
    const res = await fetch(url, { headers: { Accept: accept, "User-Agent": "wanna-trade" }, cache: "no-store" });
    const text = await res.text();
    return { accept, status: res.status, type: res.headers.get("content-type"), length: text.length, head: text.slice(0, 700) };
  } catch (e) {
    return { accept, error: String(e) };
  }
}

export async function GET() {
  await connection();
  const url = "https://totoro.banrep.gov.co/nsi-jax-ws/rest/data/DF_CBR_MONTHLY_HIST/all/all?startPeriod=2025-01";

  const [json, xml, catalog] = await Promise.all([
    sample(url, "application/vnd.sdmx.data+json;version=1.0.0"),
    sample(url, "application/xml"),
    fetch("https://api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=IPC%20indice%20precios%20consumidor&limit=12", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { results?: { resource: Record<string, unknown> }[] }) =>
        (d.results ?? []).map((r) => `${r.resource.id}: ${r.resource.name} (${r.resource.attribution ?? "?"}, ${String(r.resource.data_updated_at ?? "").slice(0, 10)})`),
      )
      .catch((e) => [String(e)]),
  ]);

  return Response.json({ banrepJson: json, banrepXml: xml, ipcDatasets: catalog });
}
