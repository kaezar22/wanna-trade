import { AnalyzerNav } from "@/components/analyzer/analyzer-nav";

export default function AnalizarLayout({ children }: LayoutProps<"/analizar">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AnalyzerNav />
      <div className="pt-6">{children}</div>
    </div>
  );
}
