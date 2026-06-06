import type { HeadersRecord, QueryInput, QueryValue, Cookie } from "http-lib";

import type { bboxApiRoutes } from "./constants";

export type FormPrimitive = string | number | boolean | null | undefined;
export type FormValue = FormPrimitive | readonly FormPrimitive[];
export type FormInput = URLSearchParams | Record<string, FormValue> | null | undefined;

export interface BboxClientOptions {
  baseUrl?: string | URL;
  headers?: HeadersRecord;
  resolveAddress?: string;
  tlsInsecure?: boolean;
}

export interface BboxRequestOptions {
  headers?: HeadersRecord;
  query?: QueryInput;
  signal?: AbortSignal;
}

export interface BboxFormRequestOptions extends BboxRequestOptions {
  withToken?: boolean;
}

export interface BboxLoginOptions extends BboxRequestOptions {
  remember?: boolean;
}

export interface BboxTokenPayload {
  device?: {
    token?: string;
  };
}

export interface BboxNetworkStats {
  packets?: number;
  bytes?: number | string;
  packetserrors?: number;
  packetsdiscards?: number;
  occupation?: number;
  bandwidth?: number | string;
  maxBandwidth?: number;
  contractualBandwidth?: number;
}

export interface BboxWanBandwidthStats extends BboxNetworkStats {}

export type BboxApiObject = Record<string, unknown>;
export type BboxApiList<T> = T[];
export type BboxKeyedResponse<Key extends string, Value = BboxApiObject> = BboxApiList<
  Record<Key, Value>
>;

export interface BboxSummaryItem {
  now: string;
  authenticated: number;
  display: {
    state: string;
    luminosity: number;
  };
  internet: {
    state: number;
  };
  wan: {
    ip: {
      state: {
        ip: number;
        ipv6: string;
      };
      stats: {
        rx: {
          occupation: number;
        };
        tx: {
          occupation: number;
        };
      };
    };
  };
  [key: string]: unknown;
}

export interface BboxDeviceItem {
  device: {
    now: string;
    status: number;
    numberofboots: number;
    modelname: string;
    modelclass: string;
    serialnumber: string;
    display: {
      luminosity: number;
      luminosity_extender: number;
      state: string;
    };
    uptime: number;
    using: {
      ipv4: number;
      ipv6: number;
      ftth: number;
      adsl: number;
      vdsl: number;
    };
    [key: string]: unknown;
  };
}

export interface BboxWanIPStatsItem {
  wan?: {
    ip?: {
      stats?: {
        rx?: BboxWanBandwidthStats;
        tx?: BboxWanBandwidthStats;
      };
    };
  };
}

export interface BboxLanStatsItem {
  lan: {
    stats: {
      rx?: BboxNetworkStats;
      tx?: BboxNetworkStats;
    };
  };
}

export interface BboxHostDetail {
  id: number;
  hostname: string;
  macaddress: string;
  ipaddress: string;
  type: string;
  link: string;
  devicetype: string;
  firstseen: string;
  lastseen: number | string;
  ip6address: {
    ipaddress: string;
    status: string;
    lastseen: string;
    lastscan: string;
  }[];
  ethernet: {
    physicalport: number;
    logicalport: number;
    speed: number;
    mode: string;
  };
  wireless: {
    wexindex: number;
    static: number;
    band: number | string;
    txUsage: number;
    rxUsage: number;
    estimatedRate: number | string;
    rssi0: number | string;
    mcs: number;
    rate: number | string;
  };
  wirelessByBand: BboxApiObject[];
  plc: {
    rxphyrate: string;
    txphyrate: string;
    associateddevice: number;
    interface: number;
    ethernetspeed: number;
  };
  informations: {
    type: string;
    manufacturer: string;
    model: string;
    icon: string;
    operatingSystem: string;
    version: string;
  };
  lease: number;
  active: number;
  firstSeen: string;
  lastSeen: number | string;
  parentalcontrol: {
    enable: number;
    status: string;
    statusRemaining: number;
    statusUntil: string;
  };
  scan: {
    enable: number;
    status: string;
    services: unknown[];
  };
  ping: {
    min: number;
    max: number;
    average: number;
    success: number;
    error: number;
    tries: number;
    status: string;
    results: unknown[];
  };
}

