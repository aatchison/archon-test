"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireEdit } from "@/lib/authorization";

type TaskInput = {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: Date;
};

export async function createTask(listId: string, data: TaskInput) {
  if (!data.title.trim()) throw new Error("Title is required");
  await requireEdit(listId);
  const task = await db.task.create({
    data: { ...data, title: data.title.trim(), listId },
  });
  revalidatePath(`/lists/${listId}`);
  return task;
}

export async function updateTask(id: string, data: Partial<TaskInput>) {
  const task = await db.task.findUnique({
    where: { id },
    select: { id: true, listId: true, done: true, title: true },
  });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  if (data.title !== undefined && !data.title.trim())
    throw new Error("Title is required");
  const normalizedData =
    data.title !== undefined ? { ...data, title: data.title.trim() } : data;
  const updated = await db.task.update({ where: { id }, data: normalizedData });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}

export async function deleteTask(id: string) {
  const task = await db.task.findUnique({
    where: { id },
    select: { id: true, listId: true, done: true, title: true },
  });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  await db.task.delete({ where: { id } });
  revalidatePath(`/lists/${task.listId}`);
}

export async function toggleDone(id: string) {
  const task = await db.task.findUnique({
    where: { id },
    select: { id: true, listId: true, done: true, title: true },
  });
  if (!task) throw new Error("Not found");
  await requireEdit(task.listId);
  const updated = await db.task.update({
    where: { id },
    data: { done: !task.done },
  });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}
