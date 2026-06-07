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
BBOX_LOGS_POLL_INTERVAL_MS=120000
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

The Bbox `/log` endpoint only returns the newest five entries. The exporter treats it as a tail source: by default it polls every two minutes and deduplicates entries already seen by the running process. Loki will build history from the moment the exporter is running, but events can still be missed if more than five Bbox log entries are created between polls.

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

## Metrics

This table lists every metric exported by `bbox-exporter`.

| Metric                                                | Labels                                                            | Description                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `bbox_up`                                             | -                                                                 | Whether the last Bbox metrics collection fully succeeded.      |
| `bbox_endpoint_up`                                    | `endpoint`                                                        | Whether the last scrape of a Bbox endpoint succeeded.          |
| `bbox_exporter_collect_duration_seconds`              | -                                                                 | Duration of the last Bbox metrics collection.                  |
| `bbox_exporter_loki_poll_duration_seconds`            | -                                                                 | Duration of the last Loki log poll.                            |
| `bbox_exporter_loki_poll_in_progress`                 | -                                                                 | Whether a Loki log poll is currently running.                  |
| `bbox_iptv_channel`                                   | `channel`                                                         | IPTV channel information with value always set to 1.           |
| `bbox_iptv_igmp_enable`                               | -                                                                 | IPTV IGMP enablement state.                                    |
| `bbox_iptv_igmp_state`                                | -                                                                 | IPTV IGMP state.                                               |
| `bbox_iptv_diagnostics_info`                          | `multicast_state`, `platform_state`                               | IPTV diagnostic information with value always set to 1.        |
| `bbox_wan_ftth_state`                                 | -                                                                 | Current Bbox FTTH usage state.                                 |
| `bbox_wan_ftth_info`                                  | `mode`, `state`                                                   | WAN FTTH information with value always set to 1.               |
| `bbox_wan_internet_state`                             | -                                                                 | Current WAN internet state reported by the Bbox.               |
| `bbox_wan_interface_state`                            | -                                                                 | Current WAN interface state reported by the Bbox.              |
| `bbox_wan_transmitted_bytes`                          | -                                                                 | Total WAN bytes transmitted by the Bbox.                       |
| `bbox_wan_transmitted_packets`                        | -                                                                 | Total WAN packets transmitted by the Bbox.                     |
| `bbox_wan_transmitted_packets_errors`                 | -                                                                 | Total WAN packet errors while transmitting.                    |
| `bbox_wan_transmitted_packets_discards`               | -                                                                 | Total WAN packet discards while transmitting.                  |
| `bbox_wan_transmitted_line_occupation`                | -                                                                 | Current transmitted WAN line occupation reported by the Bbox.  |
| `bbox_wan_transmitted_bandwidth_bits_per_second`      | -                                                                 | Current transmitted WAN bandwidth reported by the Bbox.        |
| `bbox_wan_transmitted_bandwidth_max_bits_per_second`  | -                                                                 | Maximum transmitted WAN bandwidth reported by the Bbox.        |
| `bbox_wan_received_bytes`                             | -                                                                 | Total WAN bytes received by the Bbox.                          |
| `bbox_wan_received_packets`                           | -                                                                 | Total WAN packets received by the Bbox.                        |
| `bbox_wan_received_packets_errors`                    | -                                                                 | Total WAN packet errors while receiving.                       |
| `bbox_wan_received_packets_discards`                  | -                                                                 | Total WAN packet discards while receiving.                     |
| `bbox_wan_received_line_occupation`                   | -                                                                 | Current received WAN line occupation reported by the Bbox.     |
| `bbox_wan_received_bandwidth_bits_per_second`         | -                                                                 | Current received WAN bandwidth reported by the Bbox.           |
| `bbox_wan_received_bandwidth_max_bits_per_second`     | -                                                                 | Maximum received WAN bandwidth reported by the Bbox.           |
| `bbox_wan_diagnostics_min`                            | `type`, `protocol`, `index`                                       | Minimum WAN diagnostic latency by diagnostic type.             |
| `bbox_wan_diagnostics_max`                            | `type`, `protocol`, `index`                                       | Maximum WAN diagnostic latency by diagnostic type.             |
| `bbox_wan_diagnostics_avg`                            | `type`, `protocol`, `index`                                       | Average WAN diagnostic latency by diagnostic type.             |
| `bbox_wan_diagnostics_success`                        | `type`, `protocol`, `index`                                       | Successful WAN diagnostic tries by diagnostic type.            |
| `bbox_wan_diagnostics_error`                          | `type`, `protocol`, `index`                                       | Failed WAN diagnostic tries by diagnostic type.                |
| `bbox_wan_diagnostics_tries`                          | `type`, `protocol`, `index`                                       | Total WAN diagnostic tries by diagnostic type.                 |
| `bbox_lan_connected_devices`                          | -                                                                 | Number of active devices reported by the Bbox.                 |
| `bbox_lan_transmitted_bytes`                          | -                                                                 | Total LAN bytes transmitted by the Bbox.                       |
| `bbox_lan_transmitted_packets`                        | -                                                                 | Total LAN packets transmitted by the Bbox.                     |
| `bbox_lan_transmitted_packets_errors`                 | -                                                                 | Total LAN packet errors while transmitting.                    |
| `bbox_lan_transmitted_packets_discards`               | -                                                                 | Total LAN packet discards while transmitting.                  |
| `bbox_lan_received_bytes`                             | -                                                                 | Total LAN bytes received by the Bbox.                          |
| `bbox_lan_received_packets`                           | -                                                                 | Total LAN packets received by the Bbox.                        |
| `bbox_lan_received_packets_errors`                    | -                                                                 | Total LAN packet errors while receiving.                       |
| `bbox_lan_received_packets_discards`                  | -                                                                 | Total LAN packet discards while receiving.                     |
| `bbox_lan_port_transmitted_bytes`                     | `port`                                                            | Total LAN bytes transmitted by a Bbox switch port.             |
| `bbox_lan_port_transmitted_packets`                   | `port`                                                            | Total LAN packets transmitted by a Bbox switch port.           |
| `bbox_lan_port_transmitted_bandwidth_bits_per_second` | `port`                                                            | Current transmitted bandwidth reported for a Bbox switch port. |
| `bbox_lan_port_received_bytes`                        | `port`                                                            | Total LAN bytes received by a Bbox switch port.                |
| `bbox_lan_port_received_packets`                      | `port`                                                            | Total LAN packets received by a Bbox switch port.              |
| `bbox_lan_port_received_bandwidth_bits_per_second`    | `port`                                                            | Current received bandwidth reported for a Bbox switch port.    |
| `bbox_host_info`                                      | `id`, `hostname`, `macaddress`, `ipaddress`, `link`, `devicetype` | Known Bbox host information with value always set to 1.        |
| `bbox_host_active`                                    | `id`, `hostname`, `macaddress`, `ipaddress`, `link`, `devicetype` | Whether a known Bbox host is currently active.                 |
| `bbox_host_wireless_transmitted_usage`                | `id`, `hostname`, `macaddress`, `band`                            | Wireless transmitted usage reported for a Bbox host.           |
| `bbox_host_wireless_received_usage`                   | `id`, `hostname`, `macaddress`, `band`                            | Wireless received usage reported for a Bbox host.              |
| `bbox_host_wireless_estimated_rate`                   | `id`, `hostname`, `macaddress`, `band`                            | Wireless estimated rate reported for a Bbox host.              |
| `bbox_host_wireless_rssi`                             | `id`, `hostname`, `macaddress`, `band`                            | Wireless RSSI reported for a Bbox host.                        |
| `bbox_host_wireless_mcs`                              | `id`, `hostname`, `macaddress`, `band`                            | Wireless MCS reported for a Bbox host.                         |
| `bbox_host_wireless_rate`                             | `id`, `hostname`, `macaddress`, `band`                            | Wireless rate reported for a Bbox host.                        |
| `bbox_device_model_name`                              | `model_name`, `model_class`                                       | Bbox model information with value always set to 1.             |
| `bbox_device_fai_usage`                               | `technology`                                                      | Bbox access technology usage state.                            |
| `bbox_device_status`                                  | -                                                                 | Current Bbox device status.                                    |
| `bbox_device_number_of_boots`                         | -                                                                 | Total number of Bbox device boots.                             |
| `bbox_device_temperature`                             | `sensor`                                                          | Bbox device temperature by sensor.                             |
| `bbox_device_memory`                                  | `kind`                                                            | Bbox device memory by kind.                                    |
| `bbox_device_cpu`                                     | `mode`                                                            | Bbox device CPU time by mode.                                  |
| `bbox_device_process`                                 | `state`                                                           | Bbox device process count by state.                            |
| `bbox_wireless_transmitted_bytes`                     | `band`, `ssid`                                                    | Total wireless bytes transmitted by the Bbox.                  |
| `bbox_wireless_transmitted_packets`                   | `band`, `ssid`                                                    | Total wireless packets transmitted by the Bbox.                |
| `bbox_wireless_transmitted_packets_errors`            | `band`, `ssid`                                                    | Total wireless packet errors while transmitting.               |
| `bbox_wireless_transmitted_packets_discards`          | `band`, `ssid`                                                    | Total wireless packet discards while transmitting.             |
| `bbox_wireless_received_bytes`                        | `band`, `ssid`                                                    | Total wireless bytes received by the Bbox.                     |
| `bbox_wireless_received_packets`                      | `band`, `ssid`                                                    | Total wireless packets received by the Bbox.                   |
| `bbox_wireless_received_packets_errors`               | `band`, `ssid`                                                    | Total wireless packet errors while receiving.                  |
| `bbox_wireless_received_packets_discards`             | `band`, `ssid`                                                    | Total wireless packet discards while receiving.                |
| `bbox_wireless_radio_enable`                          | `band`                                                            | Wireless radio enablement state by band.                       |
| `bbox_wireless_radio_state`                           | `band`                                                            | Wireless radio state by band.                                  |
| `bbox_wireless_radio_channel`                         | `band`                                                            | Configured wireless radio channel by band.                     |
| `bbox_wireless_radio_current_channel`                 | `band`                                                            | Current wireless radio channel by band.                        |
| `bbox_wireless_radio_current_bandwidth`               | `band`                                                            | Current wireless radio bandwidth by band.                      |
| `bbox_wireless_ssid_enable`                           | `band`                                                            | Wireless SSID enablement state by band.                        |
| `bbox_wireless_ssid_hidden`                           | `band`                                                            | Wireless SSID hidden state by band.                            |
| `bbox_wireless_wps_enable`                            | `band`                                                            | Wireless WPS enablement state by band.                         |
| `bbox_wireless_wps_available`                         | `band`                                                            | Wireless WPS availability by band.                             |
| `bbox_wireless_scheduler_enable`                      | `band`                                                            | Wireless scheduler enablement state by band.                   |
| `bbox_dns_number_of_queries`                          | -                                                                 | Total number of DNS queries reported by the Bbox.              |
| `bbox_dns_min`                                        | -                                                                 | Minimum DNS response time reported by the Bbox.                |
| `bbox_dns_max`                                        | -                                                                 | Maximum DNS response time reported by the Bbox.                |
| `bbox_dns_average`                                    | -                                                                 | Average DNS response time reported by the Bbox.                |
| `bbox_service_status`                                 | `service`                                                         | Current Bbox service status or enablement value.               |
| `bbox_exporter_collect_errors_total`                  | -                                                                 | Total number of Bbox metrics collections with errors.          |
| `bbox_exporter_loki_poll_errors_total`                | -                                                                 | Total number of Bbox Loki log polls with errors.               |

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
