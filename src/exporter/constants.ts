export const BBOX_BANDWIDTH_KILOBITS = 1000;
export const DEFAULT_BBOX_LOGS_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_LOKI_LABELS = {
  job: "bbox-exporter",
  source: "bbox",
} as const;
export const DEFAULT_METRICS_PATH = "/metrics";
export const DEFAULT_SCRAPE_TIMEOUT_MS = 30_000;
export const DEFAULT_TELEMETRY_ADDRESS = "0.0.0.0:9100";
