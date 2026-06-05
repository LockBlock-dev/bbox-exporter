import { DEFAULT_METRICS_PATH, DEFAULT_SCRAPE_TIMEOUT_MS, DEFAULT_TELEMETRY_ADDRESS } from "./constants";

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
