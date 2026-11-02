import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
// Archivo autoalojada (ejes de peso y ancho): no depende de Google Fonts en el build.
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "wanna-trade",
    template: "%s · wanna-trade",
  },
  description:
    "Analiza el mercado de hoy y practica invirtiendo con datos de años anteriores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-grid">
          <p className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-ink-soft">
            Herramienta educativa y de análisis. No es una recomendación de
            inversión.
          </p>
        </footer>
      </body>
    </html>
  );
}
