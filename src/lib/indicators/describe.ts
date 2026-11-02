import { zoneTrend, type ChopZone, type Trend } from "./chop-zone";

const STRENGTH = ["", "débil", "moderada", "clara", "fuerte"] as const;

/** Descripción en palabras de una tendencia del Chop Zone. */
export function describeTrend(trend: Trend): string {
  if (trend.direction === "flat") return "Lateral, sin tendencia";
  const dir = trend.direction === "up" ? "alcista" : "bajista";
  return `Tendencia ${dir} ${STRENGTH[trend.strength]}`;
}

export function describeZone(zone: ChopZone): string {
  return describeTrend(zoneTrend(zone));
}
