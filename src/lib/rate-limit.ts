import "server-only";

// Límite simple de peticiones por IP, en memoria de cada instancia del
// servidor. No es infalible (Vercel puede tener varias instancias), pero
// evita que alguien gaste la clave de DeepSeek con un script trivial.

const hits = new Map<string, number[]>();

export function rateLimit(
  request: Request,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfter: number } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // no crecer sin límite
  return { ok: true };
}

export function tooManyRequests(retryAfter: number) {
  return Response.json(
    {
      error: `Hiciste muchas consultas seguidas. Intenta de nuevo en ${Math.ceil(retryAfter / 60)} minuto(s).`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
