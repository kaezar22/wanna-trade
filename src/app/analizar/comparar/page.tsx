import type { Metadata } from "next";
import { Suspense } from "react";
import { Screener } from "@/components/analyzer/screener";

export const metadata: Metadata = { title: "Comparar instrumentos" };

export default function Page() {
  return (
    <Suspense>
      <Screener />
    </Suspense>
  );
}
