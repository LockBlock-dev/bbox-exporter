# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2026-06-21

### Added

- Added the GNU Affero General Public License and package license metadata.

### Changed

- Docker Compose now uses the published `ghcr.io/lockblock-dev/bbox-exporter:latest` image by default.

### Fixed

- Reduced router-outage log noise by aggregating endpoint failures, suppressing repeated metrics and Loki errors until recovery, and omitting stack traces from compact error messages.

## [1.4.0] - 2026-06-07

### Added

- Added cached, background metrics collection so `/metrics` can return promptly while Bbox API refreshes run asynchronously.
- Added per-endpoint Bbox health with `bbox_endpoint_up`.
- Added exporter self-metrics for collection duration, collection errors, Loki poll duration, Loki poll errors, and Loki poll in-progress state.
- Added full metric documentation to the README.

### Changed

- Metrics collection now uses bounded per-endpoint collection instead of one all-or-nothing `Promise.all` batch.
- Loki log forwarding now uses a separate Bbox client from metrics collection.
- Loki log polling now skips overlapping polls and defaults to a conservative two-minute interval.
- Bun's HTTP idle timeout now tracks the configured Bbox scrape timeout to avoid closing slow `/metrics` responses early.

### Fixed

- Prevented a single failed Bbox endpoint from failing the entire metrics refresh.
- Reduced the chance that slow Bbox API responses cause intermittent Prometheus EOF scrape failures.
- Ensured Loki log polling failures do not affect `/metrics` availability.

## [1.3.0] - 2026-06-06

### Added

- Added optional Bbox device log forwarding to Loki with `LOKI_PUSH_URL`.
- Added `BBOX_LOGS_POLL_INTERVAL_MS`, `LOKI_LABELS`, and `LOKI_TENANT_ID` configuration.
- Added in-memory deduplication for the Bbox log endpoint's repeated latest entries.

## [1.2.0] - 2026-06-05

### Added

- `NODE_TLS_REJECT_UNAUTHORIZED` when `BBOX_TLS_INSECURE` is enabled.
- Docker Compose `extra_hosts`

## [1.1.0] - 2026-06-05

### Added

- Added optional Bbox hostname resolution override with `BBOX_RESOLVE_ADDRESS` or `BBOX_RESOLVE_IP`, matching curl's `--resolve` behavior.
- Added optional insecure TLS mode with `BBOX_TLS_INSECURE`, matching curl's `-k` behavior.

### Changed

- Updated Bbox HTTP client setup to pass an Undici dispatcher through `http-lib`

## [1.0.0] - 2026-06-05

### Added

- Initial release
