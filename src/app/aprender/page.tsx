import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Aprender" };

export default function Page() {
  return (
    <ComingSoon
      title="Aprender"
      intro="Una ruta por pasos. Cada nivel termina con una misión en el simulador."
      phase="fase 5"
      items={[
        "Fundamentos: acciones, ETFs, CDT, riesgo e interés compuesto",
        "Leer gráficos: velas, volumen y tendencias",
        "Indicadores: qué dicen y qué no",
        "Qué comparar: volatilidad, drawdown, costos y riesgo cambiario",
        "Diseñar un portafolio según tu perfil y horizonte",
        "Un tutor con DeepSeek que responde sobre la lección actual",
      ]}
    />
  );
}
