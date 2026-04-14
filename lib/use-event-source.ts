"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SseTransport } from "./sse-transport";
import { REALTIME_CONFIG } from "./realtime-config";
import type { HubEventEnvelope, HubEvent } from "./realtime-types";

type SseStatus = "connecting" | "connected" | "disconnected";
type EventHandler = (envelope: HubEventEnvelope) => void;

const CHANNEL_NAME = "todo-sync";

export function useEventSource(
  listId: string,
  currentUserId: string,
  handlers: Partial<Record<HubEvent["type"], EventHandler>>,
) {
  const [status, setStatus] = useState<SseStatus>("disconnected");
  const seenIds = useRef(new Set<string>());

  const handleEvent = useCallback(
    (envelope: HubEventEnvelope) => {
      if (seenIds.current.has(envelope.id)) return;
      seenIds.current.add(envelope.id);
      if (seenIds.current.size > REALTIME_CONFIG.deduplicationSetSize) {
        const first = seenIds.current.values().next().value;
        if (first) seenIds.current.delete(first);
      }
      if (envelope.userId === currentUserId) return;
      const handler = handlers[envelope.event.type];
      handler?.(envelope);
    },
    [currentUserId, handlers],
  );

  useEffect(() => {
    const transport = new SseTransport(`/api/events/lists/${listId}`, {
      onEvent: handleEvent,
      onStatusChange: setStatus,
      onReconnect: () => {
        seenIds.current.clear();
      },
    });
    transport.connect();
    return () => {
      transport.disconnect();
    };
  }, [listId, handleEvent]);

  return { status };
}

export function broadcastOptimisticUpdate(envelope: HubEventEnvelope): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(envelope);
    bc.close();
  } catch {}
}

export function useOptimisticBroadcast(
  onUpdate: (envelope: HubEventEnvelope) => void,
) {
  const seenIds = useRef(new Set<string>());
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (event) => {
      const envelope = event.data as HubEventEnvelope;
      if (seenIds.current.has(envelope.id)) return;
      seenIds.current.add(envelope.id);
      if (seenIds.current.size > REALTIME_CONFIG.deduplicationSetSize) {
        const first = seenIds.current.values().next().value;
        if (first) seenIds.current.delete(first);
      }
      onUpdate(envelope);
    };
    return () => bc.close();
  }, [onUpdate]);
}
