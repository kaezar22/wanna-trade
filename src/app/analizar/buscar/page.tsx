import type { Metadata } from "next";
import { Suspense } from "react";
import { TickerFinder } from "@/components/analyzer/ticker-finder";

export const metadata: Metadata = { title: "Buscar tickers" };

export default function Page() {
  return (
    <Suspense>
      <TickerFinder />
    </Suspense>
  );
}
