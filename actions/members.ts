"use server";

import { requireOwner } from "@/lib/authorization";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addMember(
  listId: string,
  email: string,
  role: "EDITOR" | "VIEWER",
) {
  await requireOwner(listId);

  if (!email) throw new Error("Email is required");
  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const targetUser = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!targetUser) throw new Error("User not found");

  const existingMember = await db.listMember.findUnique({
    where: {
      listId_userId: {
        listId,
        userId: targetUser.id,
      },
    },
  });

  if (existingMember) throw new Error("User is already a member");

  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });

  if (list?.ownerId === targetUser.id)
    throw new Error("Cannot add owner as member");

  await db.listMember.create({
    data: {
      listId,
      userId: targetUser.id,
      role,
    },
  });

  revalidatePath(`/lists/${listId}/members`);
}

export async function removeMember(listId: string, userId: string) {
  if (!userId) throw new Error("User ID is required");
  await requireOwner(listId);

  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });

  if (list?.ownerId === userId) throw new Error("Cannot remove owner");

  await db.listMember.delete({
    where: {
      listId_userId: {
        listId,
        userId,
      },
    },
  });

  revalidatePath(`/lists/${listId}/members`);
}

export async function updateMemberRole(
  listId: string,
  userId: string,
  role: "EDITOR" | "VIEWER",
) {
  if (!userId) throw new Error("User ID is required");
  await requireOwner(listId);

  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });

  if (list?.ownerId === userId) throw new Error("Cannot change owner role");

  await db.listMember.update({
    where: {
      listId_userId: {
        listId,
        userId,
      },
    },
    data: { role },
  });

  revalidatePath(`/lists/${listId}/members`);
}
