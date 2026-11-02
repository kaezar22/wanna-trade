import { afterEach, describe, expect, it, vi } from "vitest";
import { cutAt } from "./as-of";
import { MarketDataError } from "./types";
import { fetchYahooBars } from "./yahoo";

// Respuesta de ejemplo con la forma de la API v8 de Yahoo (valores inventados).
// Las barras diarias de NYSE tienen hora 09:30 de Nueva York (13:30 UTC en junio).
const t = (date: string) => Date.parse(`${date}T13:30:00Z`) / 1000;

const sample = {
  chart: {
    result: [
      {
        meta: {
          symbol: "AAPL",
          currency: "USD",
          fullExchangeName: "NasdaqGS",
          instrumentType: "EQUITY",
          exchangeTimezoneName: "America/New_York",
          longName: "Apple Inc.",
        },
        timestamp: [t("2024-06-04"), t("2024-06-05"), t("2024-06-06"), t("2024-06-07")],
        indicators: {
          quote: [
            {
              open: [194, 195, 196, 197],
              high: [195, 197, 198, 199],
              low: [193, 194, null, 196],
              close: [194.5, 196.9, 197.5, 198.1],
              volume: [100, 200, 300, null],
            },
          ],
          adjclose: [{ adjclose: [193.5, 195.9, 196.5, 197.1] }],
        },
      },
    ],
    error: null,
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("adaptador de Yahoo", () => {
  it("convierte la respuesta en barras con fecha local", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(sample)));
    const { meta, bars } = await fetchYahooBars("AAPL", "1d", 0, 1);

    expect(meta).toMatchObject({
      symbol: "AAPL",
      name: "Apple Inc.",
      currency: "USD",
      type: "EQUITY",
      timezone: "America/New_York",
    });
    // La barra del 6 de junio no tiene mínimo: se descarta.
    expect(bars.map((b) => b.date)).toEqual(["2024-06-04", "2024-06-05", "2024-06-07"]);
    expect(bars[0]).toMatchObject({ close: 194.5, adjClose: 193.5, volume: 100 });
    expect(bars[2].volume).toBe(0);
  });

  it("con la fecha de corte no queda nada posterior", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(sample)));
    const { bars } = await fetchYahooBars("AAPL", "1d", 0, 1);
    expect(cutAt(bars, "2024-06-05").at(-1)?.date).toBe("2024-06-05");
  });

  it("símbolo inexistente da not_found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { chart: { result: null, error: { code: "Not Found", description: "No data found" } } },
          { status: 404 },
        ),
      ),
    );
    await expect(fetchYahooBars("NOPE", "1d", 0, 1)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("caída de red da upstream", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const err = await fetchYahooBars("AAPL", "1d", 0, 1).catch((e) => e);
    expect(err).toBeInstanceOf(MarketDataError);
    expect(err.code).toBe("upstream");
  });
});
