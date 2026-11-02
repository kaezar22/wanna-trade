import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Simular" };

export default function Page() {
  return (
    <ComingSoon
      title="Simular"
      intro="Elige una fecha del pasado, arma un portafolio y avanza el reloj sin saber qué viene."
      phase="fase 4"
      items={[
        "Partidas con fecha de inicio y capital en pesos o dólares",
        "Compras, ventas y rebalanceos con comisiones y tasa de cambio",
        "Noticias e indicadores solo hasta la fecha simulada",
        "Resultado frente al S&P 500, el COLCAP y un CDT",
        "Modo a ciegas: nombres y fechas ocultos hasta el final",
      ]}
    />
  );
}
