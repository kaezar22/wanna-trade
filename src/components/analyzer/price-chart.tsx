"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type LogicalRange,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import {
  CHOP_ZONE_COLORS,
  type BollingerBands,
  type ChopZone,
  type ExpectedRange,
  type Ichimoku,
  type Series,
} from "@/lib/indicators";
import type { Bar, Interval } from "@/lib/market/types";
import { chartTime, futureTimes } from "./chart-time";

export type Overlays = {
  smaFast?: { length: number; values: Series };
  smaSlow?: { length: number; values: Series };
  bollinger?: BollingerBands;
  ichimoku?: Ichimoku;
  chopZone?: (ChopZone | null)[];
  expectedRange?: ExpectedRange;
};

export const ICHIMOKU_COLORS = { tenkan: "#7E57C2", kijun: "#8D6E63" };

// Paleta de los indicadores. Se lee de los tokens CSS para respetar el modo oscuro.
function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    paper: v("--paper-raised"),
    ink: v("--ink"),
    inkSoft: v("--ink-soft"),
    grid: v("--grid"),
    up: v("--up"),
    down: v("--down"),
    cobalt: v("--cobalt"),
    cut: v("--cut"),
  };
}

type Props = {
  bars: Bar[];
  interval: Interval;
  /** false cuando el proveedor solo da el cierre (máximo = mínimo = cierre). */
  hasOHLC: boolean;
  hasVolume: boolean;
  overlays: Overlays;
  onHover?: (index: number | null) => void;
};

