"use client";

import React, { useState } from "react";
import { toggleDone, deleteTask } from "@/actions/tasks";
import { TaskEditForm } from "@/components/task-edit-form";
import { LabelBadge } from "@/components/label-badge";

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
  priority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  dueDate: string | null;
  listId: string;
  labels: Label[];
}

interface TaskItemProps {
  task: Task;
  allLabels: Label[];
}

export default function TaskItem({ task, allLabels }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const priorityColors = {
    HIGH: "bg-red-500 text-white",
    MEDIUM: "bg-amber-500 text-white",
    LOW: "bg-blue-500 text-white",
    NONE: "hidden",
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    const diffTime = compareDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", className: "text-red-500" };
    if (diffDays === 0) return { text: "Today", className: "text-gray-600" };
    if (diffDays === 1) return { text: "Tomorrow", className: "text-gray-600" };

    return {
      text: date.toLocaleDateString(),
      className: "text-gray-400",
    };
  };

  const dueDateDisplay = formatDueDate(task.dueDate);

  return (
    <div className="flex flex-col border-b">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={task.done}
            onChange={async () => {
              await toggleDone(task.id);
            }}
          />
          <button
            type="button"
            className={`cursor-pointer text-left bg-transparent border-none p-0 focus:outline-none ${task.done ? "line-through text-gray-500" : ""}`}
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </button>
          {task.priority !== "NONE" && (
            <span
              className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority]}`}
            >
              {task.priority}
            </span>
          )}
          <div className="flex gap-1">
            {task.labels?.map((label) => (
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
        <button
          type="button"
          onClick={async () => {
            await deleteTask(task.id);
          }}
          className="text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
      {isEditing && (
        <div className="px-2 pb-4">
          <TaskEditForm
            task={{
              ...task,
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
