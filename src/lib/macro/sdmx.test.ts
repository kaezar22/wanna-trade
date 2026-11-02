import { describe, expect, it } from "vitest";
import { parseSdmxJson, parseSdmxXml } from "./sdmx";

describe("SDMX-JSON", () => {
  it("lee la serie con más observaciones y pasa a fracción", () => {
    const body = {
      data: {
        dataSets: [
          {
            series: {
              "0:0": { observations: { "0": [13.25], "1": [13], "2": [12.75] } },
              "0:1": { observations: { "0": [1] } },
            },
          },
        ],
        structure: {
          dimensions: {
            observation: [{ id: "TIME_PERIOD", values: [{ id: "2024-01" }, { id: "2024-02" }, { id: "2024-03" }] }],
          },
        },
      },
    };
    expect(parseSdmxJson(body, 0.01)).toEqual([
      { date: "2024-01-01", value: 0.1325 },
      { date: "2024-02-01", value: 0.13 },
      { date: "2024-03-01", value: 0.1275 },
    ]);
  });

  it("sin estructura devuelve vacío", () => {
    expect(parseSdmxJson({})).toEqual([]);
  });
});

describe("SDMX-ML", () => {
  it("específico de estructura, con atributos en cualquier orden", () => {
    const xml = `<message:DataSet><Series FREQ="M"><Obs OBS_VALUE="9.25" TIME_PERIOD="2025-02"/><Obs TIME_PERIOD="2025-01" OBS_VALUE="9.5" OBS_STATUS="A"/></Series></message:DataSet>`;
    expect(parseSdmxXml(xml, 0.01)).toEqual([
      { date: "2025-01-01", value: 0.095 },
      { date: "2025-02-01", value: 0.0925 },
    ]);
  });

  it("genérico", () => {
    const xml = `<generic:Series><generic:Obs><generic:ObsDimension value="2025-01-15"/><generic:ObsValue value="9.5"/></generic:Obs></generic:Series>`;
    expect(parseSdmxXml(xml, 0.01)).toEqual([{ date: "2025-01-15", value: 0.095 }]);
  });
});
