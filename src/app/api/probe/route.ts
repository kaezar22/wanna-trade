import { connection } from "next/server";

// Ruta temporal (fase 3, segunda prueba): estructura del dataset de tasas de
// captación de la Superfinanciera en datos.gov.co. Se borra al terminar.

const BASE = "https://www.datos.gov.co/resource";

async function soql(dataset: string, params: Record<string, string>) {
  const url = `${BASE}/${dataset}.json?${new URLSearchParams(params)}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 300);
    }
    return { status: res.status, ms: Date.now() - start, body };
  } catch (e) {
    return { error: String(e), ms: Date.now() - start };
  }
}

const CDT = "upper(nombre_unidad_de_captura) like '%CDT%'";

export async function GET() {
  await connection();

  const [range, units, dates] = await Promise.all([
    // Cobertura total
    soql("axk9-g2nh", {
      $select: "min(fechacorte) as desde, max(fechacorte) as hasta, count(*) as filas",
      $where: CDT,
    }),
    // Qué unidades de captura, subcuentas y plazos existen para CDT
    soql("axk9-g2nh", {
      $select: "uca, nombre_unidad_de_captura, subcuenta, descripcion, count(*) as n",
      $where: CDT,
      $group: "uca, nombre_unidad_de_captura, subcuenta, descripcion",
      $order: "uca, subcuenta",
      $limit: "80",
    }),
    // Frecuencia: últimas fechas de corte
    soql("axk9-g2nh", {
      $select: "fechacorte, count(*) as n",
      $where: CDT,
      $group: "fechacorte",
      $order: "fechacorte DESC",
      $limit: "12",
    }),
  ]);

  // Muestra del último corte: tasas a 90, 180 y 360 días por entidad
  const last =
    Array.isArray(dates.body) && dates.body[0]
      ? (dates.body[0] as { fechacorte: string }).fechacorte
      : null;
  const latest = last
    ? await soql("axk9-g2nh", {
        $select: "tipoentidad, nombreentidad, uca, subcuenta, descripcion, tasa, monto",
        $where: `${CDT} AND fechacorte = '${last}'`,
        $order: "subcuenta, tasa DESC",
        $limit: "120",
      })
    : null;

  // Otros datasets candidatos: columnas y una fila
  const others = await Promise.all(
    ["way6-tjb3", "inq8-ndez", "sqid-kdxm", "gtwv-4pxq"].map(async (id) => ({
      id,
      sample: await soql(id, { $limit: "2", $order: ":id DESC" }),
    })),
  );

  return Response.json({ range, units, dates, latestDate: last, latest, others });
}
