import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useState,
} from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { useTheme } from "@/lib/hooks/use-theme";
import { cn } from "@/lib/utils";

export interface LineData {
  x: number[];
  y: number[];
  label: string;
  color?: string;
  dashed?: boolean;
}
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref?.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

interface LineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  lines: LineData[];
  isDateTime?: boolean;
  xlabel?: string;
  ylabel?: string;
  title?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showLegend?: boolean;
  isBytes?: boolean;
}

// Compute min and max without spread
const findMinMax = (arr: number[]): { min: number; max: number } => {
  if (!arr.length) return { min: 0, max: 1 };
  return arr.reduce(
    (acc, v) => ({ min: Math.min(acc.min, v), max: Math.max(acc.max, v) }),
    { min: arr[0], max: arr[0] },
  );
};

// Smart date formatter
const smartDateFormatter = (value: number, range: number): string => {
  // Get user's timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Create date object from UTC timestamp and convert to user's timezone
  const localDate = new Date(value);

  const oneDay = 86400000;
  const oneYear = 365 * oneDay;
  const twoHours = 2 * 3600000;

  if (range < twoHours)
    return localDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: userTimezone,
    });
  if (range < oneDay)
    return localDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: userTimezone,
    });
  if (range < oneYear)
    return localDate.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      timeZone: userTimezone,
    });
  return localDate.toLocaleDateString([], {
    timeZone: userTimezone,
  });
};

// Numeric label formatter
const formatAxisLabel = (value: number): string => {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.0001)
    return value.toExponential(2).replace(/\.?0+e/, "e");
  const units = [
    { limit: 1e18, suffix: "E" },
    { limit: 1e15, suffix: "P" },
    { limit: 1e12, suffix: "T" },
    { limit: 1e9, suffix: "G" },
    { limit: 1e6, suffix: "M" },
    { limit: 1e3, suffix: "k" },
  ];
  for (const { limit, suffix } of units) {
    if (Math.abs(value) >= limit) {
      return `${(value / limit).toPrecision(4).replace(/\.?0+$/, "")}${suffix}`;
    }
  }
  return value.toPrecision(4).replace(/\.?0+$/, "");
};

const calculateAxisInterval = (
  extent: { min: number; max: number },
  isMin: boolean,
): number => {
  const range = extent.max - extent.min;
  if (range === 0) return isMin ? extent.min : extent.max;
  const magnitude = Math.floor(Math.log10(range));
  const scale = Math.pow(10, magnitude);
  const normalized = range / scale;
  let nice;
  if (normalized <= 1) nice = 0.2;
  else if (normalized <= 2) nice = 0.5;
  else if (normalized <= 5) nice = 1;
  else nice = 2;
  return (
    (isMin
      ? Math.floor(extent.min / (nice * scale))
      : Math.ceil(extent.max / (nice * scale))) *
    nice *
    scale
  );
};

