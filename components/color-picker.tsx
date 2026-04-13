"use client";

export const COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#22c55e" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
];

export function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => (
        <button
          key={color.hex}
          type="button"
          onClick={() => onSelect(color.hex)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            selected === color.hex
              ? "ring-2 ring-offset-2 ring-black scale-110"
              : "border-transparent"
          }`}
          style={{ backgroundColor: color.hex }}
          title={color.name}
        />
      ))}
    </div>
  );
}