export function PriceChart({ bars, interval, hasOHLC, hasVolume, overlays, onHover }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<LogicalRange | null>(null);
  // Último índice lógico dibujado (incluye el futuro), para mover el encuadre
  // cuando se agregan o quitan proyecciones.
  const lastIndexRef = useRef<number | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  // Redibuja si cambia el modo claro/oscuro del sistema.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeVersion((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Al cambiar de instrumento o intervalo, volver a encuadrar todo. Va antes
  // del efecto que dibuja para que este ya vea el encuadre reiniciado.
  useEffect(() => {
    rangeRef.current = null;
    lastIndexRef.current = null;
  }, [bars]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length === 0) return;
    const t = readTheme();

    const chart: IChartApi = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: t.paper },
        textColor: t.inkSoft,
        fontFamily: '"Archivo Variable", system-ui, sans-serif',
        panes: { separatorColor: t.grid, enableResize: false },
      },
      grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
      rightPriceScale: { borderColor: t.grid },
      timeScale: { borderColor: t.grid, timeVisible: interval === "1h", rightOffset: 4 },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "es-CO" },
    });

    const times = bars.map((b) => chartTime(b, interval));
    const toLine = (values: Series, offset = 0) =>
      values.flatMap((v, i) => (v === null ? [] : [{ time: times[i + offset], value: v }]));

    // Precio
    if (hasOHLC) {
      const candles = chart.addSeries(CandlestickSeries, {
        upColor: t.up,
        downColor: t.down,
        borderUpColor: t.up,
        borderDownColor: t.down,
        wickUpColor: t.up,
        wickDownColor: t.down,
      });
      candles.setData(
        bars.map((b, i) => ({ time: times[i], open: b.open, high: b.high, low: b.low, close: b.close })),
      );
    } else {
      const line = chart.addSeries(LineSeries, { color: t.ink, lineWidth: 2 });
      line.setData(bars.map((b, i) => ({ time: times[i], value: b.close })));
    }

    const addLine = (
      values: { time: Time; value: number }[],
      color: string,
      style: LineStyle = LineStyle.Solid,
      width: 1 | 2 = 2,
    ) => {
      const s = chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s.setData(values);
    };

    const { smaFast, smaSlow, bollinger, ichimoku, chopZone, expectedRange } = overlays;
    if (smaFast) addLine(toLine(smaFast.values), t.cobalt);
    if (smaSlow) addLine(toLine(smaSlow.values), t.cut);

    if (bollinger) {
      addLine(toLine(bollinger.upper), t.inkSoft, LineStyle.Dashed, 1);
      addLine(toLine(bollinger.middle), t.inkSoft, LineStyle.Solid, 1);
      addLine(toLine(bollinger.lower), t.inkSoft, LineStyle.Dashed, 1);
    }

    // Tiempos futuros: nube de Ichimoku y rango esperado se dibujan después del último día.
    const futureCount = Math.max(ichimoku?.displacement ?? 0, expectedRange?.length ?? 0);
    const future = futureCount > 0 ? futureTimes(bars[bars.length - 1], interval, futureCount) : [];
    const allTimes = [...times, ...future];

    if (ichimoku) {
      const ext = (values: Series) =>
        values.flatMap((v, i) => (v === null || !allTimes[i] ? [] : [{ time: allTimes[i], value: v }]));
      addLine(toLine(ichimoku.tenkan), ICHIMOKU_COLORS.tenkan, LineStyle.Solid, 1);
      addLine(toLine(ichimoku.kijun), ICHIMOKU_COLORS.kijun, LineStyle.Solid, 1);
      addLine(ext(ichimoku.senkouA), t.up, LineStyle.Solid, 1);
      addLine(ext(ichimoku.senkouB), t.down, LineStyle.Solid, 1);
    }

    if (expectedRange && expectedRange.length > 0) {
      const lastTime = times[times.length - 1];
      const lastClose = bars[bars.length - 1].close;
      const pts = (key: "upper" | "lower") => [
        { time: lastTime, value: lastClose },
        ...expectedRange.map((r, i) => ({ time: future[i], value: r[key] })),
      ];
      addLine(pts("upper"), t.cobalt, LineStyle.Dotted, 2);
      addLine(pts("lower"), t.cobalt, LineStyle.Dotted, 2);
    }

    // Espacio en blanco para que el eje de tiempo llegue hasta el futuro.
    if (future.length > 0) {
      const ws = chart.addSeries(LineSeries, { visible: false });
      ws.setData(future.map((time) => ({ time })));
    }

    // Paneles inferiores
    let pane = 1;
    if (hasVolume) {
      const vol = chart.addSeries(
        HistogramSeries,
        { priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false },
        pane,
      );
      vol.setData(
        bars.map((b, i) => ({
          time: times[i],
          value: b.volume,
          color: b.close >= b.open ? `${t.up}66` : `${t.down}66`,
        })),
      );
      chart.panes()[pane]?.setStretchFactor(0.25);
      pane++;
    }

    if (chopZone) {
      const cz = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false, lastValueVisible: false, priceScaleId: "cz" },
        pane,
      );
      cz.setData(
        chopZone.flatMap((z, i) =>
          z === null ? [] : [{ time: times[i], value: 1, color: CHOP_ZONE_COLORS[z] }],
        ),
      );
      chart.priceScale("cz", pane).applyOptions({ visible: false });
      chart.panes()[pane]?.setStretchFactor(0.08);
    }

    chart.panes()[0]?.setStretchFactor(1);

    const lastIndex = allTimes.length - 1;
    const saved = rangeRef.current;
    const prevLast = lastIndexRef.current;
    if (saved && prevLast !== null) {
      // Si se estaba viendo el borde derecho, seguirlo para que la proyección quede a la vista.
      const atRightEdge = saved.to >= prevLast - 1;
      const shift = atRightEdge ? lastIndex - prevLast : 0;
      chart.timeScale().setVisibleLogicalRange({ from: saved.from, to: saved.to + shift });
    } else {
      chart.timeScale().fitContent();
    }
    lastIndexRef.current = lastIndex;

    const onRange = (r: LogicalRange | null) => {
      rangeRef.current = r;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);

    const indexByTime = new Map(times.map((tm, i) => [String(tm), i]));
    chart.subscribeCrosshairMove((param) => {
      if (!onHover) return;
      const idx = param.time === undefined ? undefined : indexByTime.get(String(param.time));
      onHover(idx ?? null);
    });

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
      chart.remove();
    };
  }, [bars, interval, hasOHLC, hasVolume, overlays, onHover, themeVersion]);

  return <div ref={containerRef} className="h-[460px] w-full sm:h-[560px]" />;
}
