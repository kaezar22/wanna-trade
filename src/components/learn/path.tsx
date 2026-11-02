"use client";

import Link from "next/link";
import { LESSONS } from "@/lib/learn/lessons";
import { isComplete, useProgress } from "@/lib/learn/progress";
import { cn } from "@/lib/utils";

export function LearningPath() {
  const progress = useProgress();
  const doneCount = LESSONS.filter((l) => isComplete(progress?.[l.slug])).length;
  const nextLesson = LESSONS.find((l) => !isComplete(progress?.[l.slug])) ?? LESSONS[0];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="display text-4xl font-extrabold sm:text-5xl">Aprender</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Siete niveles, de qué es invertir hasta cómo no sabotearte. Cada uno termina con un quiz
            y una misión en el analizador o el simulador.
          </p>
        </div>
        {progress && (
          <div className="text-right">
            <p className="text-sm text-ink-soft">Completadas</p>
            <p className="text-2xl font-semibold">
              {doneCount} de {LESSONS.length}
            </p>
            <Link href={`/aprender/${nextLesson.slug}`} className="text-sm text-cobalt underline-offset-4 hover:underline">
              {doneCount === 0 ? "Empezar" : doneCount === LESSONS.length ? "Repasar" : "Seguir"} con {nextLesson.title}
            </Link>
          </div>
        )}
      </div>

      <ol className="relative space-y-0 border-l-2 border-grid pl-8">
        {LESSONS.map((l) => {
          const p = progress?.[l.slug];
          const done = isComplete(p);
          const started = p && !done;
          return (
            <li key={l.slug} className="relative pb-8 last:pb-0">
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[2.6rem] top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                  done ? "border-up bg-up text-paper" : started ? "border-cobalt bg-paper text-cobalt" : "border-grid bg-paper text-ink-soft",
                )}
              >
                {done ? "✓" : l.level}
              </span>
              <Link href={`/aprender/${l.slug}`} className="group block max-w-2xl">
                <span className="display text-xl font-bold group-hover:text-cobalt">{l.title}</span>
                <span className="mt-1 block text-ink-soft">{l.summary}</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  {l.minutes} minutos
                  {p?.quizBest !== undefined && `, quiz ${p.quizBest} de ${p.quizTotal}`}
                  {p?.missionDone && ", misión hecha"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-ink-soft">
        Tu progreso se guarda en este navegador.
      </p>
    </div>
  );
}
