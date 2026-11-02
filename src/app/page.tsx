import Link from "next/link";
import { CutoffDemo } from "@/components/cutoff-demo";
import { sections } from "@/lib/sections";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="display max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">
        Mira el mercado como estaba ese día.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-soft">
        Analiza con los datos de hoy, o vuelve dos años atrás y decide sin
        saber qué pasó después. Las mismas herramientas sirven para los dos.
      </p>

      <div className="mt-10">
        <CutoffDemo />
      </div>

      <ul className="mt-14 divide-y divide-grid border-y border-grid">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="group grid gap-1 py-5 sm:grid-cols-[12rem_1fr_auto] sm:items-baseline sm:gap-6"
            >
              <span className="display text-2xl font-bold group-hover:text-cobalt">
                {s.name}
              </span>
              <span className="text-ink-soft">{s.summary}</span>
              <span className="text-sm text-ink-soft">{s.phase}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
