import type { Counter, Gauge } from "prom-client";

import type { BboxClient } from "../bbox";

export type BboxMetricsClient = Pick<
  BboxClient,
  | "login"
  | "getIptv"
  | "getIptvDiags"
  | "getWanIP"
  | "getWanIPStats"
  | "getWanFtthStats"
  | "getWanDiags"
  | "getLanStats"
  | "getDevice"
  | "getDeviceCpu"
  | "getDeviceMemory"
  | "getServices"
  | "getHosts"
  | "getWireless"
  | "getWireless24"
  | "getWireless5"
  | "getWireless6"
  | "getWirelessStats"
  | "getDnsStats"
>;

export interface BboxExporterClientOptions {
  bbox?: BboxMetricsClient;
  collectionCacheMs?: number;
  endpointConcurrency?: number;
  logger?: Pick<Console, "error" | "warn">;
  scrapeTimeoutMs?: number;
}

export interface BboxEndpointCollector {
  collect: () => Promise<unknown>;
  name: string;
}

export interface BboxEndpointResult {
  error?: unknown;
  name: string;
  ok: boolean;
  value?: unknown;
}

export type BboxLogsClient = Pick<BboxClient, "getLogs" | "login">;

export interface BboxLokiLogForwarderOptions {
  bbox?: BboxLogsClient;
  labels?: Record<string, string>;
  logger?: Pick<Console, "error" | "warn">;
  metrics?: BboxLokiMetricsRecorder;
  pollIntervalMs?: number;
  pushUrl: string | URL;
  scrapeTimeoutMs?: number;
  tenantId?: string;
}

export interface BboxLokiMetricsRecorder {
  recordEndpointUp(endpoint: string, up: 0 | 1): void;
  recordLokiPollError(durationSeconds: number): void;
  recordLokiPollStart(): void;
  recordLokiPollSuccess(durationSeconds: number): void;
}

export interface LokiEntry {
  event: string;
  key: string;
  line: string;
  timestampNs: string;
}

export interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

export type GaugeName =
  | "up"
  | "endpointUp"
  | "collectDuration"
  | "lokiPollDuration"
  | "lokiPollInProgress"
  | "iptvChannel"
  | "iptvIgmpEnable"
  | "iptvIgmpState"
  | "iptvDiagnosticsInfo"
  | "wanFtthState"
  | "wanFtthInfo"
  | "wanInternetState"
  | "wanInterfaceState"
  | "wanTransmittedBytes"
  | "wanTransmittedPackets"
  | "wanTransmittedPacketsErrors"
  | "wanTransmittedPacketsDiscards"
  | "wanTransmittedLineOccupation"
  | "wanTransmittedBandwidth"
  | "wanTransmittedBandwidthMax"
  | "wanReceivedBytes"
  | "wanReceivedPackets"
  | "wanReceivedPacketsErrors"
  | "wanReceivedPacketsDiscards"
  | "wanReceivedLineOccupation"
  | "wanReceivedBandwidth"
  | "wanReceivedBandwidthMax"
  | "wanDiagnosticsMin"
  | "wanDiagnosticsMax"
  | "wanDiagnosticsAvg"
  | "wanDiagnosticsSuccess"
  | "wanDiagnosticsError"
  | "wanDiagnosticsTries"
  | "lanConnectedDevices"
  | "lanTransmittedBytes"
  | "lanTransmittedPackets"
  | "lanTransmittedPacketsErrors"
  | "lanTransmittedPacketsDiscards"
  | "lanReceivedBytes"
  | "lanReceivedPackets"
  | "lanReceivedPacketsErrors"
  | "lanReceivedPacketsDiscards"
  | "lanPortTransmittedBytes"
  | "lanPortTransmittedPackets"
  | "lanPortTransmittedBandwidth"
  | "lanPortReceivedBytes"
  | "lanPortReceivedPackets"
  | "lanPortReceivedBandwidth"
  | "hostInfo"
  | "hostActive"
  | "hostWirelessTransmittedUsage"
  | "hostWirelessReceivedUsage"
  | "hostWirelessEstimatedRate"
  | "hostWirelessRssi"
  | "hostWirelessMcs"
  | "hostWirelessRate"
  | "deviceModelName"
  | "deviceFaiUsage"
  | "deviceStatus"
  | "deviceNumberOfBoots"
  | "deviceTemperature"
  | "deviceMemory"
  | "deviceCpu"
  | "deviceProcess"
  | "wirelessTransmittedBytes"
  | "wirelessTransmittedPackets"
  | "wirelessTransmittedPacketsErrors"
  | "wirelessTransmittedPacketsDiscards"
  | "wirelessReceivedBytes"
  | "wirelessReceivedPackets"
  | "wirelessReceivedPacketsErrors"
  | "wirelessReceivedPacketsDiscards"
  | "wirelessRadioEnable"
  | "wirelessRadioState"
  | "wirelessRadioChannel"
  | "wirelessRadioCurrentChannel"
  | "wirelessRadioCurrentBandwidth"
  | "wirelessSsidEnable"
  | "wirelessSsidHidden"
  | "wirelessWpsEnable"
  | "wirelessWpsAvailable"
  | "wirelessSchedulerEnable"
  | "dnsNumberOfQueries"
  | "dnsMin"
  | "dnsMax"
  | "dnsAverage"
  | "serviceStatus";

export type GaugeMap = Record<GaugeName, Gauge<string>>;
export type CounterName = "collectErrors" | "lokiPollErrors";
export type CounterMap = Record<CounterName, Counter<string>>;
export type NumericLike = number | string;
export type Labels = Record<string, string>;
