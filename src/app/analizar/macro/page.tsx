import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MacroView } from "@/components/analyzer/macro-view";
import { getMacro } from "@/lib/macro/sources";

export const metadata: Metadata = { title: "Contexto económico" };

export default function Page() {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-[480px] rounded-lg bg-paper-raised" />}>
      <Loader />
    </Suspense>
  );
}

async function Loader() {
  await connection(); // se calcula en cada visita (usa la fecha de hoy)
  return <MacroView series={await getMacro()} />;
}
