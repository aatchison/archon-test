"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TaskItem from "@/components/task-item";
import TaskForm from "@/components/task-form";
import { TaskFilters } from "@/components/task-filters";
import { TaskListProvider, useTaskList } from "@/lib/use-task-list";
import { useEventSource } from "@/lib/use-event-source";
import { usePresence } from "@/lib/use-presence";
import { PresenceIndicator } from "@/components/presence-indicator";
import { ConnectionStatus } from "@/components/connection-status";
import { ConflictDialog } from "@/components/conflict-dialog";
import {
  EVENT_TYPES,
  type TaskPayload,
  type HubEventEnvelope,
} from "@/lib/realtime-types";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface ListClientProps {
  listId: string;
  listName: string;
  initialTasks: TaskPayload[];
  allLabels: Label[];
  canEdit: boolean;
  currentUserId: string;
  currentFilters: {
    priority?: string;
    label?: string[];
    due?: string;
    status?: string;
  };
}

function ListContent({
  listId,
  listName,
  allLabels,
  canEdit,
  currentUserId,
  currentFilters,
}: Omit<ListClientProps, "initialTasks">) {
  const router = useRouter();
  const {
    optimisticTasks,
    conflictTask,
    setConflictTask,
    clearConflict,
    applyOptimisticToggle,
    applyOptimisticDelete,
    handleTaskEvent,
  } = useTaskList();
  const { viewers, handlePresenceChanged } = usePresence(currentUserId);

  const eventHandlers = useMemo(
    () =>
      ({
        [EVENT_TYPES.TASK_CREATED]: handleTaskEvent,
        [EVENT_TYPES.TASK_UPDATED]: handleTaskEvent,
        [EVENT_TYPES.TASK_DELETED]: handleTaskEvent,
        [EVENT_TYPES.PRESENCE_CHANGED]: handlePresenceChanged,
      }) as Record<string, (envelope: HubEventEnvelope) => void>,
    [handleTaskEvent, handlePresenceChanged],
  );

  const { status } = useEventSource(listId, currentUserId, eventHandlers);

  const pending = useMemo(
    () => optimisticTasks.filter((t) => !t.done),
    [optimisticTasks],
  );
  const done = useMemo(
    () => optimisticTasks.filter((t) => t.done),
    [optimisticTasks],
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{listName}</h1>
          <PresenceIndicator viewers={viewers} />
          <ConnectionStatus status={status} />
        </div>
        <Link
          href={`/lists/${listId}/settings`}
          className="text-sm text-gray-400 hover:text-gray-900"
        >
          Settings
        </Link>
      </div>
      <TaskFilters currentFilters={currentFilters} />
      {canEdit && <TaskForm listId={listId} />}
      <div className="mt-4 space-y-1">
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={{ ...task, dueDate: task.dueDate }}
            allLabels={allLabels}
            canEdit={canEdit}
            onOptimisticToggle={applyOptimisticToggle}
            onOptimisticDelete={applyOptimisticDelete}
            onConflict={(t) => router.refresh()}
          />
        ))}
        {done.length > 0 && (
          <>
            <div className="border-t my-4" />
            <p className="text-xs text-gray-400 mb-2 px-3">Completed</p>
            {done.map((task) => (
              <TaskItem
                key={task.id}
                task={{ ...task, dueDate: task.dueDate }}
                allLabels={allLabels}
                canEdit={canEdit}
                onOptimisticToggle={applyOptimisticToggle}
                onOptimisticDelete={applyOptimisticDelete}
                onConflict={(t) => setConflictTask(t)}
              />
            ))}
          </>
        )}
        {optimisticTasks.length === 0 && (
          <p className="text-gray-400 text-sm mt-4 px-3">No tasks yet.</p>
        )}
      </div>
      <ConflictDialog
        task={conflictTask}
        onRefresh={() => {
          clearConflict();
          router.refresh();
        }}
        onOverwrite={() => {
          clearConflict();
        }}
      />
    </div>
  );
}

export default function ListClient(props: ListClientProps) {
  return (
    <TaskListProvider initialTasks={props.initialTasks}>
      <ListContent {...props} />
    </TaskListProvider>
  );
}
