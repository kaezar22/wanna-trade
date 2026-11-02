import "server-only";

import { cacheLife } from "next/cache";
import { chat } from "../deepseek";
import { addDays } from "../market/as-of";
import { getPriceSeries } from "../market/prices";
import { parseTickers } from "./parse";

export type TickerResult = {
  symbol: string;
  name: string;
  reason: string;
  /** true si Yahoo Finance tiene precios recientes para el símbolo. */
  valid: boolean;
  currency: string | null;
  exchange: string | null;
  type: string | null;
  lastClose: number | null;
};

export type TickerSearch =
  | { ok: true; query: string; results: TickerResult[] }
  | { ok: false; message: string };

const SYSTEM = `Eres un asistente de mercados financieros. Respondes solo con un objeto JSON válido.
Los símbolos deben estar en el formato de Yahoo Finance: acciones de EE. UU. sin sufijo (AAPL),
Bolsa de Colombia con .CL (ECOPETROL.CL, PFBCOLOM.CL, ICOLCAP.CL), Londres .L, Toronto .TO,
São Paulo .SA, México .MX, divisas como USDCOP=X y criptomonedas como BTC-USD.
No inventes símbolos: si no estás seguro de que exista, no lo incluyas.`;

function buildPrompt(query: string) {
  return `Pedido del usuario: ${query}

Devuelve un JSON con esta forma:
{ "tickers": [ { "symbol": "SÍMBOLO", "name": "Nombre de la empresa o fondo", "reason": "una frase en español de por qué encaja" } ] }

Máximo 15 resultados. Si el usuario pide un número, respeta ese número.`;
}

/** Sugiere símbolos con DeepSeek y verifica cada uno contra Yahoo Finance. */
export async function findTickers(query: string): Promise<TickerSearch> {
  "use cache";

  let result: TickerSearch;
  try {
    const raw = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(query) },
      ],
      { json: true, temperature: 0.2, maxTokens: 1200 },
    );
    const suggestions = parseTickers(raw);
    if (suggestions.length === 0) {
      result = { ok: false, message: "DeepSeek no devolvió símbolos. Prueba a describir el pedido de otra forma." };
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const start = addDays(today, -14);
      const checks = await Promise.allSettled(
        suggestions.map((s) => getPriceSeries({ symbol: s.symbol, interval: "1d", start, asOf: null })),
      );
      const results = suggestions.map((s, i): TickerResult => {
        const c = checks[i];
        if (c.status === "fulfilled") {
          const m = c.value.meta;
          return {
            ...s,
            name: m.name ?? s.name,
            valid: true,
            currency: m.currency,
            exchange: m.exchange,
            type: m.type,
            lastClose: c.value.bars.at(-1)?.close ?? null,
          };
        }
        return { ...s, valid: false, currency: null, exchange: null, type: null, lastClose: null };
      });
      result = { ok: true, query, results };
    }
  } catch (e) {
    result = { ok: false, message: e instanceof Error ? e.message : "Error desconocido." };
  }

  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}
