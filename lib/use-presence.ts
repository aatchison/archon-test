"use client";

import { useState, useCallback } from "react";
import type { HubEventEnvelope, PresencePayload } from "./realtime-types";

export function usePresence(currentUserId: string) {
  const [viewers, setViewers] = useState<PresencePayload["viewers"]>([]);

  const handlePresenceChanged = useCallback(
    (envelope: HubEventEnvelope) => {
      if (envelope.event.type !== "presence:changed") return;
      const { viewers: allViewers } = envelope.event.data;
      setViewers(allViewers.filter((v) => v.userId !== currentUserId));
    },
    [currentUserId],
  );

  return { viewers, handlePresenceChanged };
}
