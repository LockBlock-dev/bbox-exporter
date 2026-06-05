import "dotenv/config";
import { lookup as dnsLookup } from "node:dns";
import { isIP, type LookupFunction } from "node:net";

import { HttpClient, HttpCookieJar, type HttpMethod } from "http-lib";
import { Agent } from "undici";

import { bboxApiRoutes, DEFAULT_BASE_URL, DEFAULT_USER_AGENT } from "./constants";
import type {
  BboxAlertsResponse,
  BboxClientOptions,
  BboxContentFilteringResponse,
  BboxCplResponse,
  BboxDeviceCpuResponse,
  BboxDeviceMemoryResponse,
  BboxDeviceResponse,
  BboxDhcpClientResponse,
  BboxDhcpClientsResponse,
  BboxDhcpOptionsResponse,
  BboxDhcpv6OptionsResponse,
  BboxDnsStatsResponse,
  BboxDyndnsResponse,
  BboxFirewallRulesResponse,
  BboxGuestEnableResponse,
  BboxGuestResponse,
  BboxHibernateSchedulerResponse,
  BboxHostResponse,
  BboxHostsResponse,
  BboxIptvDiagsResponse,
  BboxIptvResponse,
  BboxLanIPResponse,
  BboxLanStatsResponse,
  BboxLedResponse,
  BboxLoginOptions,
  BboxLogsResponse,
  BboxMeResponse,
  BboxNatRulesResponse,
  BboxNotificationAlertsResponse,
  BboxParentalControlResponse,
  BboxParentalControlSchedulerResponse,
  BboxPasswordRecoveryVerifyResponse,
  BboxRequestOptions,
  BboxSchedulerKind,
  BboxServicesResponse,
  BboxSummaryResponse,
  BboxTokenPayload,
  BboxTokenResponse,
  BboxUpnpRulesResponse,
  BboxUsbResponse,
  BboxUsersaveResponse,
  BboxVoipResponse,
  BboxVoipSchedulerNumberResponse,
  BboxVoipSchedulerResponse,
  BboxWanBackupResponse,
  BboxWanDiagsResponse,
  BboxWanFtthStatsResponse,
  BboxWanIPResponse,
  BboxWanIPStatsResponse,
  BboxWireless24Response,
  BboxWireless5Response,
  BboxWireless6Response,
  BboxWirelessDeactivation5Response,
  BboxWirelessGuestEnableResponse,
  BboxWirelessGuestResponse,
  BboxWirelessMloResponse,
  BboxWirelessRepeatersResponse,
  BboxWirelessResponse,
  BboxWirelessSchedulerResponse,
  BboxWirelessStatsResponse,
  BboxWpsResponse,
  BboxFormRequestOptions,
  FormInput,
  FormValue,
  HeadersRecord,
  QueryInput,
  QueryValue,
} from "./types";

export class BboxClient {
  public readonly routes = bboxApiRoutes;
  private readonly baseUrl: URL;
  private readonly http: HttpClient;

