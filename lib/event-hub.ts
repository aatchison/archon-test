import { EventEmitter } from "node:events";
import { EVENT_TYPES, type HubEventEnvelope } from "./realtime-types";
import { REALTIME_CONFIG } from "./realtime-config";

interface Subscriber {
  userId: string;
  userName: string;
  callback: (envelope: HubEventEnvelope) => void;
}

class EventHubImpl {
  private emitter = new EventEmitter();
  private subscribers = new Map<string, Subscriber[]>();
  private presence = new Map<string, Map<string, string>>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  subscribe(
    listId: string,
    userId: string,
    userName: string,
    callback: (envelope: HubEventEnvelope) => void,
  ): () => void {
    const subscriber: Subscriber = { userId, userName, callback };
    if (!this.subscribers.has(listId)) this.subscribers.set(listId, []);
    this.subscribers.get(listId)!.push(subscriber);
    if (!this.presence.has(listId)) this.presence.set(listId, new Map());
    this.presence.get(listId)!.set(userId, userName);
    const handler = (envelope: HubEventEnvelope) => callback(envelope);
    this.emitter.on(`list:${listId}`, handler);
    this.publishPresenceChanged(listId, userId);
    return () => {
      this.emitter.off(`list:${listId}`, handler);
      const subs = this.subscribers.get(listId);
      if (subs) {
        const idx = subs.indexOf(subscriber);
        if (idx !== -1) subs.splice(idx, 1);
        const hasOtherSubs = subs.some((s) => s.userId === userId);
        if (!hasOtherSubs) {
          this.presence.get(listId)?.delete(userId);
        }
      }
      this.publishPresenceChanged(listId, userId);
    };
  }

  publish(listId: string, envelope: HubEventEnvelope): void {
    this.emitter.emit(`list:${listId}`, envelope);
  }

  getConnectionCount(listId: string, userId: string): number {
    const subs = this.subscribers.get(listId);
    if (!subs) return 0;
    return subs.filter((s) => s.userId === userId).length;
  }

  getPresence(listId: string): { userId: string; userName: string }[] {
    const presenceMap = this.presence.get(listId);
    if (!presenceMap) return [];
    return Array.from(presenceMap.entries()).map(([userId, userName]) => ({
      userId,
      userName,
    }));
  }

  private publishPresenceChanged(listId: string, triggerUserId: string): void {
    const envelope: HubEventEnvelope = {
      id: crypto.randomUUID(),
      userId: triggerUserId,
      version: 0,
      timestamp: Date.now(),
      event: {
        type: EVENT_TYPES.PRESENCE_CHANGED,
        data: { viewers: this.getPresence(listId) },
      },
    };
    this.publish(listId, envelope);
  }

  private resetPresenceTimer(listId: string, userId: string): void {
    const key = `${listId}:${userId}`;
    this.clearPresenceTimer(listId, userId);
    this.presenceTimers.set(
      key,
      setTimeout(() => {
        this.presence.get(listId)?.delete(userId);
        this.presenceTimers.delete(key);
        this.publishPresenceChanged(listId, userId);
      }, REALTIME_CONFIG.presenceTimeoutMs),
    );
  }

  private clearPresenceTimer(listId: string, userId: string): void {
    const key = `${listId}:${userId}`;
    const timer = this.presenceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.presenceTimers.delete(key);
    }
  }

  reset(): void {
    this.emitter.removeAllListeners();
    this.subscribers.clear();
    this.presence.clear();
  }
}

export const eventHub = new EventHubImpl();
export const resetEventHub = () => eventHub.reset();
