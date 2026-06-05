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
```

`BBOX_RESOLVE_ADDRESS` is optional and works like `curl --resolve`: requests still target
`BBOX_URL`, but DNS for that hostname is overridden with the configured IP address.
`BBOX_TLS_INSECURE=true` is optional and works like `curl -k`.

## Docker Compose

Run the exporter with Prometheus:

```bash
docker compose up --build
```

Endpoints:

- Exporter: `http://localhost:9100/metrics`
- Prometheus: `http://localhost:9090`

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
