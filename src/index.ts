/// <reference types="bun" />

import "dotenv/config";
import { BboxExporterClient } from "./exporter/client";
import { parseMetricsPath, parseScrapeTimeoutMs, parseTelemetryAddress } from "./exporter/config";

const exporter = new BboxExporterClient({
  scrapeTimeoutMs: parseScrapeTimeoutMs(process.env.BBOX_SCRAPE_TIMEOUT_MS),
});
const telemetryAddress = parseTelemetryAddress(process.env.TELEMETRY_ADDRESS);
const metricsPath = parseMetricsPath(process.env.METRICS_PATH);

const server = Bun.serve({
  hostname: telemetryAddress.hostname,
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
