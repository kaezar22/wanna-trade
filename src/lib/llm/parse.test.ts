import { describe, expect, it } from "vitest";
import { parseSentiment, parseTickers } from "./parse";

describe("parseSentiment", () => {
  it("acepta una respuesta válida y normaliza tildes y mayúsculas", () => {
    const r = parseSentiment(
      JSON.stringify({
        overall: "Volátil",
        score: 1.7,
        summary: "Resultados mixtos.",
        themes: ["resultados", "", 3],
        items: ["Positivo", "negativo", "raro"],
      }),
      4,
    );
    expect(r).toEqual({
      overall: "volatil",
      score: 1,
      summary: "Resultados mixtos.",
      themes: ["resultados"],
      items: ["positivo", "negativo", "neutral", "neutral"],
    });
  });

  it("rechaza JSON roto o sin campos obligatorios", () => {
    expect(parseSentiment("no es json", 1)).toBeNull();
    expect(parseSentiment(JSON.stringify({ overall: "eufórico", summary: "x" }), 1)).toBeNull();
    expect(parseSentiment(JSON.stringify({ overall: "neutral", summary: "" }), 1)).toBeNull();
  });
});

describe("parseTickers", () => {
  it("limpia, valida y quita duplicados", () => {
    const r = parseTickers(
      JSON.stringify({
        tickers: [
          { symbol: " ecopetrol.cl ", name: "Ecopetrol", reason: "Petróleo" },
          { symbol: "ECOPETROL.CL", name: "dup" },
          { symbol: "NO VALIDO", name: "x" },
          { symbol: "ENPH", name: "Enphase" },
          "basura",
        ],
      }),
    );
    expect(r).toEqual([
      { symbol: "ECOPETROL.CL", name: "Ecopetrol", reason: "Petróleo" },
      { symbol: "ENPH", name: "Enphase", reason: "" },
    ]);
  });

  it("devuelve vacío si el formato no sirve", () => {
    expect(parseTickers("[]")).toEqual([]);
    expect(parseTickers("{")).toEqual([]);
  });
});
