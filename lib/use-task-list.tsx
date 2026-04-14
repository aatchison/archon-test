"use client";

import { createContext, useContext, useState, useOptimistic, useCallback, useTransition } from "react";
import type { HubEventEnvelope, TaskPayload } from "./realtime-types";

interface TaskListContextValue {
  tasks: TaskPayload[];
  optimisticTasks: TaskPayload[];
  conflictTask: TaskPayload | null;
  clearConflict: () => void;
  applyOptimisticToggle: (taskId: string) => void;
  applyOptimisticDelete: (taskId: string) => void;
  applyOptimisticCreate: (task: TaskPayload) => void;
  handleTaskEvent: (envelope: HubEventEnvelope) => void;
}

const TaskListContext = createContext<TaskListContextValue | null>(null);

export function useTaskList() {
  const ctx = useContext(TaskListContext);
  if (!ctx) throw new Error("useTaskList must be used within TaskListProvider");
  return ctx;
}

export function TaskListProvider({
  initialTasks,
  children,
}: {
  initialTasks: TaskPayload[];
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<TaskPayload[]>(initialTasks);
  const [conflictTask, setConflictTask] = useState<TaskPayload | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticTasks, applyOptimistic] = useOptimistic(
    tasks,
    (state: TaskPayload[], action: { type: string; taskId?: string; task?: TaskPayload }) => {
      switch (action.type) {
        case "toggle":
          return state.map((t) => t.id === action.taskId ? { ...t, done: !t.done } : t);
        case "delete":
          return state.filter((t) => t.id !== action.taskId);
        case "create":
          return action.task ? [...state, action.task] : state;
        default:
          return state;
      }
    },
  );

  const applyOptimisticToggle = useCallback(
    (taskId: string) => { startTransition(() => { applyOptimistic({ type: "toggle", taskId }); }); },
    [applyOptimistic, startTransition],
  );

  const applyOptimisticDelete = useCallback(
    (taskId: string) => { startTransition(() => { applyOptimistic({ type: "delete", taskId }); }); },
    [applyOptimistic, startTransition],
  );

  const applyOptimisticCreate = useCallback(
    (task: TaskPayload) => { startTransition(() => { applyOptimistic({ type: "create", task }); }); },
    [applyOptimistic, startTransition],
  );

  const handleTaskEvent = useCallback(
    (envelope: HubEventEnvelope) => {
      const { event } = envelope;
      setTasks((prev) => {
        switch (event.type) {
          case "task:created":
            if (prev.some((t) => t.id === event.data.id)) return prev;
            return [...prev, event.data];
          case "task:updated":
            return prev.map((t) => t.id === event.data.id && event.data.version > t.version ? event.data : t);
          case "task:deleted":
            return prev.filter((t) => t.id !== event.data.id);
          default:
            return prev;
        }
      });
    },
    [],
  );

  const clearConflict = useCallback(() => setConflictTask(null), []);

  return (
    <TaskListContext.Provider
      value={{
        tasks,
        optimisticTasks,
        conflictTask,
        clearConflict,
        applyOptimisticToggle,
        applyOptimisticDelete,
        applyOptimisticCreate,
        handleTaskEvent,
      }}
    >
      {children}
    </TaskListContext.Provider>
  );
}