const LineChart = forwardRef<ReactECharts, LineChartProps>(
  (
    {
      lines,
      isDateTime = false,
      xlabel,
      ylabel,
      title,
      showXAxis = false,
      showYAxis = false,
      showLegend = false,
      isBytes = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const { resolvedTheme: theme } = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useContainerSize(containerRef);

    // Global extents, nice bounds & intervals
    const {
      xMin,
      xMax,
      yMin,
      yMax,
      timeRange,
      labelCounts,
      xInterval,
      yInterval,
    } = useMemo(() => {
      const allX = lines.flatMap((l) => l.x);
      const allY = lines.flatMap((l) => l.y);
      const { min: rawXMin, max: rawXMax } = findMinMax(allX);
      const { min: rawYMin, max: rawYMax } = findMinMax(allY);

      // X-axis nice bounds
      const xMin = calculateAxisInterval({ min: rawXMin, max: rawXMax }, true);
      const xMax = calculateAxisInterval({ min: rawXMin, max: rawXMax }, false);

      // Y-axis: handle constant values by adding padding
      let yMin: number, yMax: number;
      if (rawYMax - rawYMin === 0) {
        const pad = rawYMin === 0 ? 1 : Math.abs(rawYMin * 0.1);
        yMin = rawYMin - pad;
        yMax = rawYMax + pad;
      } else {
        yMin = calculateAxisInterval({ min: rawYMin, max: rawYMax }, true);
        yMax = calculateAxisInterval({ min: rawYMin, max: rawYMax }, false);
      }

      const splits = 5;
      const xInterval = isDateTime ? undefined : (xMax - xMin) / splits;
      const yInterval = (yMax - yMin) / splits;
      const timeRange = isDateTime ? rawXMax - rawXMin || 1 : 1;

      const labelCounts: Record<string, number> = {};
      lines.forEach((l) => {
        labelCounts[l.label] = (labelCounts[l.label] || 0) + 1;
      });

      return {
        xMin,
        xMax,
        yMin,
        yMax,
        timeRange,
        labelCounts,
        xInterval,
        yInterval,
      };
    }, [lines, isDateTime]);

    // Legend layout config (always at top horizontal)
    const legendConfig = useMemo(() => {
      const cols = Math.min(Math.ceil(lines.length / 10), 4);
      const top = cols > 1 ? 60 : 50;
      return {
        orient: "horizontal",
        top,
        right: "auto",
        columns: cols,
      };
    }, [lines.length]);

    useEffect(() => {
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        chart.resize();
      }
    }, [width, height]);

    // ECharts option
    // @ts-expect-error - typing is not perfect
    const option: EChartsOption = useMemo(
      () => ({
        backgroundColor: "transparent",
        title: {
          text: title,
          left: "center",
          textStyle: {
            color: theme === "dark" ? "#fff" : "#000",
            fontSize: 17,
            fontFamily: "Monospace",
            fontWeight: "normal",
          },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "line",
            lineStyle: {
              color:
                theme === "dark"
                  ? "rgba(255, 255, 255, 0.4)"
                  : "rgba(0, 0, 0, 0.4)",
            },
          },
          backgroundColor: theme === "dark" ? "#161619" : "#fff",
          borderColor: theme === "dark" ? "#161619" : "#e0e0e0",
          order: "valueDesc",
          textStyle: {
            color: theme === "dark" ? "#fff" : "#e0e0e0",
            fontFamily: "Monospace",
            fontWeight: "normal",
          },
          shadowColor: "transparent",
          formatter: (params: any | any[]) => {
            const paramArray = Array.isArray(params) ? params : [params];
            const x = paramArray[0].value[0];
            const displayX = isDateTime
              ? smartDateFormatter(x, timeRange)
              : formatAxisLabel(x);
            const uniqueValues = new Map();
            const linesTooltip = [
              `<span style=\"font-weight: bold; color: ${theme === "dark" ? "#fff" : `#000`}\">${displayX}</span>`,
            ];
            paramArray.forEach((param) => {
              const y = param.value[1];
              const key = `${param.seriesName}-${y}`;
              if (!uniqueValues.has(key)) {
                uniqueValues.set(key, true);
                linesTooltip.push(
                  `<span style=\"color: ${theme === "dark" ? `#fff` : `#000`}\">${param.marker} ${param.seriesName}: ${formatAxisLabel(y)}</span>`,
                );
              }
            });
            return linesTooltip.join("<br/>");
          },
        },
        legend: (lines.length > 1 || showLegend) && {
          type: "scroll",
          orient: legendConfig.orient,
          top: legendConfig.top,
          data: lines.map((l, i) => ({
            name: l.label + (labelCounts[l.label] > 1 ? ` (${i + 1})` : ""),
            icon: "circle",
            textStyle: {
              color: l.color || (theme === "dark" ? `#fff` : `#000`),
            },
          })),
        },
        grid: {
          left: "5%",
          right: "5%",
          top: legendConfig.top + 40,
          bottom: 50,
          containLabel: true,
        },
        xAxis: {
          type: isDateTime ? "time" : "value",
          name: xlabel,
          nameLocation: "middle",
          nameGap: 35,
          nameTextStyle: { fontFamily: "Monospace" },
          min: xMin,
          max: xMax,
          interval: xInterval,
          splitNumber: isDateTime ? undefined : 5,
          axisLine: {
            show: showXAxis,
            lineStyle: { color: theme === "dark" ? `#fff` : `#000` },
          },
          axisTick: { show: showXAxis },
          axisLabel: {
            color: theme === "dark" ? `#fff` : `#000`,
            formatter: isDateTime
              ? (val: number | string) =>
                  smartDateFormatter(Number(val), timeRange)
              : (value: number) => formatAxisLabel(value),
            hideOverlap: true,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value",
          name: ylabel,
          nameLocation: "middle",
          nameGap: 50,
          // min: yMin,
          // max: yMax,
          // interval: yInterval,
          splitNumber: 5,
          axisLine: {
            show: showYAxis,
            lineStyle: { color: theme === "dark" ? `#fff` : `#000` },
          },
          axisTick: { show: showYAxis },
          axisLabel: {
            color: theme === "dark" ? `#fff` : `#000`,
            formatter: (value: number) => formatAxisLabel(value),
            fontFamily: "Monospace",
          },
          splitLine: { show: true, lineStyle: { type: "dashed", opacity: 1 } },
        },
        series: lines.map((l, i) => ({
          name: l.label + (labelCounts[l.label] > 1 ? ` (${i + 1})` : ""),
          type: "line",
          smooth: false,
          symbol: "circle",
          symbolSize: 6,
          showSymbol: l.x.length < 100,
          sampling: "lttb",
          lineStyle: {
            color: l.color,
            type: l.dashed ? "dashed" : "solid",
            width: 2,
            opacity: lines.length > 1 ? 0.8 : 1,
          },
          itemStyle: {
            color: l.color,
            opacity: lines.length > 1 ? 0.8 : 1,
            borderWidth: 2,
          },
          emphasis: {
            focus: "series",
            lineStyle: { width: 2, opacity: 1 },
            itemStyle: { opacity: 1, borderWidth: 1 },
          },
          data: l.x.map((x, idx) => [x, l.y[idx]]),
        })),
        animation: false,
        toolbox: {
          feature: {
            dataZoom: {
              filterMode: "none",
              icon: {
                zoom: "path://",
                back: "path://",
              },
            },
          },
        },
      }),
      [
        lines,
        theme,
        title,
        isDateTime,
        xlabel,
        ylabel,
        showXAxis,
        showYAxis,
        showLegend,
        legendConfig,
        xMin,
        xMax,
        yMin,
        yMax,
        xInterval,
        yInterval,
        timeRange,
        labelCounts,
      ],
    );

    // Resize on window change
    useEffect(() => {
      const resize = () => chartRef.current?.getEchartsInstance().resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    const isTouchScreen = isTouchScreenDevice();

    const { setChartRef } = useChartRef(
      ref,
      [theme, lines, isDateTime],
      !isTouchScreen,
    );

    const handleRef = useCallback(
      (chart: ReactECharts | null) => {
        chartRef.current = chart;
        setChartRef(chart);

        if (typeof ref === "function") ref(chart);
        else if (ref) ref.current = chart;
      },
      [ref, setChartRef],
    );

    return (
      <div
        ref={containerRef}
        className={cn("p-2 pt-4", className)}
        style={{
          flexGrow: 1,
          height: "100%",
          width: "100%",
          alignItems: "center",
          display: "flex",
        }}
        {...rest}
      >
        <ReactECharts
          ref={handleRef}
          option={option}
          style={{ width: width, height: height }}
          notMerge={true}
          lazyUpdate={false}
          theme={theme}
        />
      </div>
    );
  },
);

const useChartRef = (
  externalRef: React.Ref<ReactECharts> | undefined,
  deps: React.DependencyList,
  enabled: boolean = true,
) => {
  const internalChartRef = useRef<ReactECharts | null>(null);

  const setChartRef = useCallback(
    (ref: ReactECharts | null) => {
      if (ref && enabled) {
        internalChartRef.current = ref;
        const chart = ref.getEchartsInstance();
        if (chart) {
          chart.dispatchAction({
            type: "takeGlobalCursor",
            key: "dataZoomSelect",
            dataZoomSelectActive: true,
          });
          const zr = chart.getZr();
          if (zr)
            zr.on("dblclick", () =>
              chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 }),
            );
        }
      } else internalChartRef.current = null;

      if (externalRef && enabled) {
        if (typeof externalRef === "function") externalRef(ref);
        else
          (externalRef as React.MutableRefObject<ReactECharts | null>).current =
            ref;
      }
    },
    [externalRef, enabled, ...deps],
  );

  return { setChartRef, internalChartRef };
};

const isTouchScreenDevice = () => {
  try {
    document.createEvent("TouchEvent");
    return true;
  } catch {
    return false;
  }
};

export default LineChart;
