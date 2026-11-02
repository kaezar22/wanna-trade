"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function Tutor({ slug, prompts }: { slug: string; prompts: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setText("");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: slug, messages: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setMessages([...next, { role: "assistant", content: body.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "El tutor no pudo responder.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="tutor" className="flex flex-col rounded-lg border border-grid bg-paper-raised">
      <div className="border-b border-grid px-4 py-3">
        <h2 id="tutor" className="font-semibold">
          Pregúntale al tutor
        </h2>
        <p className="text-xs text-ink-soft">
          Responde con DeepSeek sobre esta lección. Es educativo, no asesoría de inversión.
        </p>
      </div>

      <div ref={listRef} className="max-h-[420px] min-h-[160px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">Prueba con:</p>
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => ask(p)}
                className="block w-full rounded-md border border-grid px-3 py-2 text-left text-sm hover:border-ink-soft"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "ml-auto bg-ink text-paper" : "bg-paper",
            )}
          >
            {m.content}
          </div>
        ))}
        {pending && <p className="text-sm text-ink-soft">Pensando…</p>}
        {error && (
          <p role="alert" className="text-sm text-down">
            {error}
          </p>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-grid p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label htmlFor={`tutor-${slug}`} className="sr-only">
          Tu pregunta
        </label>
        <input
          id={`tutor-${slug}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Escribe tu pregunta"
          className="min-w-0 flex-1 rounded-md border border-grid bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-md bg-cobalt px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Preguntar
        </button>
      </form>
    </section>
  );
}
