import Link from "next/link";
import type { Block } from "@/lib/learn/lessons";
import { cn } from "@/lib/utils";
import { CandleWidget, CompoundWidget, DiversificationWidget } from "./widgets";

/** Texto con **negrita**. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-ink">{p}</strong> : p))}
    </>
  );
}

const WIDGETS = {
  compound: CompoundWidget,
  candle: CandleWidget,
  diversification: DiversificationWidget,
};

export function LessonBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[1.0625rem] leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return (
              <p key={i} className="text-ink/90">
                <Rich text={b.text} />
              </p>
            );
          case "h":
            return (
              <h2 key={i} className="display pt-4 text-xl font-bold">
                {b.text}
              </h2>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-2 pl-5 text-ink/90 marker:text-ink-soft">
                {b.items.map((item) => (
                  <li key={item}>
                    <Rich text={item} />
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside
                key={i}
                className={cn(
                  "border-l-4 py-1 pl-4",
                  b.tone === "idea" ? "border-cobalt" : "border-cut",
                )}
              >
                <p className="text-sm font-semibold">{b.tone === "idea" ? "Idea clave" : "Ojo"}</p>
                <p className="mt-1">
                  <Rich text={b.text} />
                </p>
              </aside>
            );
          case "widget": {
            const W = WIDGETS[b.name];
            return (
              <div key={i} className="py-2">
                <W />
              </div>
            );
          }
          case "tool":
            return (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-grid p-4">
                <p className="text-sm text-ink-soft">{b.text}</p>
                <Link
                  href={b.href}
                  className="whitespace-nowrap rounded-md border border-cobalt px-3 py-1.5 text-sm font-medium text-cobalt hover:bg-cobalt hover:text-white"
                >
                  {b.label}
                </Link>
              </div>
            );
        }
      })}
    </div>
  );
}
