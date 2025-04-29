"use client";

import { memo, useCallback, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LineChart from "@/components/charts/line";
import ReactECharts from "echarts-for-react";
import { useGetGraph } from "../../~queries/get-graph";
import { useCheckDatabaseSize } from "@/lib/db/local-cache";
import { metricsCache } from "@/lib/db/index";

export type MetricDataPoint = {
  step: number;
  time: string;
  value: number;
};

export const BYTES_LOGS = ["/bytes/", "sys/memory/", "sys/disk/"];

interface LineChartWithFetchProps {
  logName: string;
  tenantId: string;
  projectName: string;
  runId: string;
  setChartRef: (index: number) => (ref: ReactECharts | null) => void;
  index: number;
  onLoad: () => void;
}

export const LineChartWithFetch = memo(
  ({
    logName,
    tenantId,
    projectName,
    runId,
    setChartRef,
    index,
    onLoad,
  }: LineChartWithFetchProps) => {
    useCheckDatabaseSize(metricsCache);

    const { data, isLoading, isError } = useGetGraph(
      tenantId,
      projectName,
      runId,
      logName,
    );

    // Notify the parent when new data loads.
    useEffect(() => {
      if (data) {
        onLoad();
      }
    }, [data, onLoad]);

    // If no cached data is available yet and a fetch is in progress, show a skeleton.
    if (isLoading && !data) {
      return (
        <Card className="h-96">
          <Skeleton className="h-full" />
        </Card>
      );
    }

    // Render error state.
    if (isError) {
      return (
        <Card className="flex h-96 flex-col items-center justify-center bg-red-500">
          <h2 className="text-2xl font-bold">{logName}</h2>
          <p className="text-sm text-gray-200">Error fetching data</p>
        </Card>
      );
    }

    // Render empty state.
    if (!data || data.length === 0) {
      return (
        <Card className="h-96">
          <div className="flex h-full flex-col items-center justify-center bg-accent">
            <h2 className="text-2xl font-bold">{logName}</h2>
            <p className="text-sm text-gray-500">No data received yet</p>
          </div>
        </Card>
      );
    }

    if (logName.startsWith("sys/") || logName.startsWith("_sys/")) {
      // Prepare chart data.
      const sortedData = [...data].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
      const chartData = {
        x: sortedData.map((d) => new Date(d.time + "Z").getTime()),
        y: sortedData.map((d) => Number(d.value)),
        label: logName,
      };

      const isBytesLog = BYTES_LOGS.some((bytesLog) =>
        logName.includes(bytesLog),
      );

      return (
        <Card className="h-96">
          <LineChart
            lines={[chartData]}
            className="h-full min-h-96"
            title={logName}
            isDateTime={true}
            xlabel="time"
            ref={setChartRef(index)}
          />
        </Card>
      );
    }

    // Prepare chart data.
    const chartData = {
      x: data.map((d) => Number(d.step)),
      y: data.map((d) => Number(d.value)),
      label: logName,
    };

    return (
      <Card className="h-96">
        <LineChart
          lines={[chartData]}
          className="h-full min-h-96"
          title={logName}
          xlabel="step"
          ref={setChartRef(index)}
        />
      </Card>
    );
  },
);