export interface BboxDhcpClientItem {
  dhcp: {
    clients: {
      id: number;
      hostname: string;
      ipaddress: string;
      macaddress: string;
      enable: number;
    };
  };
}

export interface BboxIptvResponseItem {
  iptv: BboxApiObject[];
  now: string;
}

export interface BboxIptvDiagsResponseItem {
  iptv: {
    multicast: {
      state: string;
      date: string;
    };
    platform: {
      state: string;
      date: string;
    };
  };
  now: string;
  igmp: {
    enable: number;
    state: number;
  };
}

export interface BboxWanFtthStatsItem {
  wan: {
    ftth: {
      mode: string;
      state: string;
    };
  };
}

export interface BboxDiagnosticStats {
  min: number;
  max: number;
  average: number;
  success: number;
  error: number;
  tries: number;
  status: string;
  protocol: string;
}

export interface BboxWanDiagsItem {
  diags: {
    dns?: BboxDiagnosticStats[];
    ping?: BboxDiagnosticStats[];
    http?: BboxDiagnosticStats[];
    [key: string]: BboxDiagnosticStats[] | undefined;
  };
}

export interface BboxDeviceCpuItem {
  device: {
    cpu: {
      time: {
        total: number;
        user: number;
        nice: number;
        system: number;
        io: number;
        idle: number;
        irq: number;
      };
      process: {
        created: number;
        running: number;
        blocked: number;
      };
      temperature: {
        main: number;
        [key: string]: number;
      };
    };
  };
}

export interface BboxDeviceMemoryItem {
  device: {
    mem: {
      total: number;
      free: number;
      cached: number;
      committedas: number;
      [key: string]: number;
    };
  };
}

export interface BboxWirelessStatsItem {
  wireless: {
    ssid: {
      id: number | string;
      stats: {
        rx?: BboxNetworkStats;
        tx?: BboxNetworkStats;
      };
    };
  };
}

export interface BboxDnsStatsItem {
  dns: {
    nbqueries: number;
    min: number;
    max: number;
    avg: number;
  };
}

export interface BboxLogItem {
  date?: string;
  log?: string;
  param?: string;
  [key: string]: unknown;
}

