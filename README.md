# bbox-exporter

Prometheus exporter for Bouygues Telecom Bbox routers.

## Configuration

Copy `.env.example` to `.env` and set at least:

```env
BBOX_PASSWORD=your-admin-password
```

Optional variables:

```env
BBOX_URL=https://mabbox.bytel.fr
BBOX_RESOLVE_ADDRESS=192.168.1.254
BBOX_TLS_INSECURE=true
TELEMETRY_ADDRESS=0.0.0.0:9100
METRICS_PATH=/metrics
BBOX_SCRAPE_TIMEOUT_MS=30000
BBOX_LOGS_POLL_INTERVAL_MS=5000
LOKI_PUSH_URL=
LOKI_LABELS=job=bbox-exporter,source=bbox
LOKI_TENANT_ID=
```

`BBOX_RESOLVE_ADDRESS` is optional and works like `curl --resolve`: requests still target
`BBOX_URL`, but DNS for that hostname is overridden with the configured IP address. With Bun in
Docker, the Compose file maps `mabbox.bytel.fr` through `extra_hosts` because custom Undici DNS
resolution is not consistently applied.
`BBOX_TLS_INSECURE=true` is only useful with an HTTPS `BBOX_URL` and works like `curl -k`.

When `LOKI_PUSH_URL` is set, the exporter polls the Bbox `/api/v1/device/log` endpoint and pushes new entries to Loki. `LOKI_PUSH_URL` can be either the full push endpoint or a base Loki URL such as `http://localhost:3100`, in which case `/loki/api/v1/push` is appended. From Docker, use a URL that is reachable from the exporter container, for example `http://loki:3100/loki/api/v1/push` when the exporter is attached to the same Docker network as a Loki service named `loki`. `LOKI_LABELS` is a comma-separated list of Loki labels. The exporter also adds an `event` label from the Bbox log type, for example `DEVICE_UP`.

The Bbox `/log` endpoint only returns the newest five entries. The exporter treats it as a tail source: it polls frequently and deduplicates entries already seen by the running process. Loki will build history from the moment the exporter is running, but events can still be missed if more than five Bbox log entries are created between polls.

## Docker Compose

Run the exporter with Prometheus:

```bash
docker compose up --build
```

Endpoints:

- Exporter: `http://localhost:9100/metrics`
- Prometheus: `http://localhost:9090`

In Grafana, add your existing Loki data source. A useful Explore query is:

```logql
{job="bbox-exporter", source="bbox"} | json
```

## Grafana Dashboard

An example Grafana dashboard is available here [`grafana/dashboard.json`](grafana/dashboard.json).

Import it from Grafana with **Dashboards > New > Import**, then select your Prometheus data source
when prompted. The dashboard includes panels for WAN/LAN bandwidth, DNS and WAN diagnostics, device
temperature, access technology state, connected devices, CPU, memory, and Bbox model information.

## Local Development

```bash
bun install
bun src/index.ts
```

Useful checks:

```bash
bun run lint
bun run format
```
