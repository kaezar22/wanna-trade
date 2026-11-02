import type { Metadata } from "next";
import { Suspense } from "react";
import { Backtester } from "@/components/analyzer/backtester";

export const metadata: Metadata = { title: "Probar una estrategia" };

export default function Page() {
  return (
    <Suspense>
      <Backtester />
    </Suspense>
  );
}
