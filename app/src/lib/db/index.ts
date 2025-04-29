import type { MetricData } from "@/routes/o.$orgSlug._authed/(run)/projects.$projectName.$runId/~components/group/line-chart";
import { LocalCache } from "./local-cache";

const MAX_DB_SIZE = 1024 * 1024 * 1024; // 1GB in bytes

export const metricsCache = new LocalCache<MetricData>(
  "metricsDB",
  "metrics",
  MAX_DB_SIZE,
);
