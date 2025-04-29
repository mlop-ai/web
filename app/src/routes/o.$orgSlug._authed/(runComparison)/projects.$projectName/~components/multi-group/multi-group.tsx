"use client";

import { DropdownRegion } from "@/components/core/runs/dropdown-region/dropdown-region";
import { MultiLineChart } from "./line-chart";
import { MultiGroupAudio } from "./audio";
import { MultiGroupImage } from "./image";
import { MultiGroupVideo } from "./video";
import { MultiHistogramView } from "./histogram-view";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useCallback, memo } from "react";
import { useChartSync } from "@/components/charts/hooks/use-chart-sync";
import ReactECharts from "echarts-for-react";
import { cn } from "@/lib/utils";
import type { RunLogType } from "@/lib/grouping/types";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

interface MultiGroupProps {
  title: string;
  groupId: string;
  metrics: {
    name: string;
    type: RunLogType;
    data: {
      runId: string;
      runName: string;
      color: string;
    }[];
  }[];
  className?: string;
  organizationId: string;
  projectName: string;
}

// Constants for responsive design
const CHART_HEIGHTS = {
  sm: "h-[300px]",
  md: "h-[400px]",
  lg: "h-[500px]",
};

/**
 * Displays a group of metrics with various visualization components
 * based on the metric type (line chart, histogram, audio, or image)
 */
export const MultiGroup = ({
  title,
  groupId,
  metrics,
  className,
  organizationId,
  projectName,
}: MultiGroupProps) => {
  const [loadedCharts, setLoadedCharts] = useState<number>(0);
  const { setChartRef } = useChartSync(groupId, loadedCharts);

  const handleChartLoad = useCallback(() => {
    setLoadedCharts((prev: number) => prev + 1);
  }, []);

  const components = useMemo(
    () =>
      metrics.map((metric, index) => {
        if (metric.type === "METRIC") {
          const lines = metric.data.map((line) => ({
            runId: line.runId,
            runName: line.runName,
            color: line.color,
          }));

          return (
            <Card
              key={metric.name}
              className={cn(
                "w-full transition-all duration-200",
                CHART_HEIGHTS.md,
                "sm:h-[300px] md:h-[400px] lg:h-[500px]",
                className,
              )}
            >
              <MultiLineChart
                lines={lines}
                title={metric.name}
                xlabel="step"
                ref={setChartRef(index)}
                onLoad={handleChartLoad}
                organizationId={organizationId}
                projectName={projectName}
              />
            </Card>
          );
        }

        if (metric.type === "HISTOGRAM") {
          return (
            <Card
              key={metric.name}
              className={cn(
                "w-full transition-all duration-200",
                CHART_HEIGHTS.md,
                "sm:h-[300px] md:h-[400px] lg:h-[500px]",
                className,
              )}
            >
              <MultiHistogramView
                logName={metric.name}
                tenantId={organizationId}
                projectName={projectName}
                runs={metric.data}
              />
            </Card>
          );
        }

        if (metric.type === "AUDIO") {
          return (
            <Card
              key={metric.name}
              className={cn(
                "w-full transition-all duration-200",
                "h-auto min-h-[200px]",
                className,
              )}
            >
              <MultiGroupAudio
                logName={metric.name}
                organizationId={organizationId}
                projectName={projectName}
                runs={metric.data}
                className="h-full"
              />
            </Card>
          );
        }

        if (metric.type === "IMAGE") {
          return (
            <Card
              key={metric.name}
              className={cn(
                "w-full transition-all duration-200",
                "h-auto min-h-[200px]",
                className,
              )}
            >
              <MultiGroupImage
                logName={metric.name}
                organizationId={organizationId}
                projectName={projectName}
                runs={metric.data}
                className="h-full"
              />
            </Card>
          );
        }

        if (metric.type === "VIDEO") {
          return (
            <Card
              key={metric.name}
              className={cn(
                "w-full transition-all duration-200",
                "h-auto min-h-[200px]",
                className,
              )}
            >
              <MultiGroupVideo
                logName={metric.name}
                organizationId={organizationId}
                projectName={projectName}
                runs={metric.data}
                className="h-full"
              />
            </Card>
          );
        }

        return null;
      }),
    [
      metrics,
      setChartRef,
      handleChartLoad,
      className,
      organizationId,
      projectName,
    ],
  );

  return (
    <DropdownRegion title={title} components={components} groupId={groupId} />
  );
};

// Memoized version of MultiGroup to prevent unnecessary re-renders
export const MemoizedMultiGroup = memo(MultiGroup);
