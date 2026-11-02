import { connection } from "next/server";
import { hasDeepSeekKey } from "@/lib/deepseek";

// Verifica que la app está desplegada y qué claves están configuradas.
// Nunca devuelve el valor de las claves, solo si existen.
export async function GET() {
  await connection(); // se evalúa en cada petición, no en el build

  return Response.json({
    ok: true,
    deepseek: hasDeepSeekKey(),
    newsapi: Boolean(process.env.NEWS_API_KEY),
    time: new Date().toISOString(),
  });
}
