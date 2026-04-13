"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

type TaskInput = {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: Date;
};

export async function createTask(listId: string, data: TaskInput) {
  const session = await getSession();
  if (!data.title.trim()) throw new Error("Title is required");
  const list = await db.list.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== session.user.id) throw new Error("Not found");
  const task = await db.task.create({
    data: { ...data, title: data.title.trim(), listId },
  });
  revalidatePath(`/lists/${listId}`);
  return task;
}

export async function updateTask(id: string, data: Partial<TaskInput>) {
  const session = await getSession();
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  });
  if (!task || task.list.ownerId !== session.user.id)
    throw new Error("Not found");
  const updated = await db.task.update({ where: { id }, data });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}

export async function deleteTask(id: string) {
  const session = await getSession();
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  });
  if (!task || task.list.ownerId !== session.user.id)
    throw new Error("Not found");
  await db.task.delete({ where: { id } });
  revalidatePath(`/lists/${task.listId}`);
}

export async function toggleDone(id: string) {
  const session = await getSession();
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  });
  if (!task || task.list.ownerId !== session.user.id)
    throw new Error("Not found");
  const updated = await db.task.update({
    where: { id },
    data: { done: !task.done },
  });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}
