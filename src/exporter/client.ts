import "dotenv/config";
import { Gauge, Registry } from "prom-client";

import {
  BboxClient,
  type BboxApiObject,
  type BboxDiagnosticStats,
  type BboxNetworkStats,
} from "../bbox";
import { BBOX_BANDWIDTH_KILOBITS, DEFAULT_SCRAPE_TIMEOUT_MS } from "./constants";
import type { GaugeMap, GaugeName, Labels, NumericLike } from "./types";

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
  logger?: Pick<Console, "error" | "warn">;
  scrapeTimeoutMs?: number;
}

export class BboxExporterClient {
  public readonly registry = new Registry();

  private readonly bbox: BboxMetricsClient;
  private readonly collectionCacheMs: number;
  private readonly gauges: GaugeMap;
  private readonly logger: Pick<Console, "error" | "warn">;
  private readonly scrapeTimeoutMs: number;
  private collection?: Promise<void>;
  private login?: Promise<void>;

  /**
   * Creates a Prometheus exporter for Bbox metrics.
   */
  constructor(options: BboxExporterClientOptions = {}) {
    this.bbox = options.bbox ?? new BboxClient();
    this.collectionCacheMs = options.collectionCacheMs ?? 1000;
    this.logger = options.logger ?? console;
    this.scrapeTimeoutMs = options.scrapeTimeoutMs ?? DEFAULT_SCRAPE_TIMEOUT_MS;
    this.gauges = {
      up: this.gauge("bbox_up", "Whether the last Bbox scrape succeeded."),

      iptvChannel: this.gauge(
        "bbox_iptv_channel",
        "IPTV channel information with value always set to 1.",
        ["channel"],
      ),
      iptvIgmpEnable: this.gauge("bbox_iptv_igmp_enable", "IPTV IGMP enablement state."),
      iptvIgmpState: this.gauge("bbox_iptv_igmp_state", "IPTV IGMP state."),
      iptvDiagnosticsInfo: this.gauge(
        "bbox_iptv_diagnostics_info",
        "IPTV diagnostic information with value always set to 1.",
        ["multicast_state", "platform_state"],
      ),

      wanFtthState: this.gauge("bbox_wan_ftth_state", "Current Bbox FTTH usage state."),
      wanFtthInfo: this.gauge(
        "bbox_wan_ftth_info",
        "WAN FTTH information with value always set to 1.",
        ["mode", "state"],
      ),
      wanInternetState: this.gauge(
        "bbox_wan_internet_state",
        "Current WAN internet state reported by the Bbox.",
      ),
      wanInterfaceState: this.gauge(
        "bbox_wan_interface_state",
        "Current WAN interface state reported by the Bbox.",
      ),
      wanTransmittedBytes: this.gauge(
        "bbox_wan_transmitted_bytes",
        "Total WAN bytes transmitted by the Bbox.",
      ),
      wanTransmittedPackets: this.gauge(
        "bbox_wan_transmitted_packets",
        "Total WAN packets transmitted by the Bbox.",
      ),
      wanTransmittedPacketsErrors: this.gauge(
        "bbox_wan_transmitted_packets_errors",
        "Total WAN packet errors while transmitting.",
      ),
      wanTransmittedPacketsDiscards: this.gauge(
        "bbox_wan_transmitted_packets_discards",
        "Total WAN packet discards while transmitting.",
      ),
      wanTransmittedLineOccupation: this.gauge(
        "bbox_wan_transmitted_line_occupation",
        "Current transmitted WAN line occupation reported by the Bbox.",
      ),
      wanTransmittedBandwidth: this.gauge(
        "bbox_wan_transmitted_bandwidth_bits_per_second",
        "Current transmitted WAN bandwidth reported by the Bbox.",
      ),
      wanTransmittedBandwidthMax: this.gauge(
        "bbox_wan_transmitted_bandwidth_max_bits_per_second",
        "Maximum transmitted WAN bandwidth reported by the Bbox.",
      ),
      wanReceivedBytes: this.gauge(
        "bbox_wan_received_bytes",
        "Total WAN bytes received by the Bbox.",
      ),
      wanReceivedPackets: this.gauge(
        "bbox_wan_received_packets",
        "Total WAN packets received by the Bbox.",
      ),
      wanReceivedPacketsErrors: this.gauge(
        "bbox_wan_received_packets_errors",
        "Total WAN packet errors while receiving.",
      ),
      wanReceivedPacketsDiscards: this.gauge(
        "bbox_wan_received_packets_discards",
        "Total WAN packet discards while receiving.",
      ),
      wanReceivedLineOccupation: this.gauge(
        "bbox_wan_received_line_occupation",
        "Current received WAN line occupation reported by the Bbox.",
      ),
      wanReceivedBandwidth: this.gauge(
        "bbox_wan_received_bandwidth_bits_per_second",
        "Current received WAN bandwidth reported by the Bbox.",
      ),
      wanReceivedBandwidthMax: this.gauge(
        "bbox_wan_received_bandwidth_max_bits_per_second",
        "Maximum received WAN bandwidth reported by the Bbox.",
      ),
      wanDiagnosticsMin: this.gauge(
        "bbox_wan_diagnostics_min",
        "Minimum WAN diagnostic latency by diagnostic type.",
        ["type", "protocol", "index"],
      ),
      wanDiagnosticsMax: this.gauge(
        "bbox_wan_diagnostics_max",
        "Maximum WAN diagnostic latency by diagnostic type.",
        ["type", "protocol", "index"],
      ),
      wanDiagnosticsAvg: this.gauge(
        "bbox_wan_diagnostics_avg",
        "Average WAN diagnostic latency by diagnostic type.",
        ["type", "protocol", "index"],
      ),
      wanDiagnosticsSuccess: this.gauge(
        "bbox_wan_diagnostics_success",
        "Successful WAN diagnostic tries by diagnostic type.",
        ["type", "protocol", "index"],
      ),
      wanDiagnosticsError: this.gauge(
        "bbox_wan_diagnostics_error",
        "Failed WAN diagnostic tries by diagnostic type.",
        ["type", "protocol", "index"],
      ),
      wanDiagnosticsTries: this.gauge(
        "bbox_wan_diagnostics_tries",
        "Total WAN diagnostic tries by diagnostic type.",
        ["type", "protocol", "index"],
      ),

      lanConnectedDevices: this.gauge(
        "bbox_lan_connected_devices",
        "Number of active devices reported by the Bbox.",
      ),
      lanTransmittedBytes: this.gauge(
        "bbox_lan_transmitted_bytes",
        "Total LAN bytes transmitted by the Bbox.",
      ),
      lanTransmittedPackets: this.gauge(
        "bbox_lan_transmitted_packets",
        "Total LAN packets transmitted by the Bbox.",
      ),
      lanTransmittedPacketsErrors: this.gauge(
        "bbox_lan_transmitted_packets_errors",
        "Total LAN packet errors while transmitting.",
      ),
      lanTransmittedPacketsDiscards: this.gauge(
        "bbox_lan_transmitted_packets_discards",
        "Total LAN packet discards while transmitting.",
      ),
      lanReceivedBytes: this.gauge(
        "bbox_lan_received_bytes",
        "Total LAN bytes received by the Bbox.",
      ),
      lanReceivedPackets: this.gauge(
        "bbox_lan_received_packets",
        "Total LAN packets received by the Bbox.",
      ),
      lanReceivedPacketsErrors: this.gauge(
        "bbox_lan_received_packets_errors",
        "Total LAN packet errors while receiving.",
      ),
      lanReceivedPacketsDiscards: this.gauge(
        "bbox_lan_received_packets_discards",
        "Total LAN packet discards while receiving.",
      ),
      lanPortTransmittedBytes: this.gauge(
        "bbox_lan_port_transmitted_bytes",
        "Total LAN bytes transmitted by a Bbox switch port.",
        ["port"],
      ),
      lanPortTransmittedPackets: this.gauge(
        "bbox_lan_port_transmitted_packets",
        "Total LAN packets transmitted by a Bbox switch port.",
        ["port"],
      ),
      lanPortTransmittedBandwidth: this.gauge(
        "bbox_lan_port_transmitted_bandwidth_bits_per_second",
        "Current transmitted bandwidth reported for a Bbox switch port.",
        ["port"],
      ),
      lanPortReceivedBytes: this.gauge(
        "bbox_lan_port_received_bytes",
        "Total LAN bytes received by a Bbox switch port.",
        ["port"],
      ),
      lanPortReceivedPackets: this.gauge(
        "bbox_lan_port_received_packets",
        "Total LAN packets received by a Bbox switch port.",
        ["port"],
      ),
      lanPortReceivedBandwidth: this.gauge(
        "bbox_lan_port_received_bandwidth_bits_per_second",
        "Current received bandwidth reported for a Bbox switch port.",
        ["port"],
      ),

      hostInfo: this.gauge(
        "bbox_host_info",
        "Known Bbox host information with value always set to 1.",
        ["id", "hostname", "macaddress", "ipaddress", "link", "devicetype"],
      ),
      hostActive: this.gauge("bbox_host_active", "Whether a known Bbox host is currently active.", [
        "id",
        "hostname",
        "macaddress",
        "ipaddress",
        "link",
        "devicetype",
      ]),
      hostWirelessTransmittedUsage: this.gauge(
        "bbox_host_wireless_transmitted_usage",
        "Wireless transmitted usage reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),
      hostWirelessReceivedUsage: this.gauge(
        "bbox_host_wireless_received_usage",
        "Wireless received usage reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),
      hostWirelessEstimatedRate: this.gauge(
        "bbox_host_wireless_estimated_rate",
        "Wireless estimated rate reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),
      hostWirelessRssi: this.gauge(
        "bbox_host_wireless_rssi",
        "Wireless RSSI reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),
      hostWirelessMcs: this.gauge(
        "bbox_host_wireless_mcs",
        "Wireless MCS reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),
      hostWirelessRate: this.gauge(
        "bbox_host_wireless_rate",
        "Wireless rate reported for a Bbox host.",
        ["id", "hostname", "macaddress", "band"],
      ),

      deviceModelName: this.gauge(
        "bbox_device_model_name",
        "Bbox model information with value always set to 1.",
        ["model_name", "model_class"],
      ),
      deviceFaiUsage: this.gauge("bbox_device_fai_usage", "Bbox access technology usage state.", [
        "technology",
      ]),
      deviceStatus: this.gauge("bbox_device_status", "Current Bbox device status."),
      deviceNumberOfBoots: this.gauge(
        "bbox_device_number_of_boots",
        "Total number of Bbox device boots.",
      ),
      deviceTemperature: this.gauge(
        "bbox_device_temperature",
        "Bbox device temperature by sensor.",
        ["sensor"],
      ),
      deviceMemory: this.gauge("bbox_device_memory", "Bbox device memory by kind.", ["kind"]),
      deviceCpu: this.gauge("bbox_device_cpu", "Bbox device CPU time by mode.", ["mode"]),
      deviceProcess: this.gauge("bbox_device_process", "Bbox device process count by state.", [
        "state",
      ]),

      wirelessTransmittedBytes: this.gauge(
        "bbox_wireless_transmitted_bytes",
        "Total wireless bytes transmitted by the Bbox.",
        ["band", "ssid"],
      ),
      wirelessTransmittedPackets: this.gauge(
        "bbox_wireless_transmitted_packets",
        "Total wireless packets transmitted by the Bbox.",
        ["band", "ssid"],
      ),
      wirelessTransmittedPacketsErrors: this.gauge(
        "bbox_wireless_transmitted_packets_errors",
        "Total wireless packet errors while transmitting.",
        ["band", "ssid"],
      ),
      wirelessTransmittedPacketsDiscards: this.gauge(
        "bbox_wireless_transmitted_packets_discards",
        "Total wireless packet discards while transmitting.",
        ["band", "ssid"],
      ),
      wirelessReceivedBytes: this.gauge(
        "bbox_wireless_received_bytes",
        "Total wireless bytes received by the Bbox.",
        ["band", "ssid"],
      ),
      wirelessReceivedPackets: this.gauge(
        "bbox_wireless_received_packets",
        "Total wireless packets received by the Bbox.",
        ["band", "ssid"],
      ),
      wirelessReceivedPacketsErrors: this.gauge(
        "bbox_wireless_received_packets_errors",
        "Total wireless packet errors while receiving.",
        ["band", "ssid"],
      ),
      wirelessReceivedPacketsDiscards: this.gauge(
        "bbox_wireless_received_packets_discards",
        "Total wireless packet discards while receiving.",
        ["band", "ssid"],
      ),
      wirelessRadioEnable: this.gauge(
        "bbox_wireless_radio_enable",
        "Wireless radio enablement state by band.",
        ["band"],
      ),
      wirelessRadioState: this.gauge("bbox_wireless_radio_state", "Wireless radio state by band.", [
        "band",
      ]),
      wirelessRadioChannel: this.gauge(
        "bbox_wireless_radio_channel",
        "Configured wireless radio channel by band.",
        ["band"],
      ),
      wirelessRadioCurrentChannel: this.gauge(
        "bbox_wireless_radio_current_channel",
        "Current wireless radio channel by band.",
        ["band"],
      ),
      wirelessRadioCurrentBandwidth: this.gauge(
        "bbox_wireless_radio_current_bandwidth",
        "Current wireless radio bandwidth by band.",
        ["band"],
      ),
      wirelessSsidEnable: this.gauge(
        "bbox_wireless_ssid_enable",
        "Wireless SSID enablement state by band.",
        ["band"],
      ),
      wirelessSsidHidden: this.gauge(
        "bbox_wireless_ssid_hidden",
        "Wireless SSID hidden state by band.",
        ["band"],
      ),
      wirelessWpsEnable: this.gauge(
        "bbox_wireless_wps_enable",
        "Wireless WPS enablement state by band.",
        ["band"],
      ),
      wirelessWpsAvailable: this.gauge(
        "bbox_wireless_wps_available",
        "Wireless WPS availability by band.",
        ["band"],
      ),
      wirelessSchedulerEnable: this.gauge(
        "bbox_wireless_scheduler_enable",
        "Wireless scheduler enablement state by band.",
        ["band"],
      ),

      dnsNumberOfQueries: this.gauge(
        "bbox_dns_number_of_queries",
        "Total number of DNS queries reported by the Bbox.",
      ),
      dnsMin: this.gauge("bbox_dns_min", "Minimum DNS response time reported by the Bbox."),
      dnsMax: this.gauge("bbox_dns_max", "Maximum DNS response time reported by the Bbox."),
      dnsAverage: this.gauge("bbox_dns_average", "Average DNS response time reported by the Bbox."),

      serviceStatus: this.gauge(
        "bbox_service_status",
        "Current Bbox service status or enablement value.",
        ["service"],
      ),
    };
  }

  /**
   * Returns the Prometheus exposition content type.
   */
  get contentType() {
    return this.registry.contentType;
  }

  /**
   * Collects and returns all registered Prometheus metrics.
   */
  async metrics() {
    return this.registry.metrics();
  }

  /**
   * Creates a gauge registered in the exporter registry.
   */
  private gauge(name: string, help: string, labelNames: string[] = []) {
    return new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry],
      collect: async () => {
        await this.collectMetrics();
      },
    });
  }

  /**
   * Logs in to the Bbox API once before collecting metrics.
   */
  private async ensureLoggedIn(signal?: AbortSignal) {
    const password = process.env.BBOX_PASSWORD;
    if (!password) throw new Error("Missing BBOX_PASSWORD environment variable");

    this.login ??= this.bbox
      .login(password, { signal })
      .then(() => undefined)
      .catch((error: unknown) => {
        this.login = undefined;
        throw error;
      });

    await this.login;
  }

  /**
   * Collects all Bbox metrics once for all gauges in a scrape.
   */
  private async collectMetrics() {
    this.collection ??= this.updateMetricsWithTimeout()
      .then(() => {
        this.gauges.up.set(1);
      })
      .catch((error: unknown) => {
        this.gauges.up.set(0);
        this.logger.error("Bbox metrics collection failed", error);
      })
      .finally(() => {
        setTimeout(() => {
          this.collection = undefined;
        }, this.collectionCacheMs);
      });

    await this.collection;
  }

  /**
   * Fetches Bbox API data and updates gauges.
   */
  private async updateMetricsWithTimeout() {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error(`Bbox scrape timed out after ${this.scrapeTimeoutMs}ms`));
    }, this.scrapeTimeoutMs);

