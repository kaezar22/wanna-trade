import type { Metadata } from "next";
import { Suspense } from "react";
import { CdtView } from "@/components/rates/cdt-view";
import { CDT_DATA_START, CDT_SOURCE_URL, getCdtSnapshot } from "@/lib/rates/cdt";
import { isCdtTermKey } from "@/lib/rates/cdt-math";

export const metadata: Metadata = { title: "Tasas de CDT" };

export default function Page({ searchParams }: PageProps<"/analizar/cdt">) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-[480px] rounded-lg bg-paper-raised" />}>
      <Loader searchParams={searchParams} />
    </Suspense>
  );
}

async function Loader({ searchParams }: { searchParams: PageProps<"/analizar/cdt">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const fecha = one(sp.fecha) || null;
  const plazo = one(sp.plazo);
  const term = isCdtTermKey(plazo) ? plazo : "90";

  const result = await getCdtSnapshot(fecha);
  if (!result.ok) {
    return (
      <div role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-5">
        <p className="font-semibold">No se pudieron cargar las tasas de CDT</p>
        <p className="mt-1 text-ink-soft">{result.message}</p>
      </div>
    );
  }
  return (
    <CdtView
      key={`${fecha}-${term}`}
      snapshot={result.data}
      term={term}
      dataStart={CDT_DATA_START}
      sourceUrl={CDT_SOURCE_URL}
    />
  );
}
