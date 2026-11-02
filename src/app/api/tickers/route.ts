import type { NextRequest } from "next/server";
import { findTickers } from "@/lib/llm/tickers";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// GET /api/tickers?q=10 empresas de energía renovable
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3 || q.length > 300) {
    return Response.json(
      { error: "Describe qué buscas en 3 a 300 caracteres." },
      { status: 400 },
    );
  }

  const limit = rateLimit(request, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const result = await findTickers(q);
  return result.ok ? Response.json(result) : Response.json({ error: result.message }, { status: 502 });
}