    try {
      await Promise.race([
        this.updateMetrics(controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => {
              reject(controller.signal.reason);
            },
            { once: true },
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetches Bbox API data and updates gauges.
   */
  private async updateMetrics(signal?: AbortSignal) {
    await this.ensureLoggedIn(signal);

    try {
      await this.updateMetricsFromBbox(signal);
    } catch (error) {
      if (!this.isAuthenticationError(error)) throw error;

      this.login = undefined;
      this.logger.warn("Bbox session expired; retrying authentication once");
      await this.ensureLoggedIn(signal);
      await this.updateMetricsFromBbox(signal);
    }
  }

  /**
   * Fetches Bbox API data and updates gauges after authentication is ready.
   */
  private async updateMetricsFromBbox(signal?: AbortSignal) {
    const [
      iptvResponse,
      iptvDiagsResponse,
      wanResponse,
      wanStatsResponse,
      wanFtthStatsResponse,
      wanDiagsResponse,
      lanStatsResponse,
      deviceResponse,
      deviceCpuResponse,
      deviceMemoryResponse,
      servicesResponse,
      hostsResponse,
      wirelessResponse,
      wireless24Response,
      wireless5Response,
      wireless6Response,
      wirelessStats24Response,
      wirelessStats5Response,
      wirelessStats6Response,
      dnsStatsResponse,
    ] = await Promise.all([
      this.bbox.getIptv({ signal }),
      this.bbox.getIptvDiags({ signal }),
      this.bbox.getWanIP({ signal }),
      this.bbox.getWanIPStats({ signal }),
      this.bbox.getWanFtthStats({ signal }),
      this.bbox.getWanDiags({ signal }),
      this.bbox.getLanStats({ signal }),
      this.bbox.getDevice({ signal }),
      this.bbox.getDeviceCpu({ signal }),
      this.bbox.getDeviceMemory({ signal }),
      this.bbox.getServices({ signal }),
      this.bbox.getHosts({ signal }),
      this.bbox.getWireless({ signal }),
      this.bbox.getWireless24({ signal }),
      this.bbox.getWireless5({ signal }),
      this.bbox.getWireless6({ signal }),
      this.bbox.getWirelessStats(24, { signal }),
      this.bbox.getWirelessStats(5, { signal }),
      this.bbox.getWirelessStats(6, { signal }),
      this.bbox.getDnsStats({ signal }),
    ]);

    const iptv = iptvResponse[0];
    const iptvDiags = iptvDiagsResponse[0];
    const wan = wanResponse[0]?.wan;
    const wanStats = wanStatsResponse[0]?.wan?.ip?.stats;
    const wanFtth = wanFtthStatsResponse[0]?.wan?.ftth;
    const wanDiags = wanDiagsResponse[0]?.diags;
    const lanStats = lanStatsResponse[0]?.lan?.stats;
    const device = deviceResponse[0]?.device;
    const deviceCpu = deviceCpuResponse[0]?.device?.cpu;
    const deviceMemory = deviceMemoryResponse[0]?.device?.mem;
    const services = servicesResponse[0]?.services;
    const hosts = hostsResponse[0]?.hosts?.list ?? [];
    const dnsStats = dnsStatsResponse[0]?.dns;

    if (!wanStats) throw new Error("Missing WAN IP stats in Bbox response");
    if (!lanStats) throw new Error("Missing LAN stats in Bbox response");
    if (!device) throw new Error("Missing device information in Bbox response");
    if (!services) throw new Error("Missing service information in Bbox response");

    this.updateIptvMetrics(iptv, iptvDiags);
    this.updateWanMetrics(wanStats);
    this.updateWanFtthMetrics(wanFtth);
    this.updateWanDiagnosticsMetrics(wanDiags);
    this.updateLanMetrics(lanStats, hosts);
    this.updateHostMetrics(hosts);
    this.updateDeviceMetrics(device);
    this.updateDeviceResourceMetrics(deviceCpu, deviceMemory);
    this.updateWanStateMetrics(wan);
    this.updateWirelessMetrics([
      ["main", wirelessResponse[0]?.wireless],
      ["24", wireless24Response[0]?.wireless],
      ["5", wireless5Response[0]?.wireless],
      ["6", wireless6Response[0]?.wireless],
    ]);
    this.updateWirelessStatsMetrics([
      ["24", wirelessStats24Response[0]?.wireless?.ssid],
      ["5", wirelessStats5Response[0]?.wireless?.ssid],
      ["6", wirelessStats6Response[0]?.wireless?.ssid],
    ]);
    this.updateDnsMetrics(dnsStats);
    this.updateServiceMetrics(services);
  }

  /**
   * Updates IPTV metrics from IPTV information and diagnostics.
   */
  private updateIptvMetrics(
    iptv: { iptv?: unknown[] } | undefined,
    diags:
      | {
          iptv?: {
            multicast?: { state?: string };
            platform?: { state?: string };
          };
          igmp?: {
            enable?: NumericLike;
            state?: NumericLike;
          };
        }
      | undefined,
  ) {
    this.gauges.iptvChannel.reset();
    this.gauges.iptvDiagnosticsInfo.reset();
    this.gauges.iptvIgmpEnable.reset();
    this.gauges.iptvIgmpState.reset();

    for (const [index, channel] of (iptv?.iptv ?? []).entries()) {
      this.gauges.iptvChannel.set({ channel: this.channelLabel(channel, index) }, 1);
    }

    this.setGauge("iptvIgmpEnable", diags?.igmp?.enable);
    this.setGauge("iptvIgmpState", diags?.igmp?.state);

    const multicastState = this.labelValue(diags?.iptv?.multicast?.state);
    const platformState = this.labelValue(diags?.iptv?.platform?.state);
    if (multicastState || platformState) {
      this.gauges.iptvDiagnosticsInfo.set(
        {
          multicast_state: multicastState,
          platform_state: platformState,
        },
        1,
      );
    }
  }

  /**
   * Updates WAN state metrics from WAN information.
   */
  private updateWanStateMetrics(wan: unknown) {
    this.gauges.wanInternetState.reset();
    this.gauges.wanInterfaceState.reset();

    if (!this.isObject(wan)) return;

    const internet = wan.internet;
    const wanInterface = wan.interface;

    if (this.isObject(internet)) this.setGauge("wanInternetState", internet.state);
    if (this.isObject(wanInterface)) this.setGauge("wanInterfaceState", wanInterface.state);
  }

  /**
   * Updates WAN metrics from WAN stats.
   */
  private updateWanMetrics(stats: {
    rx?: {
      bytes?: number | string;
      packets?: number;
      packetserrors?: number;
      packetsdiscards?: number;
      occupation?: number;
      bandwidth?: number | string;
      maxBandwidth?: number;
    };
    tx?: {
      bytes?: number | string;
      packets?: number;
      packetserrors?: number;
      packetsdiscards?: number;
      occupation?: number;
      bandwidth?: number | string;
      maxBandwidth?: number;
    };
  }) {
    const { rx, tx } = stats;

    this.setGauge("wanTransmittedBytes", tx?.bytes);
    this.setGauge("wanTransmittedPackets", tx?.packets);
    this.setGauge("wanTransmittedPacketsErrors", tx?.packetserrors);
    this.setGauge("wanTransmittedPacketsDiscards", tx?.packetsdiscards);
    this.setGauge("wanTransmittedLineOccupation", tx?.occupation);
    this.setGauge("wanTransmittedBandwidth", tx?.bandwidth, BBOX_BANDWIDTH_KILOBITS);
    this.setGauge("wanTransmittedBandwidthMax", tx?.maxBandwidth, BBOX_BANDWIDTH_KILOBITS);

    this.setGauge("wanReceivedBytes", rx?.bytes);
    this.setGauge("wanReceivedPackets", rx?.packets);
    this.setGauge("wanReceivedPacketsErrors", rx?.packetserrors);
    this.setGauge("wanReceivedPacketsDiscards", rx?.packetsdiscards);
    this.setGauge("wanReceivedLineOccupation", rx?.occupation);
    this.setGauge("wanReceivedBandwidth", rx?.bandwidth, BBOX_BANDWIDTH_KILOBITS);
    this.setGauge("wanReceivedBandwidthMax", rx?.maxBandwidth, BBOX_BANDWIDTH_KILOBITS);
  }

  /**
   * Updates WAN FTTH metrics from FTTH information.
   */
  private updateWanFtthMetrics(ftth: { mode?: string; state?: string } | undefined) {
    this.gauges.wanFtthInfo.reset();
    if (!ftth) return;

    this.gauges.wanFtthInfo.set(
      {
        mode: this.labelValue(ftth.mode),
        state: this.labelValue(ftth.state),
      },
      1,
    );
  }

  /**
   * Updates WAN diagnostic metrics from diagnostic statistics.
   */
  private updateWanDiagnosticsMetrics(
    diags: Record<string, BboxDiagnosticStats[] | undefined> | undefined,
  ) {
    this.gauges.wanDiagnosticsMin.reset();
    this.gauges.wanDiagnosticsMax.reset();
    this.gauges.wanDiagnosticsAvg.reset();
    this.gauges.wanDiagnosticsSuccess.reset();
    this.gauges.wanDiagnosticsError.reset();
    this.gauges.wanDiagnosticsTries.reset();

    if (!diags) return;

    for (const [type, entries] of Object.entries(diags)) {
      for (const [index, entry] of (entries ?? []).entries()) {
        const labels = {
          type,
          protocol: this.labelValue(entry.protocol),
          index: String(index),
        };

        this.setLabeledGauge("wanDiagnosticsMin", labels, entry.min);
        this.setLabeledGauge("wanDiagnosticsMax", labels, entry.max);
        this.setLabeledGauge("wanDiagnosticsAvg", labels, entry.average);
        this.setLabeledGauge("wanDiagnosticsSuccess", labels, entry.success);
        this.setLabeledGauge("wanDiagnosticsError", labels, entry.error);
        this.setLabeledGauge("wanDiagnosticsTries", labels, entry.tries);
      }
    }
  }

  /**
   * Updates LAN metrics from LAN stats and host data.
   */
  private updateLanMetrics(
    stats: {
      rx?: {
        bytes?: number | string;
        packets?: number;
        packetserrors?: number;
        packetsdiscards?: number;
      };
      tx?: {
        bytes?: number | string;
        packets?: number;
        packetserrors?: number;
        packetsdiscards?: number;
      };
      port?: {
        index?: NumericLike;
        rx?: {
          bandwidth?: NumericLike;
          bytes?: NumericLike;
          packets?: NumericLike;
        };
        tx?: {
          bandwidth?: NumericLike;
          bytes?: NumericLike;
          packets?: NumericLike;
        };
      }[];
    },
    hosts: { active?: NumericLike }[],
  ) {
    const { rx, tx } = stats;

    this.gauges.lanConnectedDevices.set(
      hosts.filter((host) => this.toOptionalNumber(host.active) === 1).length,
    );

    this.setGauge("lanTransmittedBytes", tx?.bytes);
    this.setGauge("lanTransmittedPackets", tx?.packets);
    this.setGauge("lanTransmittedPacketsErrors", tx?.packetserrors);
    this.setGauge("lanTransmittedPacketsDiscards", tx?.packetsdiscards);

    this.setGauge("lanReceivedBytes", rx?.bytes);
    this.setGauge("lanReceivedPackets", rx?.packets);
    this.setGauge("lanReceivedPacketsErrors", rx?.packetserrors);
    this.setGauge("lanReceivedPacketsDiscards", rx?.packetsdiscards);

    this.gauges.lanPortTransmittedBytes.reset();
    this.gauges.lanPortTransmittedPackets.reset();
    this.gauges.lanPortTransmittedBandwidth.reset();
    this.gauges.lanPortReceivedBytes.reset();
    this.gauges.lanPortReceivedPackets.reset();
    this.gauges.lanPortReceivedBandwidth.reset();

    for (const port of stats.port ?? []) {
      const labels = { port: this.labelValue(port.index) };

      this.setLabeledGauge("lanPortTransmittedBytes", labels, port.tx?.bytes);
      this.setLabeledGauge("lanPortTransmittedPackets", labels, port.tx?.packets);
      this.setLabeledGauge(
        "lanPortTransmittedBandwidth",
        labels,
        port.tx?.bandwidth,
        BBOX_BANDWIDTH_KILOBITS,
      );
      this.setLabeledGauge("lanPortReceivedBytes", labels, port.rx?.bytes);
      this.setLabeledGauge("lanPortReceivedPackets", labels, port.rx?.packets);
      this.setLabeledGauge(
        "lanPortReceivedBandwidth",
        labels,
        port.rx?.bandwidth,
        BBOX_BANDWIDTH_KILOBITS,
      );
    }
  }

  /**
   * Updates host metrics from known host data.
   */
  private updateHostMetrics(hosts: BboxApiObject[]) {
    this.gauges.hostInfo.reset();
    this.gauges.hostActive.reset();
    this.gauges.hostWirelessTransmittedUsage.reset();
    this.gauges.hostWirelessReceivedUsage.reset();
    this.gauges.hostWirelessEstimatedRate.reset();
    this.gauges.hostWirelessRssi.reset();
    this.gauges.hostWirelessMcs.reset();
    this.gauges.hostWirelessRate.reset();

    for (const host of hosts) {
      const labels = this.hostLabels(host);

      this.gauges.hostInfo.set(labels, 1);
      this.setLabeledGauge("hostActive", labels, host.active);

      if (this.isObject(host.wireless)) this.updateHostWirelessMetrics(labels, host.wireless);
      if (!Array.isArray(host.wirelessByBand)) continue;

      for (const wireless of host.wirelessByBand) {
        if (this.isObject(wireless)) this.updateHostWirelessMetrics(labels, wireless);
      }
    }
  }

  /**
   * Updates wireless metrics for a single host radio view.
   */
  private updateHostWirelessMetrics(hostLabels: Labels, wireless: BboxApiObject) {
    const labels = {
      id: hostLabels.id ?? "",
      hostname: hostLabels.hostname ?? "",
      macaddress: hostLabels.macaddress ?? "",
      band: this.labelValue(wireless.band),
    };

    this.setLabeledGauge("hostWirelessTransmittedUsage", labels, wireless.txUsage);
    this.setLabeledGauge("hostWirelessReceivedUsage", labels, wireless.rxUsage);
    this.setLabeledGauge("hostWirelessEstimatedRate", labels, wireless.estimatedRate);
    this.setLabeledGauge("hostWirelessRssi", labels, wireless.rssi0);
    this.setLabeledGauge("hostWirelessMcs", labels, wireless.mcs);
    this.setLabeledGauge("hostWirelessRate", labels, wireless.rate);
  }

  /**
   * Updates device metrics from device information.
   */
  private updateDeviceMetrics(device: {
    status: number;
    numberofboots: number;
    modelname: string;
    modelclass: string;
    using: Record<string, number>;
  }) {
    this.gauges.deviceModelName.reset();
    this.gauges.deviceFaiUsage.reset();

    this.gauges.deviceModelName.set(
      {
        model_name: device.modelname,
        model_class: device.modelclass,
      },
      1,
    );

    for (const [technology, value] of Object.entries(device.using)) {
      this.gauges.deviceFaiUsage.set({ technology }, value);
    }

    this.setGauge("wanFtthState", device.using.ftth);
    this.gauges.deviceStatus.set(device.status);
    this.gauges.deviceNumberOfBoots.set(device.numberofboots);
  }

  /**
   * Updates device CPU, process, temperature, and memory metrics.
   */
  private updateDeviceResourceMetrics(
    cpu:
      | {
          time?: Record<string, NumericLike>;
          process?: Record<string, NumericLike>;
          temperature?: Record<string, NumericLike>;
        }
      | undefined,
    memory: Record<string, NumericLike> | undefined,
  ) {
    this.gauges.deviceCpu.reset();
    this.gauges.deviceProcess.reset();
    this.gauges.deviceTemperature.reset();
    this.gauges.deviceMemory.reset();

    for (const [mode, value] of Object.entries(cpu?.time ?? {})) {
      this.setLabeledGauge("deviceCpu", { mode }, value);
    }

    for (const [state, value] of Object.entries(cpu?.process ?? {})) {
      this.setLabeledGauge("deviceProcess", { state }, value);
    }

    for (const [sensor, value] of Object.entries(cpu?.temperature ?? {})) {
      this.setLabeledGauge("deviceTemperature", { sensor }, value);
    }

    for (const [kind, value] of Object.entries(memory ?? {})) {
      this.setLabeledGauge("deviceMemory", { kind }, value);
    }
  }

  /**
   * Updates wireless metrics from wireless configuration payloads.
   */
  private updateWirelessMetrics(wirelessByBand: [string, unknown][]) {
    this.gauges.wirelessRadioEnable.reset();
    this.gauges.wirelessRadioState.reset();
    this.gauges.wirelessRadioChannel.reset();
    this.gauges.wirelessRadioCurrentChannel.reset();
    this.gauges.wirelessRadioCurrentBandwidth.reset();
    this.gauges.wirelessSsidEnable.reset();
    this.gauges.wirelessSsidHidden.reset();
    this.gauges.wirelessWpsEnable.reset();
    this.gauges.wirelessWpsAvailable.reset();
    this.gauges.wirelessSchedulerEnable.reset();

    for (const [band, wireless] of wirelessByBand) {
      if (!this.isObject(wireless)) continue;

      if (this.isObject(wireless.radio)) this.updateWirelessRadioMetrics(band, wireless.radio);
      if (this.isObject(wireless.ssid)) this.updateWirelessSsidMetrics(wireless.ssid);
      if (this.isObject(wireless.scheduler)) {
        this.setLabeledGauge("wirelessSchedulerEnable", { band }, wireless.scheduler.enable);
      }
    }
  }

  /**
   * Updates wireless radio metrics from a radio payload.
   */
  private updateWirelessRadioMetrics(band: string, radio: BboxApiObject) {
    if (this.hasWirelessRadioValue(radio)) {
      this.setLabeledGauge("wirelessRadioEnable", { band }, radio.enable);
      this.setLabeledGauge("wirelessRadioState", { band }, radio.state);
      this.setLabeledGauge("wirelessRadioChannel", { band }, radio.channel);
      this.setLabeledGauge("wirelessRadioCurrentChannel", { band }, radio.current_channel);
      this.setLabeledGauge("wirelessRadioCurrentBandwidth", { band }, radio.current_bandwidth);
    }

    for (const [nestedBand, nestedRadio] of Object.entries(radio)) {
      if (!this.isObject(nestedRadio)) continue;

      this.updateWirelessRadioMetrics(this.wirelessBandName(band, nestedBand), nestedRadio);
    }
  }

  /**
   * Updates wireless SSID and WPS metrics from an SSID payload.
   */
  private updateWirelessSsidMetrics(ssid: BboxApiObject, prefix = "") {
    for (const [key, value] of Object.entries(ssid)) {
      if (!this.isObject(value)) continue;

      const band = this.wirelessBandName(prefix, key);

      if (this.hasWirelessSsidValue(value)) {
        this.setLabeledGauge("wirelessSsidEnable", { band }, value.enable);
        this.setLabeledGauge("wirelessSsidHidden", { band }, value.hidden);

        if (this.isObject(value.wps)) {
          this.setLabeledGauge("wirelessWpsEnable", { band }, value.wps.enable);
          this.setLabeledGauge("wirelessWpsAvailable", { band }, value.wps.available);
        }

        continue;
      }

      this.updateWirelessSsidMetrics(value, band);
    }
  }

  /**
   * Updates wireless traffic metrics from band statistics.
   */
  private updateWirelessStatsMetrics(
    statsByBand: [
      string,
      (
        | {
            id?: NumericLike;
            stats?: {
              rx?: BboxNetworkStats;
              tx?: BboxNetworkStats;
            };
          }
        | undefined
      ),
    ][],
  ) {
    this.gauges.wirelessTransmittedBytes.reset();
    this.gauges.wirelessTransmittedPackets.reset();
    this.gauges.wirelessTransmittedPacketsErrors.reset();
    this.gauges.wirelessTransmittedPacketsDiscards.reset();
    this.gauges.wirelessReceivedBytes.reset();
    this.gauges.wirelessReceivedPackets.reset();
    this.gauges.wirelessReceivedPacketsErrors.reset();
    this.gauges.wirelessReceivedPacketsDiscards.reset();

    for (const [band, ssid] of statsByBand) {
      const labels = { band, ssid: this.labelValue(ssid?.id) };
      const rx = ssid?.stats?.rx;
      const tx = ssid?.stats?.tx;

      this.setLabeledGauge("wirelessTransmittedBytes", labels, tx?.bytes);
      this.setLabeledGauge("wirelessTransmittedPackets", labels, tx?.packets);
      this.setLabeledGauge("wirelessTransmittedPacketsErrors", labels, tx?.packetserrors);
      this.setLabeledGauge("wirelessTransmittedPacketsDiscards", labels, tx?.packetsdiscards);
      this.setLabeledGauge("wirelessReceivedBytes", labels, rx?.bytes);
      this.setLabeledGauge("wirelessReceivedPackets", labels, rx?.packets);
      this.setLabeledGauge("wirelessReceivedPacketsErrors", labels, rx?.packetserrors);
      this.setLabeledGauge("wirelessReceivedPacketsDiscards", labels, rx?.packetsdiscards);
    }
  }

  /**
   * Updates DNS metrics from DNS statistics.
   */
  private updateDnsMetrics(
    stats:
      | {
          nbqueries?: NumericLike;
          min?: NumericLike;
          max?: NumericLike;
          avg?: NumericLike;
        }
      | undefined,
  ) {
    this.gauges.dnsNumberOfQueries.reset();
    this.gauges.dnsMin.reset();
    this.gauges.dnsMax.reset();
    this.gauges.dnsAverage.reset();

    this.setGauge("dnsNumberOfQueries", stats?.nbqueries);
    this.setGauge("dnsMin", stats?.min);
    this.setGauge("dnsMax", stats?.max);
    this.setGauge("dnsAverage", stats?.avg);
  }

  /**
   * Updates service status metrics from service information.
   */
  private updateServiceMetrics(services: BboxApiObject) {
    this.gauges.serviceStatus.reset();

    for (const [service, value] of this.serviceValues(services)) {
      this.gauges.serviceStatus.set({ service }, value);
    }
  }

  /**
   * Extracts service status or enablement values from nested service data.
   */
  private serviceValues(services: BboxApiObject, prefix = ""): [string, number][] {
    const values: [string, number][] = [];

    for (const [key, value] of Object.entries(services)) {
      if (!this.isObject(value)) continue;

      const name = prefix ? `${prefix}_${key}` : key;
      const status = this.toOptionalNumber(value.status ?? value.enable);

      if (status !== undefined) values.push([name, status]);

      for (const [nestedName, nestedValue] of this.serviceValues(value, name)) {
        values.push([nestedName, nestedValue]);
      }
    }

    return values;
  }

  /**
   * Sets one unlabeled gauge from a numeric-like value.
   */
  private setGauge(name: GaugeName, value: unknown, multiplier = 1) {
    this.gauges[name].reset();

    const numeric = this.toOptionalNumber(value);
    if (numeric === undefined) return;

    this.gauges[name].set(numeric * multiplier);
  }

  /**
   * Sets one labeled gauge from a numeric-like value.
   */
  private setLabeledGauge(name: GaugeName, labels: Labels, value: unknown, multiplier = 1) {
    const numeric = this.toOptionalNumber(value);
    if (numeric === undefined) return;

    this.gauges[name].set(labels, numeric * multiplier);
  }

  /**
   * Converts numeric-like values into numbers.
   */
  private toOptionalNumber(value: unknown) {
    const numeric = Number(value);

    return Number.isFinite(numeric) ? numeric : undefined;
  }

  /**
   * Builds stable Prometheus labels for a known host.
   */
  private hostLabels(host: BboxApiObject) {
    return {
      id: this.labelValue(host.id),
      hostname: this.labelValue(host.hostname),
      macaddress: this.labelValue(host.macaddress),
      ipaddress: this.labelValue(host.ipaddress),
      link: this.labelValue(host.link),
      devicetype: this.labelValue(host.devicetype),
    };
  }

  /**
   * Converts IPTV channel data into a stable label.
   */
  private channelLabel(channel: unknown, index: number) {
    if (!this.isObject(channel)) return String(index);

    return (
      this.labelValue(channel.name) ||
      this.labelValue(channel.channel) ||
      this.labelValue(channel.id) ||
      String(index)
    );
  }

  /**
   * Converts any label-like value into a Prometheus label string.
   */
  private labelValue(value: unknown) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return "";
  }

  /**
   * Joins nested wireless band names for Prometheus labels.
   */
  private wirelessBandName(prefix: string, band: string) {
    return prefix && prefix !== "main" ? `${prefix}_${band}` : band;
  }

  /**
   * Checks whether a radio payload contains numeric radio state.
   */
  private hasWirelessRadioValue(radio: BboxApiObject) {
    return (
      "enable" in radio ||
      "state" in radio ||
      "channel" in radio ||
      "current_channel" in radio ||
      "current_bandwidth" in radio
    );
  }

  /**
   * Checks whether an SSID payload contains numeric SSID state.
   */
  private hasWirelessSsidValue(ssid: BboxApiObject) {
    return "enable" in ssid || "hidden" in ssid || "wps" in ssid;
  }

  /**
   * Checks whether an error likely represents an expired or missing Bbox session.
   */
  private isAuthenticationError(error: unknown) {
    if (!this.isObject(error)) return false;

    return error.status === 401 || error.status === 403;
  }

  /**
   * Checks whether a value is a plain object.
   */
  private isObject(value: unknown): value is BboxApiObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