  /**
   * Creates an HTTP client configured for the Bbox API.
   */
  constructor(options: BboxClientOptions = {}) {
    const resolveAddress = options.resolveAddress ?? process.env.BBOX_RESOLVE_ADDRESS;
    const tlsInsecure =
      options.tlsInsecure ??
      BboxClient.parseBoolean(process.env.BBOX_TLS_INSECURE, "BBOX_TLS_INSECURE");

    if (tlsInsecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";

    this.baseUrl = new URL(options.baseUrl ?? DEFAULT_BASE_URL);
    this.http = new HttpClient(this.baseUrl, {
      cookieJar: new HttpCookieJar(),
      dispatcher: this.createDispatcher(resolveAddress, tlsInsecure),
      headers: {
        Accept: "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
        ...options.headers,
      },
    });
  }

  /**
   * Logs in to the Bbox administration API with a password.
   */
  async login(password: string, options: BboxLoginOptions = {}) {
    return this.post<null>(
      this.routes.login,
      {
        password,
        remember: (options.remember ?? true) ? 1 : 0,
      },
      {
        ...options,
        withToken: false,
      },
    );
  }

  /**
   * Logs out of the current Bbox administration session.
   */
  async logout() {
    return this.post<null>(this.routes.logout);
  }

  /**
   * Requests a Bbox device reboot.
   */
  async reboot<T = unknown>() {
    return this.post<T>(this.routes.reboot);
  }

  /**
   * Fetches the Bbox API summary.
   */
  async getSummary() {
    return this.get<BboxSummaryResponse>(this.routes.summary);
  }

  /**
   * Fetches Bbox device information.
   */
  async getDevice(options: BboxRequestOptions = {}) {
    return this.get<BboxDeviceResponse>(this.routes.device, options);
  }

  /**
   * Fetches Bbox device CPU information.
   */
  async getDeviceCpu(options: BboxRequestOptions = {}) {
    return this.get<BboxDeviceCpuResponse>(this.routes.deviceCpu, options);
  }

  /**
   * Fetches Bbox device memory information.
   */
  async getDeviceMemory(options: BboxRequestOptions = {}) {
    return this.get<BboxDeviceMemoryResponse>(this.routes.deviceMemory, options);
  }

  /**
   * Fetches all known Bbox hosts.
   */
  async getHosts(options: BboxRequestOptions = {}) {
    return this.get<BboxHostsResponse>(this.routes.hosts, options);
  }

  /**
   * Fetches one host or guest device by ID.
   */
  async getHost(id: string | number, guest: true): Promise<BboxGuestResponse>;
  async getHost(id: string | number, guest?: false): Promise<BboxHostResponse>;
  async getHost(id: string | number, guest = false) {
    return this.get<BboxGuestResponse | BboxHostResponse>(
      guest ? this.routes.guestById(id) : this.routes.hostsById(id),
    );
  }

  /**
   * Fetches IPTV information.
   */
  async getIptv(options: BboxRequestOptions = {}) {
    return this.get<BboxIptvResponse>(this.routes.iptv, options);
  }

  /**
   * Fetches IPTV diagnostic information.
   */
  async getIptvDiags(options: BboxRequestOptions = {}) {
    return this.get<BboxIptvDiagsResponse>(this.routes.iptvDiags, options);
  }

  /**
   * Fetches the main wireless configuration.
   */
  async getWireless(options: BboxRequestOptions = {}) {
    return this.get<BboxWirelessResponse>(this.routes.wireless, options);
  }

  /**
   * Fetches wireless repeater information.
   */
  async getWirelessRepeaters() {
    return this.get<BboxWirelessRepeatersResponse>(this.routes.wirelessRepeater);
  }

  /**
   * Fetches WAN IP information.
   */
  async getWanIP(options: BboxRequestOptions = {}) {
    return this.get<BboxWanIPResponse>(this.routes.wanIP, options);
  }

  /**
   * Fetches WAN IP traffic statistics.
   */
  async getWanIPStats(options: BboxRequestOptions = {}) {
    return this.get<BboxWanIPStatsResponse>(this.routes.wanIPStats, options);
  }

  /**
   * Fetches WAN FTTH traffic statistics.
   */
  async getWanFtthStats(options: BboxRequestOptions = {}) {
    return this.get<BboxWanFtthStatsResponse>(this.routes.wanFtthStats, options);
  }

  /**
   * Fetches WAN diagnostic statistics.
   */
  async getWanDiags(options: BboxRequestOptions = {}) {
    return this.get<BboxWanDiagsResponse>(this.routes.wanDiags, options);
  }

  /**
   * Fetches LAN IP configuration.
   */
  async getLanIP() {
    return this.get<BboxLanIPResponse>(this.routes.lanIP);
  }

  /**
   * Fetches enabled Bbox services.
   */
  async getServices(options: BboxRequestOptions = {}) {
    return this.get<BboxServicesResponse>(this.routes.services, options);
  }

  /**
   * Fetches Bbox device logs.
   */
  async getLogs() {
    return this.get<BboxLogsResponse>(this.routes.logs);
  }

  /**
   * Fetches current Bbox alert information.
   */
  async getAlerts() {
    return this.get<BboxAlertsResponse>(this.routes.alerts);
  }

  /**
   * Fetches parental-control configuration.
   */
  async getParentalControl() {
    return this.get<BboxParentalControlResponse>(this.routes.caccess);
  }

  /**
   * Fetches parental-control scheduler configuration.
   */
  async getParentalControlScheduler() {
    return this.get<BboxParentalControlSchedulerResponse>(this.routes.caccessScheduler);
  }

  /**
   * Fetches content-filtering configuration.
   */
  async getContentFiltering() {
    return this.get<BboxContentFilteringResponse>(this.routes.contentFiltering);
  }

  /**
   * Fetches CPL device information.
   */
  async getCpl() {
    return this.get<BboxCplResponse>(this.routes.cpl);
  }

  /**
   * Fetches cybersecurity configuration.
   */
  async getCybersecurity<T = unknown>() {
    return this.get<T>(this.routes.cybersecurity);
  }

  /**
   * Fetches hosts attached to parental-control access.
   */
  async getParentalControlHosts<T = unknown>() {
    return this.get<T>(this.routes.deviceOnCAccess);
  }

  /**
   * Fetches DHCP client reservations.
   */
  async getDhcpClients() {
    return this.get<BboxDhcpClientsResponse>(this.routes.dhcpClients);
  }

  /**
   * Fetches one DHCP client reservation by ID.
   */
  async getDhcpClient(id: string | number) {
    return this.get<BboxDhcpClientResponse>(this.routes.dhcpClientsById(id));
  }

  /**
   * Fetches DHCP options.
   */
  async getDhcpOptions() {
    return this.get<BboxDhcpOptionsResponse>(this.routes.dhcpOptions);
  }

  /**
   * Fetches DHCPv6 options.
   */
  async getDhcpv6Options() {
    return this.get<BboxDhcpv6OptionsResponse>(this.routes.dhcpv6Options);
  }

  /**
   * Fetches DNS statistics.
   */
  async getDnsStats(options: BboxRequestOptions = {}) {
    return this.get<BboxDnsStatsResponse>(this.routes.dnsStats, options);
  }

  /**
   * Fetches dynamic DNS configuration.
   */
  async getDyndns() {
    return this.get<BboxDyndnsResponse>(this.routes.dyndns);
  }

  /**
   * Fetches firewall rules.
   */
  async getFirewallRules() {
    return this.get<BboxFirewallRulesResponse>(this.routes.firewallRules);
  }

  /**
   * Fetches one guest device by ID.
   */
  async getGuest(id: string | number) {
    return this.get<BboxGuestResponse>(this.routes.guestById(id));
  }

  /**
   * Fetches guest Wi-Fi enablement state.
   */
  async getGuestEnable() {
    return this.get<BboxGuestEnableResponse>(this.routes.guestEnable);
  }

  /**
   * Fetches LAN traffic statistics.
   */
  async getLanStats(options: BboxRequestOptions = {}) {
    return this.get<BboxLanStatsResponse>(this.routes.lanStats, options);
  }

  /**
   * Fetches Bbox LED configuration.
   */
  async getLed() {
    return this.get<BboxLedResponse>(this.routes.led);
  }

  /**
   * Fetches the host entry for the current caller.
   */
  async getMe() {
    return this.get<BboxMeResponse>(this.routes.me);
  }

  /**
   * Fetches NAT rules.
   */
  async getNatRules() {
    return this.get<BboxNatRulesResponse>(this.routes.nat);
  }

  /**
   * Fetches notification alert settings.
   */
  async getNotificationAlerts() {
    return this.get<BboxNotificationAlertsResponse>(this.routes.notificationAlerts);
  }

  /**
   * Fetches WAN backup configuration.
   */
  async getWanBackup() {
    return this.get<BboxWanBackupResponse>(this.routes.sao);
  }

  /**
   * Fetches USB device configuration.
   */
  async getUsb() {
    return this.get<BboxUsbResponse>(this.routes.usb);
  }

  /**
   * Fetches USB 3 configuration.
   */
  async getUsb3<T = unknown>() {
    return this.get<T>(this.routes.usb3);
  }

  /**
   * Fetches UPnP IGD rules.
   */
  async getUpnpRules() {
    return this.get<BboxUpnpRulesResponse>(this.routes.upnp);
  }

  /**
   * Fetches VoIP configuration.
   */
  async getVoip() {
    return this.get<BboxVoipResponse>(this.routes.voip);
  }

  /**
   * Fetches anonymous-call blocking for a VoIP line.
   */
  async getVoipMaskedNumber<T = unknown>(line: 1 | 2) {
    return this.get<T>(line === 1 ? this.routes.voipMaskedNumber1 : this.routes.voipMaskedNumber2);
  }

  /**
   * Fetches VoIP scheduler numbers.
   */
  async getVoipSchedulerNumber() {
    return this.get<BboxVoipSchedulerNumberResponse>(this.routes.voipSchedulerNumber);
  }

  /**
   * Fetches VoIP scheduler configuration.
   */
  async getVoipScheduler() {
    return this.get<BboxVoipSchedulerResponse>(this.routes.voipScheduler);
  }

  /**
   * Fetches WAN xDSL information.
   */
  async getWanXdsl<T = unknown>() {
    return this.get<T>(this.routes.wanXdsl);
  }

  /**
   * Fetches 2.4 GHz wireless configuration.
   */
  async getWireless24(options: BboxRequestOptions = {}) {
    return this.get<BboxWireless24Response>(this.routes.wireless24, options);
  }

  /**
   * Fetches 5 GHz wireless configuration.
   */
  async getWireless5(options: BboxRequestOptions = {}) {
    return this.get<BboxWireless5Response>(this.routes.wireless5, options);
  }

  /**
   * Fetches 6 GHz wireless configuration.
   */
  async getWireless6(options: BboxRequestOptions = {}) {
    return this.get<BboxWireless6Response>(this.routes.wireless6, options);
  }

  /**
   * Fetches wireless traffic statistics for one band.
   */
  async getWirelessStats(band: 24 | 5 | 6, options: BboxRequestOptions = {}) {
    return this.get<BboxWirelessStatsResponse>(this.routes.wirelessStatsByBand(band), options);
  }

  /**
   * Fetches wireless compatibility configuration.
   */
  async getWirelessCompatibility<T = unknown>() {
    return this.get<T>(this.routes.wirelessCompatibility);
  }

  /**
   * Fetches wireless compatibility enablement state.
   */
  async getWirelessCompatibilityEnable<T = unknown>() {
    return this.get<T>(this.routes.wirelessCompatibilityEnable);
  }

  /**
   * Fetches 5 GHz deactivation information.
   */
  async getWirelessDeactivation5() {
    return this.get<BboxWirelessDeactivation5Response>(this.routes.wirelessDeactivation5);
  }

  /**
   * Fetches guest wireless configuration.
   */
  async getWirelessGuest() {
    return this.get<BboxWirelessGuestResponse>(this.routes.wirelessGuest);
  }

  /**
   * Fetches guest wireless enablement state.
   */
  async getWirelessGuestEnable() {
    return this.get<BboxWirelessGuestEnableResponse>(this.routes.wirelessGuestEnable);
  }

  /**
   * Fetches wireless MLO configuration.
   */
  async getWirelessMlo() {
    return this.get<BboxWirelessMloResponse>(this.routes.wirelessMlo);
  }

  /**
   * Fetches wireless scheduler configuration.
   */
  async getWirelessScheduler() {
    return this.get<BboxWirelessSchedulerResponse>(this.routes.wirelessScheduler);
  }

  /**
   * Fetches saved wireless scheduler rules.
   */
  async getWirelessSchedulerSavedRules<T = unknown>() {
    return this.get<T>(this.routes.wirelessSchedulerSavedRules);
  }

  /**
   * Fetches secondary 2.4 GHz wireless configuration.
   */
  async getWirelessSecondary24<T = unknown>() {
    return this.get<T>(this.routes.wirelessSecondary24);
  }

  /**
   * Fetches secondary 5 GHz wireless configuration.
   */
  async getWirelessSecondary5<T = unknown>() {
    return this.get<T>(this.routes.wirelessSecondary5);
  }

  /**
   * Fetches secondary Wi-Fi enablement state.
   */
  async getWirelessSecondaryEnable<T = unknown>() {
    return this.get<T>(this.routes.wirelessSecondaryEnable);
  }

  /**
   * Fetches WPS configuration.
   */
  async getWps() {
    return this.get<BboxWpsResponse>(this.routes.wps);
  }

  /**
   * Fetches new-interface preference.
   */
  async getNewIhm<T = unknown>() {
    return this.get<T>(this.routes.newihm);
  }

  /**
   * Fetches device display configuration.
   */
  async getDisplay<T = unknown>() {
    return this.get<T>(this.routes.display);
  }

  /**
   * Fetches extender display configuration.
   */
  async getExtenderDisplay<T = unknown>() {
    return this.get<T>(this.routes.extenderDisplay);
  }

  /**
   * Fetches user-save backup metadata.
   */
  async getUsersave() {
    return this.get<BboxUsersaveResponse>(this.routes.usersave);
  }

  /**
   * Verifies password-recovery state.
   */
  async getPasswordRecoveryVerify() {
    return this.get<BboxPasswordRecoveryVerifyResponse>(this.routes.passwordRecoveryVerify);
  }

  /**
   * Fetches hibernate scheduler configuration.
   */
  async getHibernateScheduler() {
    return this.get<BboxHibernateSchedulerResponse>(this.routes.hibernateScheduler);
  }

  /**
   * Fetches one scheduler rule by kind and ID.
   */
  async getSchedulerRule<T = unknown>(kind: BboxSchedulerKind, id: string | number) {
    return this.get<T>(this.schedulerRulePath(kind, id));
  }

  /**
   * Confirms Bbox login validation.
   */
  async putLogin<T = unknown>(body?: FormInput) {
    return this.put<T>(this.routes.login, body);
  }

  /**
   * Updates guest Wi-Fi enablement.
   */
  async updateGuestEnable<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.guestEnable, body);
  }

  /**
   * Updates parental-control default policy.
   */
  async updateParentalControl<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.caccess, body);
  }

  /**
   * Updates parental-control host membership.
   */
  async updateParentalControlHosts<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.deviceOnCAccess, body);
  }

  /**
   * Updates wireless compatibility enablement.
   */
  async updateWirelessCompatibilityEnable<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessCompatibilityEnable, body);
  }

  /**
   * Updates secondary Wi-Fi enablement.
   */
  async updateWirelessSecondaryEnable<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessSecondaryEnable, body);
  }

  /**
   * Updates secondary 2.4 GHz wireless configuration.
   */
  async updateWirelessSecondary24<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessSecondary24, body);
  }

  /**
   * Updates secondary 5 GHz wireless configuration.
   */
  async updateWirelessSecondary5<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessSecondary5, body);
  }

  /**
   * Updates wireless MLO configuration.
   */
  async updateWirelessMlo<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessMlo, body);
  }

  /**
   * Updates a wireless band configuration.
   */
  async updateWirelessBand<T = unknown>(band: 24 | 5 | 6, body: FormInput) {
    return this.put<T>(this.wirelessBandPath(band), body);
  }

  /**
   * Updates main wireless configuration.
   */
  async updateWireless<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wireless, body);
  }

  /**
   * Updates wireless compatibility configuration.
   */
  async updateWirelessCompatibility<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessCompatibility, body);
  }

  /**
   * Updates guest wireless configuration.
   */
  async updateWirelessGuest<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessGuest, body);
  }

  /**
   * Updates guest wireless enablement.
   */
  async updateWirelessGuestEnable<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.wirelessGuestEnable, body);
  }

  /**
   * Updates one scheduler rule by kind and ID.
   */
  async updateSchedulerRule<T = unknown>(
    kind: BboxSchedulerKind,
    id: string | number,
    body: FormInput,
  ) {
    return this.put<T>(this.schedulerRulePath(kind, id), body);
  }

  /**
   * Creates one scheduler rule by kind.
   */
  async createSchedulerRule<T = unknown>(kind: BboxSchedulerKind, body: FormInput) {
    return this.post<T>(this.schedulerRuleCollectionPath(kind), body);
  }

  /**
   * Deletes one scheduler rule by kind and ID.
   */
  async deleteSchedulerRule<T = unknown>(kind: BboxSchedulerKind, id: string | number) {
    return this.delete<T>(this.schedulerRulePath(kind, id));
  }

  /**
   * Updates VoIP scheduler configuration.
   */
  async updateVoipScheduler<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.voipScheduler, body);
  }

  /**
   * Creates one VoIP scheduler number.
   */
  async createVoipSchedulerNumber<T = unknown>(body: FormInput) {
    return this.post<T>(this.routes.voipSchedulerNumber, body);
  }

  /**
   * Deletes one VoIP scheduler number.
   */
  async deleteVoipSchedulerNumber<T = unknown>(id: string | number) {
    return this.delete<T>(this.routes.voipSchedulerNumberById(id));
  }

  /**
   * Updates a USB device by ID.
   */
  async updateUsb<T = unknown>(id: string | number, body: FormInput) {
    return this.put<T>(this.routes.usbById(id), body);
  }

  /**
   * Updates anonymous-call blocking for a VoIP line.
   */
  async updateVoipMaskedNumber<T = unknown>(line: 1 | 2, body: FormInput) {
    return this.put<T>(
      line === 1 ? this.routes.voipMaskedNumber1 : this.routes.voipMaskedNumber2,
      body,
    );
  }

  /**
   * Updates USB 3 configuration.
   */
  async updateUsb3<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.usb3, body);
  }

  /**
   * Updates new-interface preference.
   */
  async updateNewIhm<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.newihm, body);
  }

  /**
   * Updates extender display configuration.
   */
  async updateExtenderDisplay<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.extenderDisplay, body);
  }

  /**
   * Updates device display configuration.
   */
  async updateDisplay<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.display, body);
  }

  /**
   * Updates cybersecurity configuration.
   */
  async updateCybersecurity<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.cybersecurity, body);
  }

  /**
   * Updates content-filtering configuration.
   */
  async updateContentFiltering<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.contentFiltering, body);
  }

  /**
   * Updates host identification metadata.
   */
  async updateHostsIdentification<T = unknown>(body: FormInput) {
    return this.put<T>(this.routes.hostsIdentification, body);
  }

  /**
   * Updates one DHCP client reservation by ID.
   */
  async updateDhcpClient<T = unknown>(id: string | number, body: FormInput) {
    return this.put<T>(this.routes.dhcpClientsById(id), body);
  }

  /**
   * Creates one DHCP client reservation.
   */
  async createDhcpClient<T = unknown>(body: FormInput) {
    return this.post<T>(this.routes.dhcpClients, body);
  }

  /**
   * Posts an action or update to one host or guest.
   */
  async postHost<T = unknown>(id: string | number, body: FormInput, guest = false) {
    return this.post<T>(guest ? this.routes.guestById(id) : this.routes.hostsById(id), body);
  }

  /**
   * Deletes one host or guest.
   */
  async deleteHost<T = unknown>(id: string | number, guest = false) {
    return this.delete<T>(guest ? this.routes.guestById(id) : this.routes.hostsById(id));
  }

  /**
   * Updates static host handling.
   */
  async updateStaticHost<T = unknown>(hostId: string | number, body: FormInput) {
    return this.put<T>(this.routes.staticByHosts(hostId), body);
  }

  /**
   * Starts a WPS pairing request.
   */
  async startWps<T = unknown>() {
    return this.post<T>(this.routes.wps);
  }

  /**
   * Deletes the wireless configuration.
   */
  async deleteWireless<T = unknown>() {
    return this.delete<T>(this.routes.wireless);
  }

  /**
   * Starts password recovery without requiring a Bbox token.
   */
  async startPasswordRecovery<T = unknown>() {
    return this.post<T>(this.routes.passwordRecovery, null, { withToken: false });
  }

  /**
   * Posts user-save backup or restore data.
   */
  async postUsersave<T = unknown>(body: FormInput) {
    return this.post<T>(this.routes.usersave, body);
  }

  /**
   * Resets the Bbox administration password.
   */
  async resetPassword<T = unknown>(body: FormInput) {
    return this.post<T>(this.routes.resetPassword, body);
  }

  /**
   * Fetches the current Bbox write-operation token.
   */
  async getToken(options: BboxRequestOptions = {}): Promise<BboxTokenResponse> {
    const data = await this.get<BboxTokenPayload[]>(this.routes.token, options);
    const token = data[0]?.device?.token;

    if (!token) throw new Error("Could not read Bbox btoken");

    return token;
  }

  /**
   * Sends a GET request and parses the JSON response.
   */
  async get<T = unknown>(path: string | URL, options: BboxRequestOptions = {}) {
    return this.requestJson<T>("GET", path, options);
  }

  /**
   * Sends a form-encoded PUT request and parses the JSON response.
   */
  async put<T = unknown>(
    path: string | URL,
    body?: FormInput,
    options: BboxFormRequestOptions = {},
  ) {
    const query =
      (options.withToken ?? true) ? await this.withBtoken(options.query, options) : options.query;

    return this.requestJson<T>("PUT", path, {
      ...options,
      body: this.toFormBody(body),
      headers: this.formHeaders(body, options.headers),
      query,
    });
  }

  /**
   * Sends a form-encoded POST request and parses the JSON response.
   */
  async post<T = unknown>(
    path: string | URL,
    body?: FormInput,
    options: BboxFormRequestOptions = {},
  ) {
    const query =
      (options.withToken ?? true) ? await this.withBtoken(options.query, options) : options.query;

    return this.requestJson<T>("POST", path, {
      ...options,
      body: this.toFormBody(body),
      headers: this.formHeaders(body, options.headers),
      query,
    });
  }

  /**
   * Sends a DELETE request and parses the JSON response.
   */
  async delete<T = unknown>(path: string | URL, options: BboxFormRequestOptions = {}) {
    const query =
      (options.withToken ?? true) ? await this.withBtoken(options.query, options) : options.query;

    return this.requestJson<T>("DELETE", path, { ...options, query });
  }

  /**
   * Sends an HTTP request and parses a possibly empty JSON response.
   */
  async requestJson<T = unknown>(
    method: HttpMethod,
    path: string | URL,
    options: BboxRequestOptions & { body?: unknown } = {},
  ) {
    const response = await this.request(method, path, options);
    const text = await response.text();

    if (text.trim() === "") return null as T;

    return JSON.parse(text) as T;
  }

  /**
   * Sends an HTTP request and asserts that it succeeded.
   */
  async request(
    method: HttpMethod,
    path: string | URL,
    options: BboxRequestOptions & { body?: unknown } = {},
  ) {
    const response = await this.http.request({
      method,
      path,
      body: options.body,
      headers: options.headers,
      query: options.query,
      signal: options.signal,
    });

    return response.assertOk();
  }

  /**
   * Adds a Bbox token to the provided query parameters.
   */
  private async withBtoken(query: QueryInput | undefined, options: BboxRequestOptions = {}) {
    return {
      ...this.queryToRecord(query),
      btoken: await this.getToken({ signal: options.signal }),
    };
  }

  /**
   * Builds an optional Undici dispatcher for curl-like --resolve and -k behavior.
   */
  private createDispatcher(resolveAddress: string | undefined, tlsInsecure: boolean | undefined) {
    if (!resolveAddress && !tlsInsecure) return undefined;

    if (resolveAddress && !isIP(resolveAddress))
      throw new Error(`Invalid BBOX_RESOLVE_ADDRESS IP address: ${resolveAddress}`);

    return new Agent({
      connect: {
        lookup: resolveAddress ? this.createLookup(resolveAddress) : undefined,
        rejectUnauthorized: tlsInsecure ? false : undefined,
        servername: this.baseUrl.hostname,
      },
    });
  }

  /**
   * Resolves the configured Bbox hostname to a fixed IP address.
   */
  private createLookup(resolveAddress: string): LookupFunction {
    const family = isIP(resolveAddress);

    return (hostname, options, callback) => {
      if (hostname === this.baseUrl.hostname) {
        if (options?.all) {
          callback(null, [{ address: resolveAddress, family }]);
          return;
        }

        callback(null, resolveAddress, family);
        return;
      }

      dnsLookup(hostname, options, callback);
    };
  }

  /**
   * Resolves a wireless band route.
   */
  private wirelessBandPath(band: 24 | 5 | 6) {
    if (band === 24) return this.routes.wireless24;
    if (band === 5) return this.routes.wireless5;

    return this.routes.wireless6;
  }

  /**
   * Resolves a scheduler rule collection route.
   */
  private schedulerRuleCollectionPath(kind: BboxSchedulerKind) {
    if (kind === "internet") return this.routes.caccessSchedulerRule;
    if (kind === "voip") return this.routes.voipSchedulerRule;
    if (kind === "hibernate") return this.routes.hibernateSchedulerRule;

    return this.routes.wirelessSchedulerRule;
  }

  /**
   * Resolves a scheduler rule item route.
   */
  private schedulerRulePath(kind: BboxSchedulerKind, id: string | number) {
    if (kind === "internet") return this.routes.caccessSchedulerRuleById(id);
    if (kind === "voip") return this.routes.voipSchedulerRuleById(id);
    if (kind === "hibernate") return this.routes.hibernateSchedulerRuleById(id);

    return this.routes.wirelessSchedulerRuleById(id);
  }

  /**
   * Converts supported query input into a mutable record.
   */
  private queryToRecord(query: QueryInput | undefined): Record<string, string | string[]> {
    if (!query) return {};

    const record: Record<string, string | string[]> = {};

    const append = (key: string, value: QueryValue) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        for (const item of value) append(key, item);
        return;
      }

      const existing = record[key];
      const stringValue = String(value);

      if (existing === undefined) record[key] = stringValue;
      else if (Array.isArray(existing)) existing.push(stringValue);
      else record[key] = [existing, stringValue];
    };

    if (query instanceof URLSearchParams) {
      for (const [key, value] of query) append(key, value);
      return record;
    }

    const entries =
      Symbol.iterator in Object(query)
        ? (query as Iterable<readonly [string, QueryValue]>)
        : Object.entries(query);

    for (const [key, value] of entries) append(key, value);

    return record;
  }

  /**
   * Converts supported form input into URL search parameters.
   */
  private toFormBody(input: FormInput) {
    if (input instanceof URLSearchParams) return input;

    const body = new URLSearchParams();
    if (!input) return body;

    for (const [key, value] of Object.entries(input)) this.appendFormValue(body, key, value);

    return body;
  }

  /**
   * Appends one form value or value list to a form body.
   */
  private appendFormValue(body: URLSearchParams, key: string, value: FormValue) {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      for (const item of value) this.appendFormValue(body, key, item);
      return;
    }

    body.append(key, String(value));
  }

  /**
   * Builds Bbox form headers for a form request.
   */
  private formHeaders(body: FormInput, headers: HeadersRecord | undefined): HeadersRecord {
    const form = this.toFormBody(body);

    return {
      ForceData: form.toString(),
      ...headers,
    };
  }

  /**
   * Parses an optional boolean environment variable.
   */
  private static parseBoolean(value: string | undefined, label = "boolean value") {
    if (value === undefined || value === "") return undefined;

    const normalizedValue = value.toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalizedValue)) return true;
    if (["0", "false", "no", "off"].includes(normalizedValue)) return false;

    throw new Error(`Invalid ${label}: ${value}`);
  }
}
