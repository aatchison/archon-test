"use client";

import { toggleDone, deleteTask } from "@/actions/tasks";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  dueDate?: string;
  listId: string;
}

export default function TaskItem({ task }: { task: Task }) {
  const priorityColors = {
    HIGH: "bg-red-500 text-white",
    MEDIUM: "bg-amber-500 text-white",
    LOW: "bg-blue-500 text-white",
    NONE: "hidden",
  };

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.done}
          onChange={async () => {
            await toggleDone(task.id);
          }}
        />
        <span className={task.done ? "line-through text-gray-500" : ""}>
          {task.title}
        </span>
        {task.priority !== "NONE" && (
          <span
            className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority]}`}
          >
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span className="text-sm text-gray-400">{task.dueDate}</span>
        )}
      </div>
      <button
        onClick={async () => {
          await deleteTask(task.id);
        }}
        className="text-red-500 hover:text-red-700"
      >
        Delete
      </button>
    </div>
  );
}
