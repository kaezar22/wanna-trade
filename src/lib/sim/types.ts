// Tipos compartidos entre las APIs del simulador y la interfaz.
import type { Bar, InstrumentMeta } from "../market/types";

export type SimAsset = { symbol: string; meta: InstrumentMeta; bars: Bar[] };

export type SimMarket = {
  asOf: string;
  assets: SimAsset[];
  /** Pesos por dólar (COP=X) hasta la fecha. */
  fx: Bar[];
  failed: { symbol: string; message: string }[];
};

type Line = { dates: string[]; values: number[] };
export type SimBenchmarks = { spy: Line | null; icolcap: Line | null; cdt: Line | null };
