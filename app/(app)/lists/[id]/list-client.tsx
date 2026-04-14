"use client";

import { useRouter } from "next/navigation";
import TaskItem from "@/components/task-item";
import TaskForm from "@/components/task-form";
import { TaskFilters } from "@/components/task-filters";
import { TaskListProvider, useTaskList } from "@/lib/use-task-list";
import { useEventSource } from "@/lib/use-event-source";
import { usePresence } from "@/lib/use-presence";
import { PresenceIndicator } from "@/components/presence-indicator";
import { ConnectionStatus } from "@/components/connection-status";
import { ConflictDialog } from "@/components/conflict-dialog";
import type { TaskPayload, HubEventEnvelope } from "@/lib/realtime-types";

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
    clearConflict,
    applyOptimisticToggle,
    applyOptimisticDelete,
    handleTaskEvent,
  } = useTaskList();
  const { viewers, handlePresenceChanged } = usePresence(currentUserId);

  const eventHandlers = {
    "task:created": handleTaskEvent,
    "task:updated": handleTaskEvent,
    "task:deleted": handleTaskEvent,
    "presence:changed": handlePresenceChanged,
  } as Record<string, (envelope: HubEventEnvelope) => void>;

  const { status } = useEventSource(listId, currentUserId, eventHandlers);

  const pending = optimisticTasks.filter((t) => !t.done);
  const done = optimisticTasks.filter((t) => t.done);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{listName}</h1>
          <PresenceIndicator viewers={viewers} />
          <ConnectionStatus status={status} />
        </div>
        <a
          href={`/lists/${listId}/settings`}
          className="text-sm text-gray-400 hover:text-gray-900"
        >
          Settings
        </a>
      </div>
      <TaskFilters currentFilters={currentFilters} />
      {canEdit && <TaskForm listId={listId} />}
      <div className="mt-4 space-y-1">
        {pending.map((task) => (
          <TaskItem
            key={task.id}
            task={{ ...task, dueDate: task.dueDate, labels: [] }}
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
                task={{ ...task, dueDate: task.dueDate, labels: [] }}
                allLabels={allLabels}
                canEdit={canEdit}
                onOptimisticToggle={applyOptimisticToggle}
                onOptimisticDelete={applyOptimisticDelete}
                onConflict={(t) => router.refresh()}
              />
            ))}
          </>
        )}
        {optimisticTasks.length === 0 && (
          <p className="text-gray-400 text-sm mt-4 px-3">No tasks yet.</p>
        )}
      </div>
      <ConflictDialog
        task={
          conflictTask
            ? { id: conflictTask.id, title: conflictTask.title }
            : null
        }
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
