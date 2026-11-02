"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Headline } from "@/lib/news";
import type { Mood, SentimentAnalysis } from "@/lib/llm/parse";
import { cn } from "@/lib/utils";
import { useApi } from "../use-api";

type Data = { query: string; headlines: Headline[]; analysis: SentimentAnalysis };

const MOOD_LABEL: Record<Mood, string> = {
  alcista: "Alcista",
  bajista: "Bajista",
  volatil: "Volátil",
  neutral: "Neutral",
};

const MOOD_CLASS: Record<Mood, string> = {
  alcista: "text-up",
  bajista: "text-down",
  volatil: "text-cut",
  neutral: "text-ink-soft",
};

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function NewsSentiment() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q");
  const [text, setText] = useState(q ?? "");
  const { loading, data, error } = useApi<Data>(
    q ? `/api/sentiment?${new URLSearchParams({ q })}` : null,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-extrabold">Noticias y sentimiento</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Lee los titulares recientes de una empresa o tema y pide a DeepSeek que los resuma. Úsalo
          como contexto, no como señal de compra o venta.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) router.push(`${pathname}?${new URLSearchParams({ q: text.trim() })}`);
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Empresa o tema, en inglés para más resultados
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Apple, Nvidia, Ecopetrol…"
            maxLength={80}
            className="w-72 rounded-md border border-grid bg-paper-raised px-3 py-2 text-base text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Analizando…" : "Analizar noticias"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-4">
          {error}
        </p>
      )}

      {data && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="summary">
            <h2 id="summary" className="text-sm text-ink-soft">
              Sentimiento general sobre {data.query}
            </h2>
            <p className={cn("display mt-1 text-4xl font-extrabold", MOOD_CLASS[data.analysis.overall])}>
              {MOOD_LABEL[data.analysis.overall]}
            </p>
            <ScoreBar score={data.analysis.score} />
            <p className="mt-5 leading-relaxed">{data.analysis.summary}</p>
            {data.analysis.themes.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {data.analysis.themes.map((t) => (
                  <li key={t} className="rounded-full border border-grid px-3 py-1 text-sm text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-sm text-ink-soft">
              Basado en {data.headlines.length} titulares de NewsAPI. El plan gratuito solo cubre
              noticias del último mes.
            </p>
          </section>

          <section aria-labelledby="headlines">
            <h2 id="headlines" className="text-lg font-semibold">
              Titulares
            </h2>
            <ul className="mt-3 divide-y divide-grid border-y border-grid">
              {data.headlines.map((h, i) => {
                const mood = data.analysis.items[i];
                return (
                  <li key={h.url} className="flex gap-3 py-3">
                    <span
                      aria-label={`Sentimiento ${mood}`}
                      title={mood}
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        mood === "positivo" && "bg-up",
                        mood === "negativo" && "bg-down",
                        mood === "neutral" && "bg-grid",
                      )}
                    />
                    <div>
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-cobalt hover:underline"
                      >
                        {h.title}
                      </a>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {[h.source, dateFmt.format(new Date(h.publishedAt))].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  return (
    <div className="mt-4">
      <div
        className="relative h-2 rounded-full"
        style={{ background: "linear-gradient(90deg, var(--down), var(--grid), var(--up))" }}
        role="meter"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={score}
        aria-label="Puntaje de sentimiento"
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>Negativo</span>
        <span>Positivo</span>
      </div>
    </div>
  );
}
