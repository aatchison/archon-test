"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createLabel(data: { name: string; color: string }) {
  const session = await getSession();
  if (!data.name) throw new Error("Name is required");

  await db.label.create({
    data: {
      name: data.name,
      color: data.color,
      userId: session.user.id,
    },
  });

  revalidatePath("/labels");
}

export async function updateLabel(
  id: string,
  data: { name?: string; color?: string },
) {
  const session = await getSession();
  const label = await db.label.findUnique({ where: { id } });

  if (!label || label.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  if (data.name !== undefined && !data.name) {
    throw new Error("Name cannot be empty");
  }

  await db.label.update({
    where: { id },
    data,
  });

  revalidatePath("/labels");
}

export async function deleteLabel(id: string) {
  const session = await getSession();
  const label = await db.label.findUnique({ where: { id } });

  if (!label || label.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await db.label.delete({ where: { id } });

  revalidatePath("/labels");
}

export async function addLabelToTask(taskId: string, labelId: string) {
  const session = await getSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { list: true },
  });
  const label = await db.label.findUnique({ where: { id: labelId } });

  if (!task || !task.list || task.list.ownerId !== session.user.id) {
    throw new Error("Unauthorized");
  }
  if (!label || label.userId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await db.taskLabel.create({
    data: {
      taskId,
      labelId,
    },
  });

  revalidatePath(`/lists/${task.listId}`);
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
  const session = await getSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { list: true },
  });

  if (!task || !task.list || task.list.ownerId !== session.user.id) {
    throw new Error("Unauthorized");
  }

  await db.taskLabel.delete({
    where: {
      taskId_labelId: {
        taskId,
        labelId,
      },
    },
  });

  revalidatePath(`/lists/${task.listId}`);
}
