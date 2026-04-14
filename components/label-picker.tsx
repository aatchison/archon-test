"use client";

import { useState } from "react";
import { LabelBadge } from "./label-badge";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelPickerProps {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function LabelPicker({
  labels,
  selectedIds,
  onChange,
}: LabelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleLabel = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedLabels = labels.filter((l) => selectedIds.includes(l.id));

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border rounded-md flex items-center gap-2"
      >
        <span>Labels</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-10 mt-1 w-48 bg-white border rounded-md shadow-lg p-2"
          role="listbox"
        >
          <div className="flex flex-col gap-1">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                role="option"
                onClick={() => toggleLabel(label.id)}
                aria-selected={selectedIds.includes(label.id)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 rounded"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{label.name}</span>
                {selectedIds.includes(label.id) && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
            {labels.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-gray-500 italic">
                No labels available
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {selectedLabels.map((label) => (
          <LabelBadge
            key={label.id}
            name={label.name}
            color={label.color}
            onRemove={() => toggleLabel(label.id)}
          />
        ))}
      </div>
    </div>
  );
}
