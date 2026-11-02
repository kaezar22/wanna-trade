// Tipos del módulo de mercado. Independientes del proveedor de datos.

/** Fecha de calendario en formato YYYY-MM-DD, en la zona horaria de la bolsa. */
export type ISODate = string;

export type Interval = "1h" | "1d" | "1wk" | "1mo";

export const INTERVALS: readonly Interval[] = ["1h", "1d", "1wk", "1mo"];

export type Bar = {
  /** Inicio de la barra, en segundos Unix. */
  time: number;
  /** Fecha local de la bolsa (YYYY-MM-DD) de la última sesión incluida en la barra. */
  date: ISODate;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Cierre ajustado por dividendos y splits. Úsalo para calcular rentabilidades. */
  adjClose: number;
  volume: number;
};

export type InstrumentMeta = {
  symbol: string;
  name: string | null;
  currency: string | null;
  exchange: string | null;
  /** EQUITY, ETF, CURRENCY, INDEX, MUTUALFUND… según el proveedor. */
  type: string | null;
  timezone: string;
};

export type PriceSeries = {
  meta: InstrumentMeta;
  interval: Interval;
  /** Fecha de corte aplicada, o null si es la serie en vivo (hasta ahora). */
  asOf: ISODate | null;
  bars: Bar[];
};

export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "bad_request" | "upstream",
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
