import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsSentiment } from "@/components/analyzer/news-sentiment";

export const metadata: Metadata = { title: "Noticias y sentimiento" };

export default function Page() {
  return (
    <Suspense>
      <NewsSentiment />
    </Suspense>
  );
}
