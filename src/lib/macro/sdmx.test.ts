import { describe, expect, it } from "vitest";
import { normalizeDate, parseNumber, parseSdmxJson, parseSdmxXml, parseSdmxXmlSeries } from "./sdmx";

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

  it("separa las series y elige la que pide el filtro (UVR en pesos, no su variación)", () => {
    const xml = `<message:DataSet structureRef="OECD_STES_3_0">
      <generic:Series><generic:SeriesKey><generic:Value id="SUBJECT" value="RVU" /><generic:Value id="UNIT_MEASURE" value="APC" /></generic:SeriesKey>
        <generic:Attributes><generic:Value id="UNIT_MULT" value="0" /></generic:Attributes>
        <generic:Obs><generic:ObsDimension id="TIME_PERIOD" value="2025-01-15" /><generic:ObsValue value="5,2" /><generic:Attributes><generic:Value id="OBS_STATUS" value="A" /></generic:Attributes></generic:Obs>
      </generic:Series>
      <generic:Series><generic:SeriesKey><generic:Value id="SUBJECT" value="RVU" /><generic:Value id="UNIT_MEASURE" value="COP" /></generic:SeriesKey>
        <generic:Obs><generic:ObsDimension id="TIME_PERIOD" value="2025-01-15" /><generic:ObsValue value="380.1234" /></generic:Obs>
        <generic:Obs><generic:ObsDimension id="TIME_PERIOD" value="2025-01-16" /><generic:ObsValue value="380.2" /></generic:Obs>
      </generic:Series></message:DataSet>`;
    const series = parseSdmxXmlSeries(xml);
    expect(series.map((x) => x.key.UNIT_MEASURE)).toEqual(["APC", "COP"]);
    expect(series[0].points).toEqual([{ date: "2025-01-15", value: 5.2 }]);
    expect(parseSdmxXml(xml, 1, (x) => (x.points.at(-1)?.value ?? 0) > 50)).toEqual([
      { date: "2025-01-15", value: 380.1234 },
      { date: "2025-01-16", value: 380.2 },
    ]);
  });

  it("valor como texto del elemento", () => {
    const xml = `<Series><Obs><ObsDimension value="20250115"/><ObsValue>9.5</ObsValue></Obs></Series>`;
    expect(parseSdmxXml(xml)).toEqual([{ date: "2025-01-15", value: 9.5 }]);
  });
});

describe("formatos", () => {
  it("fechas", () => {
    expect(normalizeDate("2025-01-15T00:00:00")).toBe("2025-01-15");
    expect(normalizeDate("15/01/2025")).toBe("2025-01-15");
    expect(normalizeDate("2025/01/15")).toBe("2025-01-15");
    expect(normalizeDate("2025-M03")).toBe("2025-03-01");
    expect(normalizeDate("2025-D032")).toBe("2025-02-01");
    expect(normalizeDate("enero")).toBeNull();
  });

  it("números con coma o punto", () => {
    expect(parseNumber("385.12")).toBe(385.12);
    expect(parseNumber("385,12")).toBe(385.12);
    expect(parseNumber("1.234,5")).toBe(1234.5);
    expect(parseNumber("1234")).toBe(1234);
    expect(parseNumber("385.123")).toBe(385.123);
  });
});
