import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { GeoView } from "@/components/analyzer/geo-view";
import { getGeoNews } from "@/lib/geo/news";

export const metadata: Metadata = { title: "Geopolítica" };

// La primera carga de cada hora lee ~19 medios y clasifica con DeepSeek.
export const maxDuration = 90;

export default function Page() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="space-y-3">
          <p className="text-ink-soft">
            Leyendo medios de varios países y clasificando las noticias. La primera carga de cada hora puede tardar
            hasta un minuto…
          </p>
          <div className="h-[480px] rounded-lg bg-paper-raised" />
        </div>
      }
    >
      <Loader />
    </Suspense>
  );
}

async function Loader() {
  await connection(); // se arma en cada visita (con caché de una hora), no en el build
  const data = await getGeoNews();
  if (!data.ok) {
    return (
      <div role="alert" className="rounded-lg border border-down/40 bg-paper-raised p-5">
        <p className="font-semibold">No se pudieron cargar las noticias</p>
        <p className="mt-1 text-ink-soft">{data.message}</p>
      </div>
    );
  }
  return <GeoView data={data} />;
}
