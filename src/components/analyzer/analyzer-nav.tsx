"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/analizar", label: "Instrumento" },
  { href: "/analizar/comparar", label: "Comparar" },
  { href: "/analizar/backtest", label: "Estrategias" },
  { href: "/analizar/cdt", label: "CDT" },
  { href: "/analizar/etfs", label: "ETFs" },
  { href: "/analizar/macro", label: "Macro" },
  { href: "/analizar/noticias", label: "Noticias" },
  { href: "/analizar/geopolitica", label: "Geopolítica" },
  { href: "/analizar/buscar", label: "Buscar tickers" },
];

export function AnalyzerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Herramientas de análisis" className="border-b border-grid">
      <ul className="-mb-px flex gap-5 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-2 py-2.5 text-sm font-medium",
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
