import { useEffect, useRef, useCallback, useState } from "react";
import type ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

interface ChartSyncHookResult {
  setChartRef: (index: number) => (ref: ReactECharts | null) => void;
}

export const useChartSync = (
  groupId: string,
  loadedCharts?: number,
): ChartSyncHookResult => {
  const chartRefs = useRef<ReactECharts[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const setChartRef = useCallback(
    (index: number) => (ref: ReactECharts | null) => {
      if (ref) {
        chartRefs.current[index] = ref;
        const chart = ref.getEchartsInstance();
        if (chart) {
          chart.group = groupId;
        }
      } else {
        delete chartRefs.current[index];
      }
    },
    [groupId],
  );

  useEffect(() => {
    const instances = chartRefs.current
      .map((ref) => {
        try {
          return ref?.getEchartsInstance();
        } catch (e) {
          console.warn("Failed to get LineChart instance", e);
          return null;
        }
      })
      .filter(Boolean);

    if (instances.length > 0) {
      try {
        if (isConnected) {
          echarts.disconnect(groupId);
        }
      } catch {} // Ignore disconnection errors

      instances.forEach((chart) => {
        if (chart) chart.group = groupId;
      });

      echarts.connect(groupId);
      setIsConnected(true);
    }

    return () => {
      try {
        echarts.disconnect(groupId);
        setIsConnected(false);
      } catch (e) {
        console.warn("Failed to disconnect charts", e);
      }
    };
  }, [groupId, loadedCharts, isConnected]);

  return { setChartRef };
};
