"use client";

interface PresenceIndicatorProps {
  viewers: { userId: string; userName: string }[];
}

export function PresenceIndicator({ viewers }: PresenceIndicatorProps) {
  if (viewers.length === 0) return null;

  const shown = viewers.slice(0, 3);
  const overflow = viewers.length - 3;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${viewers.length} user${viewers.length !== 1 ? "s" : ""} viewing`}
      className="flex items-center gap-1"
    >
      {shown.map((v) => (
        <span
          key={v.userId}
          title={v.userName}
          className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center"
        >
          {v.userName.charAt(0).toUpperCase()}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-500">+{overflow}</span>
      )}
    </div>
  );
}
