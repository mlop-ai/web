import type { RunLogType } from "./types";

export const LOG_GROUP_MAPPING: Record<RunLogType, string> = {
  METRIC: "metrics",
  AUDIO: "media",
  IMAGE: "media",
  VIDEO: "media",
  FILE: "files",
  TEXT: "files",
  ARTIFACT: "files",
  HISTOGRAM: "histogram",
  TABLE: "table",
  DATA: "data",
};

export const LOG_GROUP_INDEX: Record<string, number> = {
  metrics: 0,
  media: 1,
  other: -5,
  files: -4,
  sys: -1,
  audio: -3,
  image: -2,
} as const;
