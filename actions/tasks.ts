"use server";

import { revalidatePath } from "next/cache";
import { auth, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireEdit } from "@/lib/authorization";
import { eventHub } from "@/lib/event-hub";
import { ConflictError } from "@/lib/errors";
import { EVENT_TYPES, type TaskPayload } from "@/lib/realtime-types";

type TaskInput = {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: Date;
};

function toTaskPayload(task: {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: string;
  dueDate: Date | null;
  listId: string;
  version: number;
}): TaskPayload {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    done: task.done,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    listId: task.listId,
    version: task.version,
    labels:
      task.labels?.map((l) => ({ id: l.id, name: l.name, color: l.color })) ??
      [],
  };
}

export async function createTask(listId: string, data: TaskInput) {
  if (!data.title.trim()) throw new Error("Title is required");
  await requireEdit(listId);
  const userId = await getUserId();
  const task = await db.task.create({
    data: { ...data, title: data.title.trim(), listId },
  });
  revalidatePath(`/lists/${listId}`);
  eventHub.publish(listId, {
    id: crypto.randomUUID(),
    userId,
    version: task.version,
    timestamp: Date.now(),
    event: { type: EVENT_TYPES.TASK_CREATED, data: toTaskPayload(task) },
  });
  return task;
}

export async function updateTask(
  id: string,
  data: Partial<TaskInput>,
  options?: { expectedVersion?: number; force?: boolean },
) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  const userId = await getUserId();

  if (data.title !== undefined && !data.title.trim())
    throw new Error("Title is required");

  const normalizedData =
    data.title !== undefined ? { ...data, title: data.title.trim() } : data;

  if (options?.expectedVersion !== undefined && !options.force) {
    const result = await db.task.updateMany({
      where: { id, version: options.expectedVersion },
      data: { ...normalizedData, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await db.task.findUnique({ where: { id } });
      throw new ConflictError(
        "Task was modified by another user",
        current?.version ?? 0,
      );
    }
  } else {
    await db.task.update({
      where: { id },
      data: { ...normalizedData, version: { increment: 1 } },
    });
  }

  const updated = await db.task.findUnique({ where: { id } });
  if (!updated) throw new Error("Not found after update");

  revalidatePath(`/lists/${task.listId}`);
  eventHub.publish(task.listId, {
    id: crypto.randomUUID(),
    userId,
    version: updated.version,
    timestamp: Date.now(),
    event: { type: EVENT_TYPES.TASK_UPDATED, data: toTaskPayload(updated) },
  });
  return updated;
}

export async function deleteTask(id: string) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  const userId = await getUserId();
  await db.task.delete({ where: { id } });
  revalidatePath(`/lists/${task.listId}`);
  eventHub.publish(task.listId, {
    id: crypto.randomUUID(),
    userId,
    version: task.version,
    timestamp: Date.now(),
    event: { type: EVENT_TYPES.TASK_DELETED, data: toTaskPayload(task) },
  });
}

export async function toggleDone(
  id: string,
  options?: { expectedVersion?: number; force?: boolean },
) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  const userId = await getUserId();

  if (options?.expectedVersion !== undefined && !options.force) {
    const result = await db.task.updateMany({
      where: { id, version: options.expectedVersion },
      data: { done: !task.done, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await db.task.findUnique({ where: { id } });
      throw new ConflictError(
        "Task was modified by another user",
        current?.version ?? 0,
      );
    }
  } else {
    await db.task.update({
      where: { id },
      data: { done: !task.done, version: { increment: 1 } },
    });
  }

  const updated = await db.task.findUnique({ where: { id } });
  if (!updated) throw new Error("Not found after update");

  revalidatePath(`/lists/${task.listId}`);
  eventHub.publish(task.listId, {
    id: crypto.randomUUID(),
    userId,
    version: updated.version,
    timestamp: Date.now(),
    event: { type: EVENT_TYPES.TASK_UPDATED, data: toTaskPayload(updated) },
  });
  return updated;
}
