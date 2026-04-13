import React from "react";

interface LabelBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
}

export function LabelBadge({ name, color, onRemove }: LabelBadgeProps) {
  return (
    <span
      style={{ backgroundColor: color }}
      className="inline-flex items-center px-2 py-1 rounded-full text-white text-xs font-medium"
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:text-gray-200 focus:outline-none"
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
