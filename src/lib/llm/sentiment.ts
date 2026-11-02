import "server-only";

import { cacheLife } from "next/cache";
import { chat } from "../deepseek";
import { fetchHeadlines, NewsError, type Headline } from "../news";
import { parseSentiment, type SentimentAnalysis } from "./parse";

export type NewsSentiment =
  | { ok: true; query: string; headlines: Headline[]; analysis: SentimentAnalysis }
  | { ok: false; message: string };

const SYSTEM = `Eres un analista financiero que resume noticias para un inversionista que está aprendiendo.
Respondes siempre en español y solo con un objeto JSON válido.
Usa únicamente la información de los titulares que te den. No agregues hechos que sepas por otra vía,
en especial nada de lo que haya pasado después de la fecha de los titulares.`;

function buildPrompt(query: string, headlines: Headline[]) {
  const list = headlines
    .map((h, i) => `${i + 1}. [${h.publishedAt.slice(0, 10)}${h.source ? `, ${h.source}` : ""}] ${h.title}`)
    .join("\n");
  return `Titulares recientes sobre "${query}":

${list}

Devuelve un JSON con esta forma exacta:
{
  "overall": "alcista" | "bajista" | "volatil" | "neutral",
  "score": número entre -1 (muy negativo) y 1 (muy positivo),
  "summary": "2 a 4 frases en español: qué está pasando y por qué importa para el precio",
  "themes": ["hasta 5 temas cortos"],
  "items": ["positivo" | "negativo" | "neutral", uno por titular, en el mismo orden]
}

Criterio para "overall": alcista si predominan noticias positivas para el precio, bajista si predominan
las negativas, volatil si hay mezcla fuerte de ambas con incertidumbre, neutral si no hay una tendencia clara.`;
}

/** Titulares recientes y su análisis de sentimiento. Se guarda una hora por consulta. */
export async function analyzeNews(query: string): Promise<NewsSentiment> {
  "use cache";

  let result: NewsSentiment;
  try {
    const headlines = (await fetchHeadlines(query, 20)).slice(0, 20);
    if (headlines.length === 0) {
      result = { ok: false, message: `No se encontraron noticias recientes sobre "${query}".` };
    } else {
      const raw = await chat(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(query, headlines) },
        ],
        { json: true, temperature: 0.2, maxTokens: 900 },
      );
      const analysis = parseSentiment(raw, headlines.length);
      result = analysis
        ? { ok: true, query, headlines, analysis }
        : { ok: false, message: "DeepSeek respondió en un formato inesperado. Intenta de nuevo." };
    }
  } catch (e) {
    const message =
      e instanceof NewsError || e instanceof Error ? e.message : "Error desconocido al analizar.";
    result = { ok: false, message };
  }

  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}
