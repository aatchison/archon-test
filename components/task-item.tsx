"use client";

import { useState } from "react";
import { toggleDone, deleteTask } from "@/actions/tasks";
import { TaskEditForm } from "@/components/task-edit-form";
import { LabelBadge } from "@/components/label-badge";
import { formatDueDate } from "@/lib/dates";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: string;
  dueDate: Date | string | null;
  listId: string;
  labels: Label[];
}

interface TaskItemProps {
  task: Task;
  allLabels: Label[];
  canEdit?: boolean;
}

export default function TaskItem({
  task,
  allLabels,
  canEdit = true,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const priorityColors: Record<string, string> = {
    HIGH: "bg-red-500 text-white",
    MEDIUM: "bg-amber-500 text-white",
    LOW: "bg-blue-500 text-white",
    NONE: "hidden",
  };

  const dueDateDisplay = formatDueDate(task.dueDate);

  return (
    <div className="flex flex-col border-b">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={task.done}
            aria-label="Toggle task completion"
            onChange={async () => {
              try {
                await toggleDone(task.id);
              } catch (error) {
                console.error("Failed to toggle task:", error);
              }
            }}
          />
          {canEdit ? (
            <button
              type="button"
              className={`cursor-pointer text-left bg-transparent border-none p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${task.done ? "line-through text-gray-500" : ""}`}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </button>
          ) : (
            <span className={task.done ? "line-through text-gray-500" : ""}>
              {task.title}
            </span>
          )}
          {task.priority !== "NONE" && (
            <span
              className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority]}`}
            >
              {task.priority}
            </span>
          )}
          <div className="flex gap-1">
            {task.labels.map((label) => (
              <LabelBadge
                key={label.id}
                name={label.name}
                color={label.color}
              />
            ))}
          </div>
          {dueDateDisplay && (
            <span className={`text-sm ${dueDateDisplay.className}`}>
              {dueDateDisplay.text}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={async () => {
              try {
                await deleteTask(task.id);
              } catch (error) {
                console.error("Failed to delete task:", error);
              }
            }}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
      {isEditing && (
        <div className="px-2 pb-4">
          <TaskEditForm
            task={{
              ...task,
              dueDate: task.dueDate
                ? new Date(task.dueDate).toISOString().split("T")[0]
                : null,
              labels: task.labels.map((l) => ({ labelId: l.id })),
            }}
            allLabels={allLabels}
            onClose={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
