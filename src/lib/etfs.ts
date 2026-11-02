// Lista curada de ETFs para empezar. Solo datos estables (qué replican, dónde
// cotizan y en qué moneda). El costo anual se agregará con fuente verificada,
// porque Yahoo no lo entrega sin sesión.

export type EtfInfo = {
  symbol: string;
  name: string;
  /** Qué replica, en palabras simples. */
  tracks: string;
  assetClass: "Acciones" | "Bonos" | "Materias primas";
  region: string;
  currency: "USD" | "COP";
  exchange: string;
  /** Para qué sirve dentro de un portafolio. */
  role: string;
};

export const ETFS: EtfInfo[] = [
  {
    symbol: "ICOLCAP.CL",
    name: "iShares MSCI COLCAP",
    tracks: "Las acciones más grandes y líquidas de la Bolsa de Colombia",
    assetClass: "Acciones",
    region: "Colombia",
    currency: "COP",
    exchange: "Bolsa de Valores de Colombia",
    role: "Exposición al mercado colombiano en pesos, sin riesgo cambiario.",
  },
  {
    symbol: "GXG",
    name: "Global X MSCI Colombia",
    tracks: "Empresas colombianas, cotizado en dólares",
    assetClass: "Acciones",
    region: "Colombia",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "El mercado colombiano visto desde dólares: suma el efecto del tipo de cambio.",
  },
  {
    symbol: "SPY",
    name: "SPDR S&P 500",
    tracks: "Las 500 empresas más grandes de EE. UU.",
    assetClass: "Acciones",
    region: "EE. UU.",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "El núcleo más común de un portafolio de acciones globales.",
  },
  {
    symbol: "VOO",
    name: "Vanguard S&P 500",
    tracks: "El mismo índice S&P 500 que SPY",
    assetClass: "Acciones",
    region: "EE. UU.",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "Alternativa a SPY: misma exposición, otro emisor.",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ",
    tracks: "Las 100 empresas no financieras más grandes del Nasdaq",
    assetClass: "Acciones",
    region: "EE. UU.",
    currency: "USD",
    exchange: "Nasdaq",
    role: "Concentrado en tecnología: más crecimiento esperado y más volatilidad.",
  },
  {
    symbol: "VT",
    name: "Vanguard Total World Stock",
    tracks: "Acciones de todo el mundo, desarrollados y emergentes",
    assetClass: "Acciones",
    region: "Global",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "Diversificación global en un solo instrumento.",
  },
  {
    symbol: "EEM",
    name: "iShares MSCI Emerging Markets",
    tracks: "Acciones de mercados emergentes (China, India, Brasil, entre otros)",
    assetClass: "Acciones",
    region: "Emergentes",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "Exposición a países en desarrollo, que se mueven distinto a EE. UU.",
  },
  {
    symbol: "TLT",
    name: "iShares 20+ Year Treasury Bond",
    tracks: "Bonos del Tesoro de EE. UU. a más de 20 años",
    assetClass: "Bonos",
    region: "EE. UU.",
    currency: "USD",
    exchange: "Nasdaq",
    role: "Renta fija larga: sube cuando bajan las tasas de interés, pero puede caer mucho cuando suben.",
  },
  {
    symbol: "BND",
    name: "Vanguard Total Bond Market",
    tracks: "Bonos de EE. UU. con grado de inversión, de todos los plazos",
    assetClass: "Bonos",
    region: "EE. UU.",
    currency: "USD",
    exchange: "Nasdaq",
    role: "Renta fija diversificada en dólares, menos volátil que TLT.",
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    tracks: "El precio del oro",
    assetClass: "Materias primas",
    region: "Global",
    currency: "USD",
    exchange: "NYSE Arca",
    role: "Suele usarse como refugio y se mueve distinto a las acciones.",
  },
];
