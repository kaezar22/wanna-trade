"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/lib/sections";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return <HeaderBar pathname={usePathname()} />;
}

/** La barra sin depender de la URL: sirve de respaldo mientras carga una ruta dinámica. */
export function HeaderBar({ pathname }: { pathname: string }) {
  return (
    <header className="border-b border-grid bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-14">
        <Link href="/" className="display whitespace-nowrap text-base font-bold sm:text-lg">
          wanna-trade
        </Link>
        <nav aria-label="Secciones">
          <ul className="flex items-center gap-0.5 sm:gap-2">
            {sections.map((s) => {
              const active = pathname.startsWith(s.href);
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2 py-1.5 sm:px-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink-soft hover:text-ink hover:bg-paper-raised",
                    )}
                  >
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
