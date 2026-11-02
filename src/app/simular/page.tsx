import type { Metadata } from "next";
import { Suspense } from "react";
import { SimHome } from "@/components/sim/sim-home";

export const metadata: Metadata = { title: "Simular" };

// SimHome usa la fecha de hoy: va dentro de Suspense para calcularse en cada visita.
export default function Page() {
  return (
    <Suspense fallback={<div aria-busy="true" className="mx-auto h-96 max-w-6xl" />}>
      <SimHome />
    </Suspense>
  );
}
