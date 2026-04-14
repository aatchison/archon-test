"use server";

import { requireOwner } from "@/lib/authorization";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { eventHub } from "@/lib/event-hub";
import { auth } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/realtime-types";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function addMember(
  listId: string,
  email: string,
  role: "EDITOR" | "VIEWER",
) {
  await requireOwner(listId);

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required");
  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const targetUser = await db.user.findUnique({
    where: { email: normalizedEmail },
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

  const currentUserId = await getUserId();
  eventHub.publish(listId, {
    id: crypto.randomUUID(),
    userId: currentUserId,
    version: 0,
    timestamp: Date.now(),
    event: {
      type: EVENT_TYPES.MEMBER_ADDED,
      data: {
        userId: targetUser.id,
        userName: targetUser.name ?? targetUser.email,
        role,
        listId,
      },
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

  const currentUserId = await getUserId();
  eventHub.publish(listId, {
    id: crypto.randomUUID(),
    userId: currentUserId,
    version: 0,
    timestamp: Date.now(),
    event: { type: EVENT_TYPES.MEMBER_REMOVED, data: { userId, listId } },
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
