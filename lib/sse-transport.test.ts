import { describe, it, expect, afterEach } from "bun:test";
import { SseTransport } from "@/lib/sse-transport";
import { REALTIME_CONFIG } from "@/lib/realtime-config";

describe("SseTransport", () => {
  let transport: SseTransport;

  afterEach(() => {
    transport?.disconnect();
  });

  it("starts with disconnected status", () => {
    transport = new SseTransport("/test", { onEvent: () => {} });
    expect(transport.status).toBe("disconnected");
  });

  it("parses SSE data lines into objects", () => {
    const received: unknown[] = [];
    transport = new SseTransport("/test", {
      onEvent: (data) => received.push(data),
    });
    const line = 'data: {"id":"1","event":{"type":"task:updated"}}';
    transport._parseLine(line);
    expect(received).toHaveLength(1);
    expect((received[0] as { id: string }).id).toBe("1");
  });

  it("ignores keepalive comments", () => {
    const received: unknown[] = [];
    transport = new SseTransport("/test", {
      onEvent: (data) => received.push(data),
    });
    transport._parseLine(":keepalive");
    expect(received).toHaveLength(0);
  });

  it("ignores empty lines", () => {
    const received: unknown[] = [];
    transport = new SseTransport("/test", {
      onEvent: (data) => received.push(data),
    });
    transport._parseLine("");
    expect(received).toHaveLength(0);
  });

  it("calculates exponential backoff", () => {
    transport = new SseTransport("/test", { onEvent: () => {} });
    expect(transport._getBackoffMs(0)).toBe(REALTIME_CONFIG.reconnectBaseMs);
    expect(transport._getBackoffMs(1)).toBe(
      REALTIME_CONFIG.reconnectBaseMs * 2,
    );
    expect(transport._getBackoffMs(2)).toBe(
      REALTIME_CONFIG.reconnectBaseMs * 4,
    );
    expect(transport._getBackoffMs(100)).toBe(REALTIME_CONFIG.reconnectMaxMs);
  });
});