export type BboxSummaryResponse = BboxApiList<BboxSummaryItem>;
export type BboxDeviceResponse = BboxApiList<BboxDeviceItem>;
export type BboxHostsResponse = BboxApiList<{
  hosts: {
    list: {
      active?: number;
      [key: string]: unknown;
    }[];
  };
  downloadThreshold: BboxApiObject;
  wirelesshosts: BboxApiObject[];
  extenderhosts: unknown[];
}>;
export type BboxHostResponse = BboxApiList<BboxHostDetail>;
export type BboxGuestResponse = BboxApiList<BboxHostDetail>;
export type BboxWirelessResponse = BboxKeyedResponse<"wireless">;
export type BboxWirelessRepeatersResponse = BboxApiList<{
  stationscount: number;
  list: BboxApiObject[];
  zerotouch: BboxApiObject;
}>;
export type BboxWanIPResponse = BboxKeyedResponse<"wan">;
export type BboxWanIPStatsResponse = BboxApiList<BboxWanIPStatsItem>;
export type BboxLanIPResponse = BboxKeyedResponse<"lan">;
export type BboxServicesResponse = BboxKeyedResponse<"services">;
export type BboxLogsResponse = BboxKeyedResponse<"log", BboxLogItem[]>;
export type BboxAlertsResponse = BboxKeyedResponse<"alerts">;
export type BboxParentalControlResponse = BboxKeyedResponse<"parentalcontrol">;
export type BboxParentalControlSchedulerResponse = BboxKeyedResponse<"parentalcontrol">;
export type BboxContentFilteringResponse = BboxKeyedResponse<"contentFiltering">;
export type BboxCplResponse = BboxKeyedResponse<"cpl">;
export type BboxDeviceCpuResponse = BboxApiList<BboxDeviceCpuItem>;
export type BboxDeviceMemoryResponse = BboxApiList<BboxDeviceMemoryItem>;
export type BboxDhcpClientsResponse = BboxKeyedResponse<"dhcp">;
export type BboxDhcpClientResponse = BboxApiList<BboxDhcpClientItem>;
export type BboxDhcpOptionsResponse = BboxKeyedResponse<"dhcp">;
export type BboxDhcpv6OptionsResponse = BboxKeyedResponse<"dhcp">;
export type BboxDnsStatsResponse = BboxApiList<BboxDnsStatsItem>;
export type BboxDyndnsResponse = BboxKeyedResponse<"dyndns">;
export type BboxFirewallRulesResponse = BboxKeyedResponse<"firewall">;
export type BboxGuestEnableResponse = BboxKeyedResponse<"wireless">;
export type BboxIptvResponse = BboxApiList<BboxIptvResponseItem>;
export type BboxIptvDiagsResponse = BboxApiList<BboxIptvDiagsResponseItem>;
export type BboxLanStatsResponse = BboxApiList<BboxLanStatsItem>;
export type BboxLedResponse = BboxApiList<{
  led: BboxApiObject;
  ethernetPort: BboxApiObject;
  screen: BboxApiObject;
}>;
export type BboxMeResponse = BboxApiList<{
  host: BboxApiObject;
  wirelesshosts: BboxApiObject[];
  extenderhosts: unknown[];
}>;
export type BboxNatRulesResponse = BboxKeyedResponse<"nat">;
export type BboxNotificationAlertsResponse = BboxKeyedResponse<"notification">;
export type BboxWanBackupResponse = BboxKeyedResponse<"backup">;
export type BboxUsbResponse = BboxKeyedResponse<"usb">;
export type BboxUpnpRulesResponse = BboxKeyedResponse<"upnp">;
export type BboxVoipResponse = BboxKeyedResponse<"voip">;
export type BboxVoipSchedulerNumberResponse = BboxKeyedResponse<"voip">;
export type BboxVoipSchedulerResponse = BboxKeyedResponse<"voip">;
export type BboxWireless24Response = BboxWirelessResponse;
export type BboxWireless5Response = BboxWirelessResponse;
export type BboxWireless6Response = BboxWirelessResponse;
export type BboxWanFtthStatsResponse = BboxApiList<BboxWanFtthStatsItem>;
export type BboxWanDiagsResponse = BboxApiList<BboxWanDiagsItem>;
export type BboxWirelessDeactivation5Response = BboxKeyedResponse<"wireless">;
export type BboxWirelessGuestResponse = BboxKeyedResponse<"guest24">;
export type BboxWirelessGuestEnableResponse = BboxKeyedResponse<"wireless">;
export type BboxWirelessMloResponse = BboxKeyedResponse<"wireless">;
export type BboxWirelessSchedulerResponse = BboxKeyedResponse<"wireless">;
export type BboxWirelessStatsResponse = BboxApiList<BboxWirelessStatsItem>;
export type BboxWpsResponse = BboxKeyedResponse<"wps">;
export type BboxUsersaveResponse = BboxKeyedResponse<"usersave">;
export type BboxPasswordRecoveryVerifyResponse = BboxApiList<{
  method: string;
  expires: string;
}>;
export type BboxHibernateSchedulerResponse = BboxKeyedResponse<"hibernate">;
export type BboxTokenResponse = string;

export type BboxSchedulerKind = "wifi" | "internet" | "voip" | "hibernate";

export type BboxApiRoutes = typeof bboxApiRoutes;

export type { Cookie, HeadersRecord, QueryInput, QueryValue };
