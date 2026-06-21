import { BboxClient, type BboxLogItem } from "../bbox";
import { DEFAULT_BBOX_LOGS_POLL_INTERVAL_MS, DEFAULT_LOKI_LABELS } from "./constants";
import { errorMessage } from "./logging";
import type {
  BboxLokiMetricsRecorder,
  BboxLogsClient,
  BboxLokiLogForwarderOptions,
  LokiEntry,
  LokiStream,
} from "./types";

const seenLogLimit = 50;

/**
 * Polls the Bbox device log endpoint and forwards new entries to Loki.
 */
export class BboxLokiLogForwarder {
  private readonly bbox: BboxLogsClient;
  private readonly labels: Record<string, string>;
  private readonly logger: Pick<Console, "error" | "warn">;
  private readonly metrics: BboxLokiMetricsRecorder | undefined;
  private readonly pollIntervalMs: number;
  private readonly pushUrl: URL;
  private readonly scrapeTimeoutMs: number;
  private readonly seenLogKeys = new Set<string>();
  private readonly seenLogQueue: string[] = [];
  private readonly tenantId: string | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;
  private login: Promise<void> | undefined;
  private poll: Promise<void> | undefined;
  private pollFailed = false;

  /**
   * Creates a Bbox log forwarder for one Loki push endpoint.
   */
  constructor(options: BboxLokiLogForwarderOptions) {
    this.bbox = options.bbox ?? new BboxClient();
    this.labels = options.labels ?? { ...DEFAULT_LOKI_LABELS };
    this.logger = options.logger ?? console;
    this.metrics = options.metrics;
    this.metrics?.recordEndpointUp("log", 0);
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_BBOX_LOGS_POLL_INTERVAL_MS;
    this.pushUrl = new URL(options.pushUrl);
    this.scrapeTimeoutMs = options.scrapeTimeoutMs ?? this.pollIntervalMs;
    this.tenantId = options.tenantId;
  }

