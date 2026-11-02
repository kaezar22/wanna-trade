"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lesson } from "@/lib/learn/lessons";
import { isComplete, updateProgress, useProgress } from "@/lib/learn/progress";
import { cn } from "@/lib/utils";

export function Quiz({ lesson }: { lesson: Lesson }) {
  const [answers, setAnswers] = useState<(number | null)[]>(lesson.quiz.map(() => null));
  const done = answers.every((a) => a !== null);
  const score = answers.filter((a, i) => a === lesson.quiz[i].answer).length;

  return (
    <section aria-labelledby="quiz" className="space-y-6">
      <h2 id="quiz" className="display text-xl font-bold">
        Comprueba lo que aprendiste
      </h2>
      <ol className="space-y-6">
        {lesson.quiz.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={q.q}>
              <fieldset>
                <legend className="font-medium">
                  {qi + 1}. {q.q}
                </legend>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => {
                    const isChosen = chosen === oi;
                    const isRight = oi === q.answer;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={chosen !== null}
                        onClick={() => {
                          const next = answers.map((a, i) => (i === qi ? oi : a));
                          setAnswers(next);
                          if (next.every((a) => a !== null)) {
                            updateProgress(lesson.slug, {
                              quizBest: next.filter((a, i) => a === lesson.quiz[i].answer).length,
                              quizTotal: lesson.quiz.length,
                            });
                          }
                        }}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          chosen === null && "border-grid hover:border-ink-soft",
                          chosen !== null && isRight && "border-up bg-up/10",
                          chosen !== null && isChosen && !isRight && "border-down bg-down/10",
                          chosen !== null && !isChosen && !isRight && "border-grid opacity-60",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && (
                  <p role="status" className="mt-2 text-sm">
                    <span className={cn("font-semibold", chosen === q.answer ? "text-up" : "text-down")}>
                      {chosen === q.answer ? "Correcto." : "No exactamente."}
                    </span>{" "}
                    <span className="text-ink-soft">{q.why}</span>
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-semibold">
            {score} de {lesson.quiz.length} correctas.
          </p>
          <button
            type="button"
            onClick={() => setAnswers(lesson.quiz.map(() => null))}
            className="text-sm text-cobalt underline-offset-4 hover:underline"
          >
            Volver a intentar
          </button>
        </div>
      )}
    </section>
  );
}

export function Mission({ lesson }: { lesson: Lesson }) {
  const progress = useProgress();
  const p = progress?.[lesson.slug];
  return (
    <section aria-labelledby="mission" className="rounded-lg border border-cobalt/40 bg-paper-raised p-5">
      <p className="text-sm font-semibold text-cobalt">Misión</p>
      <h2 id="mission" className="display mt-1 text-xl font-bold">
        {lesson.mission.title}
      </h2>
      <p className="mt-2 leading-relaxed">{lesson.mission.text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link href={lesson.mission.href} className="rounded-md bg-cobalt px-4 py-2 font-medium text-white hover:opacity-90">
          {lesson.mission.cta}
        </Link>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(p?.missionDone)}
            onChange={(e) => updateProgress(lesson.slug, { missionDone: e.target.checked })}
            className="h-4 w-4 accent-[var(--cobalt)]"
          />
          La hice
        </label>
      </div>
      {isComplete(p) && <p className="mt-3 text-sm text-up">Lección completada.</p>}
    </section>
  );
}
