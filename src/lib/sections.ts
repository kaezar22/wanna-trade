// Las tres secciones de la app. Un solo lugar para nombres, rutas y descripciones.
export const sections = [
  {
    href: "/analizar",
    name: "Analizar",
    summary:
      "Precios, indicadores y noticias hasta hoy, para decisiones con dinero real.",
    phase: "Disponible",
  },
  {
    href: "/simular",
    name: "Simular",
    summary:
      "Vuelve a una fecha de hace dos o tres años, arma un portafolio y avanza el reloj.",
    phase: "Disponible",
  },
  {
    href: "/aprender",
    name: "Aprender",
    summary:
      "Una ruta por pasos: leer gráficos, comparar activos y diseñar un portafolio.",
    phase: "Disponible",
  },
] as const;