  /**
   * Starts periodic Bbox log polling.
   */
  start() {
    if (this.interval) return;

    void this.pollOnce();
    this.interval = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  /**
   * Stops periodic Bbox log polling.
   */
  stop() {
    if (!this.interval) return;

    clearInterval(this.interval);
    this.interval = undefined;
  }

  /**
   * Polls Bbox logs once and pushes unseen entries to Loki.
   */
  async pollOnce() {
    if (this.poll) return false;

    const startedAt = Date.now();
    this.metrics?.recordLokiPollStart();
    this.poll = this.pushLogsWithTimeout()
      .then(() => {
        this.metrics?.recordLokiPollSuccess(this.elapsedSeconds(startedAt));
        this.reportPollRecovery();
      })
      .catch((error: unknown) => {
        this.metrics?.recordLokiPollError(this.elapsedSeconds(startedAt));
        this.reportPollFailure(error);
      })
      .finally(() => {
        this.poll = undefined;
      });

    await this.poll;
    return true;
  }

  /**
   * Logs the transition into a failed Loki polling state once.
   */
  private reportPollFailure(error: unknown) {
    if (this.pollFailed) return;

    this.pollFailed = true;
    this.logger.error(`Bbox Loki log forwarding failed: ${errorMessage(error)}`);
  }

  /**
   * Logs the transition back to successful Loki polling once.
   */
  private reportPollRecovery() {
    if (!this.pollFailed) return;

    this.pollFailed = false;
    this.logger.warn("Bbox Loki log forwarding recovered");
  }

  /**
   * Runs one log poll with the configured timeout.
   */
  private async pushLogsWithTimeout() {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error(`Bbox logs poll timed out after ${this.scrapeTimeoutMs}ms`));
    }, this.scrapeTimeoutMs);

    try {
      await Promise.race([
        this.pushLogs(controller.signal),
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
   * Authenticates with the Bbox API and retries once if the session expired.
   */
  private async pushLogs(signal?: AbortSignal) {
    await this.ensureLoggedIn(signal);

    try {
      await this.pushLogsFromBbox(signal);
    } catch (error) {
      if (!this.isAuthenticationError(error)) throw error;

      this.login = undefined;
      this.logger.warn("Bbox session expired; retrying log authentication once");
      await this.ensureLoggedIn(signal);
      await this.pushLogsFromBbox(signal);
    }
  }

  /**
   * Fetches the latest Bbox logs and sends entries not yet seen by this process.
   */
  private async pushLogsFromBbox(signal?: AbortSignal) {
    let response: Awaited<ReturnType<BboxLogsClient["getLogs"]>>;

    try {
      response = await this.bbox.getLogs({ signal });
      this.metrics?.recordEndpointUp("log", 1);
    } catch (error) {
      this.metrics?.recordEndpointUp("log", 0);
      throw error;
    }

    const entries = this.responseEntries(response).filter(
      (entry) => !this.seenLogKeys.has(entry.key),
    );

    if (entries.length === 0) return;

    await this.pushEntries(entries, signal);
    this.rememberEntries(entries);
  }

  /**
   * Converts the Bbox response into ordered Loki entries.
   */
  private responseEntries(response: Awaited<ReturnType<BboxLogsClient["getLogs"]>>) {
    const entries: LokiEntry[] = [];

    for (const group of response) {
      for (const logEntry of group.log ?? []) {
        entries.push(this.lokiEntry(logEntry));
      }
    }

    return entries.sort((left, right) =>
      Number(BigInt(left.timestampNs) - BigInt(right.timestampNs)),
    );
  }

  /**
   * Converts one Bbox log record into a Loki-compatible entry.
   */
  private lokiEntry(entry: BboxLogItem): LokiEntry {
    const event = this.stringValue(entry.log) || "UNKNOWN";
    const param = this.stringValue(entry.param);
    const date = this.stringValue(entry.date);

    return {
      event,
      key: [date, event, param].join("\0"),
      line: JSON.stringify(entry),
      timestampNs: this.timestampNs(date),
    };
  }

  /**
   * Converts a Bbox timestamp into Loki's nanosecond timestamp format.
   */
  private timestampNs(date: string) {
    const timestampMs = Date.parse(date);
    const safeTimestampMs = Number.isFinite(timestampMs) ? timestampMs : Date.now();

    return String(BigInt(safeTimestampMs) * 1_000_000n);
  }

  /**
   * Returns elapsed wall-clock seconds from a millisecond timestamp.
   */
  private elapsedSeconds(startedAt: number) {
    return (Date.now() - startedAt) / 1000;
  }

  /**
   * Pushes entries to Loki's HTTP push API.
   */
  private async pushEntries(entries: LokiEntry[], signal?: AbortSignal) {
    const response = await fetch(this.pushUrl, {
      method: "POST",
      body: JSON.stringify({
        streams: this.lokiStreams(entries),
      }),
      headers: {
        "Content-Type": "application/json",
        ...(this.tenantId ? { "X-Scope-OrgID": this.tenantId } : {}),
      },
      signal,
    });

    if (response.ok) return;

    const body = await response.text();
    throw new Error(
      `Loki push failed with HTTP ${response.status}: ${body.slice(0, 500) || response.statusText}`,
    );
  }

  /**
   * Groups entries into Loki streams by label set.
   */
  private lokiStreams(entries: LokiEntry[]) {
    const streams = new Map<string, LokiStream>();

    for (const entry of entries) {
      const streamLabels = {
        ...this.labels,
        event: entry.event,
      };
      const streamKey = JSON.stringify(streamLabels);
      let stream = streams.get(streamKey);

      if (!stream) {
        stream = {
          stream: streamLabels,
          values: [],
        };
        streams.set(streamKey, stream);
      }

      stream.values.push([entry.timestampNs, entry.line]);
    }

    return [...streams.values()];
  }

  /**
   * Tracks recently pushed Bbox log keys to dedupe the endpoint's repeated tail output.
   */
  private rememberEntries(entries: LokiEntry[]) {
    for (const entry of entries) {
      if (this.seenLogKeys.has(entry.key)) continue;

      this.seenLogKeys.add(entry.key);
      this.seenLogQueue.push(entry.key);
    }

    while (this.seenLogQueue.length > seenLogLimit) {
      const key = this.seenLogQueue.shift();
      if (key) this.seenLogKeys.delete(key);
    }
  }

  /**
   * Logs in to the Bbox API once before polling logs.
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
   * Converts unknown Bbox values into stable string values.
   */
  private stringValue(value: unknown) {
    if (value === undefined || value === null) return "";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(value) ?? "";
    } catch {
      return "";
    }
  }

  /**
   * Checks whether an error likely represents an expired or missing Bbox session.
   */
  private isAuthenticationError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;

    return "status" in error && (error.status === 401 || error.status === 403);
  }
}
