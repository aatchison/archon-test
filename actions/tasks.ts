'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export class Unauthorized extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'Unauthorized'
  }
}

async function getSession() {
  const session = await auth()
  if (!session) throw new Unauthorized()
  return session
}

export type TaskInput = {
  title: string
  description?: string
  priority?: string
  dueDate?: Date
}

export async function createTask(listId: string, data: TaskInput) {
  const session = await getSession()
  if (!data.title || data.title.trim() === '') {
    throw new Error('Title is required')
  }

  const list = await db.list.findUnique({
    where: { id: listId },
  })

  if (!list || list.userId !== session.user.id) {
    throw new Error('Unauthorized to add task to this list')
  }

  await db.task.create({
    data: {
      ...data,
      listId,
    },
  })

  revalidatePath(`/lists/${listId}`)
}

export async function updateTask(id: string, data: Partial<TaskInput>) {
  const session = await getSession()
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  })

  if (!task || task.list.userId !== session.user.id) {
    throw new Error('Unauthorized to update this task')
  }

  await db.task.update({
    where: { id },
    data,
  })

  revalidatePath(`/lists/${task.listId}`)
}

export async function deleteTask(id: string) {
  const session = await getSession()
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  })

  if (!task || task.list.userId !== session.user.id) {
    throw new Error('Unauthorized to delete this task')
  }

  await db.task.delete({
    where: { id },
  })

  revalidatePath(`/lists/${task.listId}`)
}

export async function toggleDone(id: string) {
  const session = await getSession()
  const task = await db.task.findUnique({
    where: { id },
    include: { list: true },
  })

  if (!task || task.list.userId !== session.user.id) {
    throw new Error('Unauthorized to toggle this task')
  }

  await db.task.update({
    where: { id },
    data: {
      done: !task.done,
    },
  })

  revalidatePath(`/lists/${task.listId}`)
}
