import { chat, type ChatMessage } from "@/lib/deepseek";
import { getLesson, lessonText } from "@/lib/learn/lessons";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const MAX_MESSAGES = 12;
const MAX_CHARS = 1000;

const SYSTEM = `Eres el tutor de wanna-trade, una app para aprender a invertir desde Colombia.
Hablas en español de Colombia, claro y cercano, como un buen profesor. Tu alumno está empezando.

Reglas:
- Responde en 150 palabras o menos, salvo que pidan más detalle. Usa ejemplos en pesos colombianos.
- Básate en la lección que te doy como contexto. Si la pregunta va más allá, responde con conocimiento
  general de finanzas, sin inventar cifras actuales (tasas, precios, inflación): si hacen falta, di que
  las consulte en el analizador de la app.
- No des recomendaciones personalizadas de compra o venta ("compra X", "vende Y"). Si te las piden,
  explica qué criterios usar para decidir y recuerda que esto es educativo, no asesoría.
- Si la pregunta no tiene que ver con finanzas o inversión, redirige amablemente a la lección.
- Usa texto plano. Puedes usar listas cortas con guiones.`;

type Body = { lesson?: string; messages?: { role?: string; content?: string }[] };

// POST /api/tutor  { lesson: "fundamentos", messages: [{ role: "user", content: "..." }] }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const lesson = body?.lesson ? getLesson(body.lesson) : null;
  if (!lesson) return Response.json({ error: "Lección no encontrada." }, { status: 400 });

  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content!.slice(0, MAX_CHARS) }));
  if (messages.length === 0 || messages.at(-1)!.role !== "user") {
    return Response.json({ error: "Escribe una pregunta." }, { status: 400 });
  }

  const limit = rateLimit(request, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const context: ChatMessage = {
    role: "system",
    content: `Lección actual (nivel ${lesson.level}):\n\n${lessonText(lesson)}`,
  };

  try {
    const answer = await chat([{ role: "system", content: SYSTEM }, context, ...messages], {
      temperature: 0.4,
      maxTokens: 600,
    });
    return Response.json({ answer });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "El tutor no pudo responder." },
      { status: 502 },
    );
  }
}
