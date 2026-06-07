/// <reference types="bun" />

import "dotenv/config";
import { BboxClient } from "./bbox";
import { BboxExporterClient } from "./exporter/client";
import {
  parseLogsPollIntervalMs,
  parseLokiLabels,
  parseLokiPushUrl,
  parseLokiTenantId,
  parseMetricsPath,
  parseScrapeTimeoutMs,
  parseTelemetryAddress,
} from "./exporter/config";
import { BboxLokiLogForwarder } from "./exporter/loki";

const metricsBbox = new BboxClient();
const scrapeTimeoutMs = parseScrapeTimeoutMs(process.env.BBOX_SCRAPE_TIMEOUT_MS);
const exporter = new BboxExporterClient({
  bbox: metricsBbox,
  scrapeTimeoutMs,
});
const telemetryAddress = parseTelemetryAddress(process.env.TELEMETRY_ADDRESS);
const metricsPath = parseMetricsPath(process.env.METRICS_PATH);
const lokiPushUrl = parseLokiPushUrl(process.env.LOKI_PUSH_URL);

if (lokiPushUrl) {
  const lokiBbox = new BboxClient();
  const logForwarder = new BboxLokiLogForwarder({
    bbox: lokiBbox,
    labels: parseLokiLabels(process.env.LOKI_LABELS),
    metrics: exporter,
    pollIntervalMs: parseLogsPollIntervalMs(process.env.BBOX_LOGS_POLL_INTERVAL_MS),
    pushUrl: lokiPushUrl,
    scrapeTimeoutMs,
    tenantId: parseLokiTenantId(process.env.LOKI_TENANT_ID),
  });

  logForwarder.start();
  console.log(`Bbox logs forwarding to Loki at ${lokiPushUrl.toString()}`);
}

const server = Bun.serve({
  hostname: telemetryAddress.hostname,
  idleTimeout: Math.ceil((scrapeTimeoutMs + 5_000) / 1000),
  port: telemetryAddress.port,
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === metricsPath) {
      try {
        return new Response(await exporter.metrics(), {
          headers: {
            "Content-Type": exporter.contentType,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown metrics error";

        return new Response(`${message}\n`, {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }
    }

    if (url.pathname === "/-/healthy") {
      return new Response("ok\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    if (url.pathname === "/") {
      return new Response(
        [
          "<!doctype html>",
          "<html>",
          "<head><title>Bbox Exporter</title></head>",
          "<body>",
          "<h1>Bbox Exporter</h1>",
          `<p><a href="${metricsPath}">Metrics</a></p>`,
          "</body>",
          "</html>",
        ].join(""),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      );
    }

    return new Response("not found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  },
});

console.log(`Bbox exporter listening on ${server.hostname}:${server.port}${metricsPath}`);
