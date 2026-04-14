"use client";

import { useState } from "react";
import { updateTask } from "@/actions/tasks";
import { addLabelToTask, removeLabelFromTask } from "@/actions/labels";
import { LabelPicker } from "@/components/label-picker";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  listId: string;
  labels: { labelId: string }[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface TaskEditFormProps {
  task: Task;
  allLabels: Label[];
  onClose: () => void;
}

export function TaskEditForm({ task, allLabels, onClose }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [labelIds, setLabelIds] = useState(task.labels.map((l) => l.labelId));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await updateTask(task.id, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      const currentLabelIds = task.labels.map((l) => l.labelId);
      const added = labelIds.filter((id) => !currentLabelIds.includes(id));
      const removed = currentLabelIds.filter((id) => !labelIds.includes(id));

      await Promise.all([
        ...added.map((id) => addLabelToTask(task.id, id)),
        ...removed.map((id) => removeLabelFromTask(task.id, id)),
      ]);

      onClose();
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="edit-title"
          className="px-2 py-1 border rounded-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="edit-description"
          className="px-2 py-1 border rounded-md"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-priority" className="text-sm font-medium">
            Priority
          </label>
          <select
            id="edit-priority"
            className="px-2 py-1 border rounded-md"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
          >
            <option value="NONE">NONE</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-duedate" className="text-sm font-medium">
            Due Date
          </label>
          <input
            id="edit-duedate"
            type="date"
            className="px-2 py-1 border rounded-md"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Labels</label>
        <LabelPicker
          labels={allLabels}
          selectedIds={labelIds}
          onChange={setLabelIds}
        />
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
