// Datos ficticios para desarrollar sin conexión (MARKET_DATA_MOCK=1).

import type { GeoItem, GeoNews } from "./news";
import { OUTLETS } from "./outlets";

const SAMPLE: Omit<GeoItem, "id" | "outlet" | "date" | "url">[] = [
  { title: "Ministers meet to discuss tariff truce", summary: "Delegaciones de dos potencias se reúnen para extender una tregua arancelaria que vence este mes.", people: ["Ministra A"], countries: ["US", "CN"], topic: "comercio", subtopic: "Tregua arancelaria", tone: "neutral", risk: "disminuye" },
  { title: "Missile strikes hit energy grid", summary: "Un ataque con misiles dañó la red eléctrica de varias ciudades y dejó a miles sin luz.", people: [], countries: ["UA", "RU"], topic: "conflicto", subtopic: "Guerra en Ucrania", tone: "negativo", risk: "aumenta" },
  { title: "OPEC+ weighs output change", summary: "Los productores evalúan modificar sus cuotas de producción ante la caída del precio del crudo.", people: [], countries: ["SA", "RU"], topic: "energia", subtopic: "Cuotas de petróleo", tone: "neutral", risk: "neutral" },
  { title: "New sanctions package announced", summary: "El bloque anunció un nuevo paquete de sanciones contra bancos y navieras.", people: ["Comisaria B"], countries: ["EU", "IR"], topic: "sanciones", subtopic: "Sanciones financieras", tone: "negativo", risk: "aumenta" },
  { title: "Leaders sign border agreement", summary: "Dos gobiernos firmaron un acuerdo para reabrir pasos fronterizos y reforzar la cooperación.", people: ["Presidente C", "Presidenta D"], countries: ["CO", "VE"], topic: "diplomacia", subtopic: "Acuerdo fronterizo", tone: "positivo", risk: "disminuye" },
  { title: "Central bank holds rates amid uncertainty", summary: "El banco central mantuvo su tasa y advirtió sobre el efecto de las tensiones comerciales.", people: [], countries: ["BR"], topic: "economia", subtopic: "Tasas de interés", tone: "neutral", risk: "neutral" },
];

export function mockGeoNews(): GeoNews {
  const now = Date.now();
  const items: GeoItem[] = SAMPLE.map((s, k) => {
    const o = OUTLETS[(k * 3) % OUTLETS.length];
    return {
      ...s,
      id: `mock-${k}`,
      url: "https://example.com/",
      date: new Date(now - k * 2.5 * 3600_000).toISOString(),
      outlet: { id: o.id, name: o.name, country: o.country, ownership: o.ownership },
    };
  });
  return {
    ok: true,
    generatedAt: new Date(now).toISOString(),
    items,
    candidates: 12,
    outlets: OUTLETS.map((o) => ({
      id: o.id,
      name: o.name,
      country: o.country,
      fetched: 20,
      used: items.filter((i) => i.outlet.id === o.id).length,
    })),
  };
}
