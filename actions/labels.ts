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
  if (!data.name?.trim()) throw new Error("Name is required");
  if (data.color && !/^#[0-9a-fA-F]{6}$/.test(data.color))
    throw new Error("Invalid color format");

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

  if (data.name !== undefined && !data.name?.trim()) {
    throw new Error("Name cannot be empty");
  }
  if (data.color && !/^#[0-9a-fA-F]{6}$/.test(data.color))
    throw new Error("Invalid color format");

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

  try {
    await db.taskLabel.create({
      data: {
        taskId,
        labelId,
      },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      // Already exists — idempotent, return silently
      return;
    }
    throw error;
  }

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

  try {
    await db.taskLabel.delete({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code !== "P2025") throw error;
    // Already removed — idempotent
  }

  revalidatePath(`/lists/${task.listId}`);
}
