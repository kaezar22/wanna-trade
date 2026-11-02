import Link from "next/link";

type Props = {
  title: string;
  intro: string;
  phase: string;
  items: string[];
};

// Página provisional para secciones que aún no están construidas.
export function ComingSoon({ title, intro, phase, items }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-ink-soft">{intro}</p>

      <section className="mt-10 rounded-lg border border-grid bg-paper-raised p-5 sm:p-6">
        <h2 className="font-semibold">Llega en la {phase}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <Link href="/" className="mt-8 inline-block text-cobalt underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  );
}
