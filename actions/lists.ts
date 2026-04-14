"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/authorization";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function createList(name: string) {
  if (!name || name.trim() === "") {
    throw new Error("Name is required");
  }

  const session = await getSession();
  const trimmed = name.trim();
  const list = await db.list.create({
    data: {
      name: trimmed,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/lists");
  return list;
}

export async function renameList(id: string, name: string) {
  if (!name || name.trim() === "") {
    throw new Error("Name is required");
  }

  await requireOwner(id);

  const trimmed = name.trim();
  const updatedList = await db.list.update({
    where: { id },
    data: { name: trimmed },
  });

  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);
  return updatedList;
}

export async function deleteList(id: string) {
  await requireOwner(id);

  await db.list.delete({
    where: { id },
  });

  revalidatePath("/lists");
}
