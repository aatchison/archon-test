"use client";

import { useState, useEffect, useRef } from "react";

interface ConnectionStatusProps {
  status: "connecting" | "connected" | "disconnected";
}

const statusConfig = {
  connected: { color: "bg-green-500", text: "Connected" },
  connecting: { color: "bg-yellow-500 animate-pulse", text: "Reconnecting..." },
  disconnected: { color: "bg-red-500", text: "Disconnected" },
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (status === "connected") {
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    } else {
      setVisible(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  if (!visible) return null;

  const config = statusConfig[status];

  return (
    <div aria-live="polite" className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="sr-only">{config.text}</span>
    </div>
  );
}
