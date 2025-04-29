import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { MetricData } from "../types";

export interface NormalizedHistogramData {
  globalMaxFreq: number;
  xAxisRange: {
    min: number;
    max: number;
    globalMin: number;
    globalMax: number;
  };
  normalizedData: any[]; // refine type as needed based on RunHistogram and HistogramStep
}

export function useNormalizedHistogramData(
  runs: MetricData[],
  {
    tenantId,
    projectName,
    logName,
  }: { tenantId: string; projectName: string; logName: string },
): { data: NormalizedHistogramData; isLoading: boolean; hasError: boolean } {
  // Create separate queries for each run
  const histogramQueries = useQueries({
    queries: runs.map((run) => ({
      ...trpc.runs.data.histogram.queryOptions({
        organizationId: tenantId,
        runId: run.runId,
        projectName,
        logName,
      }),
    })),
  });

  const isLoading = histogramQueries.some((q) => q.isLoading);
  const hasError = histogramQueries.some((q) => q.isError);

  const normalizedData = useMemo(() => {
    if (isLoading || hasError) {
      return {
        globalMaxFreq: 0,
        xAxisRange: { min: 0, max: 1, globalMin: 0, globalMax: 1 },
        normalizedData: [],
      };
    }

    const runHistograms = runs.map((run, index) => ({
      runId: run.runId,
      runName: run.runName,
      color: run.color,
      data: histogramQueries[index].data || [],
    }));

    let globalMin = Infinity;
    let globalMax = -Infinity;
    let maxBinCount = 0;

    // First pass: find global min/max and max bin count
    runHistograms.forEach((run) => {
      run.data.forEach((step) => {
        globalMin = Math.min(globalMin, step.histogramData.bins.min);
        globalMax = Math.max(globalMax, step.histogramData.bins.max);
        maxBinCount = Math.max(maxBinCount, step.histogramData.bins.num);
      });
    });

    const globalBinWidth = (globalMax - globalMin) / maxBinCount;

    const normalized = runHistograms.map((run) => {
      // Calculate the maximum frequency for this run across all steps
      const runMaxFreq = Math.max(
        ...run.data.flatMap((step) => step.histogramData.freq),
      );

      return {
        ...run,
        data: run.data.map((stepData) => {
          const { freq, bins } = stepData.histogramData;
          const oldBinWidth = (bins.max - bins.min) / bins.num;
          const newFreq = new Array(maxBinCount).fill(0);

          freq.forEach((frequency, i) => {
            if (frequency <= 0) return;
            const oldBinStart = bins.min + i * oldBinWidth;
            const oldBinEnd = oldBinStart + oldBinWidth;
            const startBinFloat = (oldBinStart - globalMin) / globalBinWidth;
            const endBinFloat = (oldBinEnd - globalMin) / globalBinWidth;
            const startBin = Math.max(0, Math.floor(startBinFloat));
            const endBin = Math.min(maxBinCount - 1, Math.ceil(endBinFloat));

            if (startBin === endBin) {
              newFreq[startBin] += frequency;
            } else {
              for (let newBin = startBin; newBin <= endBin; newBin++) {
                const binStart = globalMin + newBin * globalBinWidth;
                const binEnd = binStart + globalBinWidth;
                const overlapStart = Math.max(oldBinStart, binStart);
                const overlapEnd = Math.min(oldBinEnd, binEnd);
                const overlapWidth = Math.max(0, overlapEnd - overlapStart);
                if (overlapWidth > 0) {
                  const proportion = overlapWidth / oldBinWidth;
                  newFreq[newBin] += frequency * proportion;
                }
              }
            }
          });

          const cleanedFreq = newFreq.map((f) =>
            Math.max(0, Math.round(f * 1e6) / 1e6),
          );

          return {
            ...stepData,
            histogramData: {
              freq: cleanedFreq,
              bins: {
                min: globalMin,
                max: globalMax,
                num: maxBinCount,
              },
              maxFreq: runMaxFreq, // Use run-specific max frequency
            },
          };
        }),
      };
    });

    const rangeBuffer = (globalMax - globalMin) * 0.1;

    return {
      globalMaxFreq: Math.max(
        ...normalized.map((run) =>
          Math.max(
            ...run.data.map((step) => Math.max(...step.histogramData.freq)),
          ),
        ),
      ), // Keep global max for reference
      xAxisRange: {
        min: globalMin - rangeBuffer,
        max: globalMax + rangeBuffer,
        globalMin,
        globalMax,
      },
      normalizedData: normalized,
    };
  }, [runs, histogramQueries, isLoading, hasError]);

  return { data: normalizedData, isLoading, hasError };
}
