"use client";

import type React from "react";
import { useState } from "react";
import { ColorPicker, COLORS } from "./color-picker";
import { createLabel, updateLabel } from "@/actions/labels";

interface LabelFormProps {
  label?: { id: string; name: string; color: string };
  onDone?: () => void;
}

export function LabelForm({ label, onDone }: LabelFormProps) {
  const [name, setName] = useState(label?.name || "");
  const [color, setColor] = useState(label?.color || COLORS[6].hex);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (label) {
        await updateLabel(label.id, { name, color });
      } else {
        await createLabel({ name, color });
      }
      onDone?.();
    } catch (error) {
      console.error("Failed to save label:", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 border rounded-lg bg-white"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="label-name" className="text-sm font-medium">
          Label Name
        </label>
        <input
          id="label-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1"
          placeholder="e.g. Urgent"
          required
        />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Color</legend>
        <ColorPicker selected={color} onSelect={setColor} />
      </fieldset>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </form>
  );
}
