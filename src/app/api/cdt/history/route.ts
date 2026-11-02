import type { NextRequest } from "next/server";
import { isISODate } from "@/lib/market/as-of";
import { CDT_DATA_START, getCdtHistory } from "@/lib/rates/cdt";
import { isCdtTermKey } from "@/lib/rates/cdt-math";

// GET /api/cdt/history?plazo=90&desde=2021-01-01&hasta=2026-10-31
// Tasa promedio ponderada por mes para un plazo.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const plazo = p.get("plazo") ?? "90";
  if (!isCdtTermKey(plazo)) {
    return Response.json({ error: `Plazo no válido: ${plazo}` }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const desde = p.get("desde") ?? CDT_DATA_START;
  const hasta = p.get("hasta") ?? today;
  if (!isISODate(desde) || !isISODate(hasta) || desde > hasta) {
    return Response.json({ error: "Fechas no válidas (AAAA-MM-DD)." }, { status: 400 });
  }

  const result = await getCdtHistory(plazo, desde < CDT_DATA_START ? CDT_DATA_START : desde, hasta);
  return result.ok
    ? Response.json(result.data)
    : Response.json({ error: result.message }, { status: 502 });
}
