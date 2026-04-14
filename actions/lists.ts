"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/authorization";
import { eventHub } from "@/lib/event-hub";
import { ConflictError } from "@/lib/errors";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createList(name: string) {
  if (!name || name.trim() === "") {
    throw new Error("Name is required");
  }
  const userId = await getUserId();
  const trimmed = name.trim();
  const list = await db.list.create({
    data: { name: trimmed, ownerId: userId },
  });
  revalidatePath("/lists");
  return list;
}

export async function renameList(
  id: string,
  name: string,
  options?: { expectedVersion?: number; force?: boolean },
) {
  if (!name || name.trim() === "") {
    throw new Error("Name is required");
  }
  await requireOwner(id);
  const userId = await getUserId();
  const trimmed = name.trim();

  if (options?.expectedVersion !== undefined && !options.force) {
    const result = await db.list.updateMany({
      where: { id, version: options.expectedVersion },
      data: { name: trimmed, version: { increment: 1 } },
    });
    if (result.count === 0) {
      const current = await db.list.findUnique({ where: { id } });
      throw new ConflictError(
        "List was modified by another user",
        current?.version ?? 0,
      );
    }
  } else {
    await db.list.update({
      where: { id },
      data: { name: trimmed, version: { increment: 1 } },
    });
  }

  const updated = await db.list.findUnique({ where: { id } });
  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);

  if (updated) {
    eventHub.publish(id, {
      id: crypto.randomUUID(),
      userId,
      version: updated.version,
      timestamp: Date.now(),
      event: {
        type: "list:updated",
        data: { id: updated.id, name: updated.name, version: updated.version },
      },
    });
  }
  return updated;
}

export async function deleteList(id: string) {
  await requireOwner(id);
  await db.list.delete({ where: { id } });
  revalidatePath("/lists");
}
