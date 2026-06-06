import {
  DEFAULT_BBOX_LOGS_POLL_INTERVAL_MS,
  DEFAULT_LOKI_LABELS,
  DEFAULT_METRICS_PATH,
  DEFAULT_SCRAPE_TIMEOUT_MS,
  DEFAULT_TELEMETRY_ADDRESS,
} from "./constants";

export function parseTelemetryAddress(address = DEFAULT_TELEMETRY_ADDRESS) {
  const separator = address.lastIndexOf(":");
  if (separator < 0) throw new Error(`Invalid TELEMETRY_ADDRESS environment variable: ${address}`);

  const hostname = address.slice(0, separator) || "0.0.0.0";
  const port = Number(address.slice(separator + 1));

  if (!Number.isInteger(port) || port <= 0 || port > 65535)
    throw new Error(`Invalid TELEMETRY_ADDRESS port: ${address}`);

  return { hostname, port };
}

export function parseMetricsPath(path = DEFAULT_METRICS_PATH) {
  if (!path.startsWith("/") || path.includes("?") || path.includes("#"))
    throw new Error(`Invalid METRICS_PATH environment variable: ${path}`);

  return path;
}

export function parseScrapeTimeoutMs(timeout = String(DEFAULT_SCRAPE_TIMEOUT_MS)) {
  const milliseconds = Number(timeout);

  if (!Number.isInteger(milliseconds) || milliseconds <= 0)
    throw new Error(`Invalid BBOX_SCRAPE_TIMEOUT_MS environment variable: ${timeout}`);

  return milliseconds;
}

export function parseLogsPollIntervalMs(interval = String(DEFAULT_BBOX_LOGS_POLL_INTERVAL_MS)) {
  const milliseconds = Number(interval);

  if (!Number.isInteger(milliseconds) || milliseconds <= 0)
    throw new Error(`Invalid BBOX_LOGS_POLL_INTERVAL_MS environment variable: ${interval}`);

  return milliseconds;
}

export function parseLokiPushUrl(url: string | undefined) {
  if (!url) return undefined;

  const pushUrl = new URL(url);

  if (pushUrl.protocol !== "http:" && pushUrl.protocol !== "https:")
    throw new Error(`Invalid LOKI_PUSH_URL protocol: ${url}`);

  if (pushUrl.pathname === "/" || pushUrl.pathname === "") {
    pushUrl.pathname = "/loki/api/v1/push";
  }

  return pushUrl;
}

export function parseLokiTenantId(tenantId: string | undefined) {
  return tenantId || undefined;
}

export function parseLokiLabels(labels: string | undefined) {
  const parsedLabels: Record<string, string> = { ...DEFAULT_LOKI_LABELS };
  if (!labels) return parsedLabels;

  for (const label of labels.split(",")) {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) continue;

    const separator = trimmedLabel.indexOf("=");
    if (separator <= 0) throw new Error(`Invalid LOKI_LABELS entry: ${trimmedLabel}`);

    const key = trimmedLabel.slice(0, separator).trim();
    const value = trimmedLabel.slice(separator + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
      throw new Error(`Invalid LOKI_LABELS label name: ${key}`);
    if (!value) throw new Error(`Invalid LOKI_LABELS value for ${key}`);

    parsedLabels[key] = value;
  }

  return parsedLabels;
}
