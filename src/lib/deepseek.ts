import "server-only";

// Cliente mínimo de DeepSeek (API compatible con OpenAI).
// Solo se puede importar desde código de servidor: la clave nunca llega al navegador.

const BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Pide al modelo que responda con un objeto JSON válido. */
  json?: boolean;
};

export function hasDeepSeekKey() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function chat(messages: ChatMessage[], options: ChatOptions = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta DEEPSEEK_API_KEY. Agrégala en .env.local o en las variables de entorno de Vercel.",
    );
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 800,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek respondió ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message.content.trim() ?? "";
}
