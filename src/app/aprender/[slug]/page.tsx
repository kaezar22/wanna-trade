import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonBody } from "@/components/learn/lesson-body";
import { Mission, Quiz } from "@/components/learn/quiz";
import { Tutor } from "@/components/learn/tutor";
import { LESSONS, getLesson } from "@/lib/learn/lessons";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/aprender/[slug]">): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return lesson ? { title: lesson.title, description: lesson.summary } : {};
}

export default async function Page({ params }: PageProps<"/aprender/[slug]">) {
  const lesson = getLesson((await params).slug);
  if (!lesson) notFound();

  const i = LESSONS.indexOf(lesson);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Ruta" className="text-sm">
        <Link href="/aprender" className="text-cobalt underline-offset-4 hover:underline">
          Aprender
        </Link>
        <span className="text-ink-soft"> / Nivel {lesson.level}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0 max-w-[68ch] space-y-12">
          <header>
            <h1 className="display text-4xl font-extrabold leading-tight sm:text-5xl">{lesson.title}</h1>
            <p className="mt-3 text-lg text-ink-soft">{lesson.summary}</p>
            <p className="mt-2 text-sm text-ink-soft">Nivel {lesson.level} de {LESSONS.length}, {lesson.minutes} minutos</p>
          </header>

          <LessonBody blocks={lesson.blocks} />
          <Quiz lesson={lesson} />
          <Mission lesson={lesson} />

          <nav aria-label="Lecciones" className="flex flex-wrap justify-between gap-4 border-t border-grid pt-6">
            {prev ? (
              <Link href={`/aprender/${prev.slug}`} className="text-cobalt underline-offset-4 hover:underline">
                Anterior: {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/aprender/${next.slug}`} className="font-medium text-cobalt underline-offset-4 hover:underline">
                Siguiente: {next.title}
              </Link>
            )}
          </nav>
        </article>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <Tutor slug={lesson.slug} prompts={lesson.prompts} />
        </aside>
      </div>
    </div>
  );
}
