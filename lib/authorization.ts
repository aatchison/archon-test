import { auth } from "./auth";
import { db } from "./db";

class Unauthorized extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "Unauthorized";
  }
}

async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Unauthorized();
  }
  return session.user.id;
}

export async function isOwner(listId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { ownerId: true },
    });
    return list?.ownerId === userId;
  } catch {
    return false;
  }
}

export async function canEdit(listId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { ownerId: true },
    });

    if (list?.ownerId === userId) return true;

    const member = await db.listMember.findUnique({
      where: {
        listId_userId: { listId, userId },
      },
      select: { role: true },
    });

    return member?.role === "EDITOR";
  } catch {
    return false;
  }
}

export async function canView(listId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { ownerId: true },
    });

    if (list?.ownerId === userId) return true;

    const member = await db.listMember.findUnique({
      where: {
        listId_userId: { listId, userId },
      },
    });

    return !!member;
  } catch {
    return false;
  }
}

export async function requireOwner(listId: string): Promise<string> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  if (list?.ownerId !== userId) {
    throw new Error("Not found");
  }
  return userId;
}

export async function requireEdit(listId: string): Promise<string> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  if (list?.ownerId === userId) return userId;

  const member = await db.listMember.findUnique({
    where: {
      listId_userId: { listId, userId },
    },
    select: { role: true },
  });

  if (member?.role !== "EDITOR") {
    throw new Error("Not found");
  }
  return userId;
}

export async function requireView(listId: string): Promise<string> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  if (list?.ownerId === userId) return userId;

  const member = await db.listMember.findUnique({
    where: {
      listId_userId: { listId, userId },
    },
  });

  if (!member) {
    throw new Error("Not found");
  }
  return userId;
}
