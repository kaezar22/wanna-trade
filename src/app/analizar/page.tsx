import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Analizar" };

export default function Page() {
  return (
    <ComingSoon
      title="Analizar"
      intro="Precios, indicadores y noticias con datos hasta hoy."
      phase="fase 2"
      items={[
        "Gráfico de velas interactivo con SMA, Bollinger, Ichimoku y Chop Zone",
        "Selector de instrumentos con métricas de riesgo y correlación",
        "Sentimiento de noticias con DeepSeek",
        "Buscador de tickers con validación",
      ]}
    />
  );
}
