import type { NextRequest } from "next/server";
import { analyzeNews } from "@/lib/llm/sentiment";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// GET /api/sentiment?q=Apple
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) {
    return Response.json(
      { error: "Escribe el nombre de una empresa o tema (entre 2 y 80 caracteres)." },
      { status: 400 },
    );
  }

  const limit = rateLimit(request, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const result = await analyzeNews(q);
  return result.ok ? Response.json(result) : Response.json({ error: result.message }, { status: 502 });
}
