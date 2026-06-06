# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
