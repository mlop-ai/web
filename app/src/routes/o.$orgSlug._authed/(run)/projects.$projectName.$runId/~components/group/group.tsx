import { DropdownRegion } from "@/components/core/runs/dropdown-region/dropdown-region";
import type { LogGroup } from "@/lib/grouping/types";
import { useState } from "react";
import { useCallback } from "react";
import { useChartSync } from "@/components/charts/hooks/use-chart-sync";
import ReactECharts from "echarts-for-react";
import { LineChartWithFetch } from "./line-chart";
import { ImagesView } from "./images";
import { AudioView } from "./audio";
import { HistogramView } from "./histogram-view";
import { VideoView } from "./video";

interface DataGroupProps {
  group: LogGroup;
  tenantId: string;
  projectName: string;
  runId: string;
}

export const DataGroup = ({
  group,
  tenantId,
  projectName,
  runId,
}: DataGroupProps) => {
  const groupId = `metrics-${group.groupName}`;
  const [loadedCharts, setLoadedCharts] = useState(0);
  const { setChartRef } = useChartSync(groupId, loadedCharts);

  const handleChartLoad = useCallback(() => {
    setLoadedCharts((prev) => prev + 1);
  }, []);

  const children = group.logs.map((log, index) => (
    <LogView
      key={log.id}
      log={log}
      setChartRef={setChartRef}
      index={index}
      onLoad={handleChartLoad}
      tenantId={tenantId}
      projectName={projectName}
      runId={runId}
    />
  ));

  return (
    <DropdownRegion
      title={group.groupName}
      components={children}
      groupId={groupId}
    />
  );
};

interface LogViewProps {
  log: LogGroup["logs"][number];
  setChartRef: (index: number) => (ref: ReactECharts | null) => void;
  index: number;
  onLoad: () => void;
  tenantId: string;
  projectName: string;
  runId: string;
}

const LogView = ({
  log,
  setChartRef,
  index,
  onLoad,
  tenantId,
  projectName,
  runId,
}: LogViewProps) => {
  if (log.logType === "METRIC") {
    return (
      <LineChartWithFetch
        logName={log.logName}
        tenantId={tenantId}
        projectName={projectName}
        runId={runId}
        setChartRef={setChartRef}
        index={index}
        onLoad={onLoad}
      />
    );
  }

  if (log.logType === "IMAGE") {
    return (
      <ImagesView
        log={log}
        tenantId={tenantId}
        projectName={projectName}
        runId={runId}
      />
    );
  }

  if (log.logType === "AUDIO") {
    return (
      <AudioView
        log={log}
        tenantId={tenantId}
        projectName={projectName}
        runId={runId}
      />
    );
  }

  if (log.logType === "HISTOGRAM") {
    return (
      <HistogramView
        logName={log.logName}
        tenantId={tenantId}
        projectName={projectName}
        runId={runId}
      />
    );
  }

  if (log.logType === "VIDEO") {
    return (
      <VideoView
        log={log}
        tenantId={tenantId}
        projectName={projectName}
        runId={runId}
      />
    );
  }

  return (
    <div>
      {log.logName} | {log.logType}
    </div>
  );
};
