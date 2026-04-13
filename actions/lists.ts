'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function createList(name: string) {
  if (!name || name.trim() === '') {
    throw new Error('Name is required');
  }

  const session = await getSession();
  const list = await db.list.create({
    data: {
      name,
      ownerId: session.user.id,
    },
  });

  revalidatePath('/lists');
  return list;
}

export async function renameList(id: string, name: string) {
  if (!name || name.trim() === '') {
    throw new Error('Name is required');
  }

  const session = await getSession();
  const list = await db.list.findUnique({
    where: { id },
  });

  if (!list || list.ownerId !== session.user.id) {
    throw new Error('Not found');
  }

  const updatedList = await db.list.update({
    where: { id },
    data: { name },
  });

  revalidatePath('/lists');
  revalidatePath(`/lists/${id}`);
  return updatedList;
}

export async function deleteList(id: string) {
  const session = await getSession();
  const list = await db.list.findUnique({
    where: { id },
  });

  if (!list || list.ownerId !== session.user.id) {
    throw new Error('Not found');
  }

  await db.list.delete({
    where: { id },
  });

  revalidatePath('/lists');
}
