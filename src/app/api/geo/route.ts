import { connection } from "next/server";
import { getGeoNews } from "@/lib/geo/news";

export const maxDuration = 90;

// GET /api/geo — la misma tabla enriquecida de /analizar/geopolitica en JSON.
// Se recalcula como mucho una vez por hora, así que no necesita límite por IP.
export async function GET() {
  await connection(); // se arma al pedirla, no en el build
  const result = await getGeoNews();
  return result.ok ? Response.json(result) : Response.json({ error: result.message }, { status: 502 });
}
