import type { NextRequest } from "next/server";
import { getCdtSnapshot } from "@/lib/rates/cdt";

// GET /api/cdt?fecha=2024-06-28 → tasas de CDT por entidad y plazo conocidas en esa fecha.
// Sin fecha: las más recientes.
export async function GET(request: NextRequest) {
  const fecha = request.nextUrl.searchParams.get("fecha") || null;
  const result = await getCdtSnapshot(fecha);
  return result.ok
    ? Response.json(result.data)
    : Response.json({ error: result.message }, { status: 502 });
}
