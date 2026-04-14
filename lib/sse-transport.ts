import { REALTIME_CONFIG } from "./realtime-config";
import type { HubEventEnvelope } from "./realtime-types";

type SseStatus = "connecting" | "connected" | "disconnected";

interface SseTransportOptions {
  onEvent: (envelope: HubEventEnvelope) => void;
  onReconnect?: () => void;
  onStatusChange?: (status: SseStatus) => void;
}

export class SseTransport {
  private url: string;
  private options: SseTransportOptions;
  private abortController: AbortController | null = null;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _status: SseStatus = "disconnected";

  constructor(url: string, options: SseTransportOptions) {
    this.url = url;
    this.options = options;
  }

  get status(): SseStatus {
    return this._status;
  }

  private setStatus(status: SseStatus) {
    this._status = status;
    this.options.onStatusChange?.(status);
  }

  async connect(): Promise<void> {
    this.disconnect();
    this.setStatus("connecting");

    try {
      this.abortController = new AbortController();
      const response = await fetch(this.url, {
        signal: this.abortController.signal,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      this.setStatus("connected");
      this.retryCount = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          this._parseLine(line.trim());
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }

    this.setStatus("disconnected");
    this.scheduleReconnect();
  }

  disconnect(): void {
    this.abortController?.abort();
    this.abortController = null;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.setStatus("disconnected");
  }

  private scheduleReconnect(): void {
    const delay = this._getBackoffMs(this.retryCount);
    this.retryCount++;
    this.retryTimeout = setTimeout(() => {
      this.options.onReconnect?.();
      this.connect();
    }, delay);
  }

  _parseLine(line: string): void {
    if (!line || line.startsWith(":")) return;
    if (!line.startsWith("data: ")) return;
    try {
      const json = line.slice(6);
      const envelope = JSON.parse(json) as HubEventEnvelope;
      this.options.onEvent(envelope);
    } catch {
      // Ignore parse errors
    }
  }

  _getBackoffMs(attempt: number): number {
    const delay = REALTIME_CONFIG.reconnectBaseMs * 2 ** attempt;
    return Math.min(delay, REALTIME_CONFIG.reconnectMaxMs);
  }
}
