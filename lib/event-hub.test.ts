import { describe, it, expect, beforeEach, mock } from "bun:test";
import { eventHub, resetEventHub } from "@/lib/event-hub";
import type { HubEventEnvelope } from "@/lib/realtime-types";

function makeEnvelope(overrides: Partial<HubEventEnvelope> = {}): HubEventEnvelope {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    version: 1,
    timestamp: Date.now(),
    event: { type: "task:updated", data: { id: "t1", title: "Test", description: null, done: false, priority: "NONE", dueDate: null, listId: "list-1", version: 1 } },
    ...overrides,
  };
}

describe("EventHub", () => {
  beforeEach(() => { resetEventHub(); });

  it("delivers published events to subscribers", () => {
    const received: HubEventEnvelope[] = [];
    eventHub.subscribe("list-1", "user-1", "User 1", (env) => received.push(env));
    const envelope = makeEnvelope();
    eventHub.publish("list-1", envelope);
    const nonPresence = received.filter((e) => e.event.type !== "presence:changed");
    expect(nonPresence).toHaveLength(1);
    expect(nonPresence[0].event.type).toBe("task:updated");
  });

  it("stops delivering after unsubscribe", () => {
    const received: HubEventEnvelope[] = [];
    const unsub = eventHub.subscribe("list-1", "user-1", "User 1", (env) => received.push(env));
    unsub();
    eventHub.publish("list-1", makeEnvelope());
    const nonPresence = received.filter((e) => e.event.type !== "presence:changed");
    expect(nonPresence).toHaveLength(0);
  });

  it("fans out to multiple subscribers on same list", () => {
    const received1: HubEventEnvelope[] = [];
    const received2: HubEventEnvelope[] = [];
    eventHub.subscribe("list-1", "user-1", "User 1", (env) => received1.push(env));
    eventHub.subscribe("list-1", "user-2", "User 2", (env) => received2.push(env));
    eventHub.publish("list-1", makeEnvelope());
    expect(received1.filter((e) => e.event.type !== "presence:changed")).toHaveLength(1);
    expect(received2.filter((e) => e.event.type !== "presence:changed")).toHaveLength(1);
  });

  it("does not cross list boundaries", () => {
    const received: HubEventEnvelope[] = [];
    eventHub.subscribe("list-1", "user-1", "User 1", (env) => received.push(env));
    eventHub.publish("list-2", makeEnvelope());
    expect(received.filter((e) => e.event.type !== "presence:changed")).toHaveLength(0);
  });

  it("tracks presence on subscribe", () => {
    eventHub.subscribe("list-1", "user-1", "User 1", () => {});
    eventHub.subscribe("list-1", "user-2", "User 2", () => {});
    const presence = eventHub.getPresence("list-1");
    expect(presence).toHaveLength(2);
    expect(presence.map((p) => p.userId)).toContain("user-1");
    expect(presence.map((p) => p.userId)).toContain("user-2");
  });

  it("removes from presence on unsubscribe", () => {
    eventHub.subscribe("list-1", "user-1", "User 1", () => {});
    const unsub2 = eventHub.subscribe("list-1", "user-2", "User 2", () => {});
    unsub2();
    const presence = eventHub.getPresence("list-1");
    expect(presence).toHaveLength(1);
    expect(presence[0].userId).toBe("user-1");
  });

  it("publishes presence:changed on subscribe and unsubscribe", () => {
    const received: HubEventEnvelope[] = [];
    eventHub.subscribe("list-1", "user-1", "User 1", (env) => received.push(env));
    const unsub = eventHub.subscribe("list-1", "user-2", "User 2", () => {});
    expect(received.filter((e) => e.event.type === "presence:changed").length).toBeGreaterThanOrEqual(1);
    unsub();
    expect(received.filter((e) => e.event.type === "presence:changed").length).toBeGreaterThanOrEqual(2);
  });

  it("does not duplicate presence for same user", () => {
    eventHub.subscribe("list-1", "user-1", "User 1", () => {});
    eventHub.subscribe("list-1", "user-1", "User 1", () => {});
    expect(eventHub.getPresence("list-1")).toHaveLength(1);
  });

  it("returns empty presence for unknown list", () => {
    expect(eventHub.getPresence("nonexistent")).toEqual([]);
  });
});
