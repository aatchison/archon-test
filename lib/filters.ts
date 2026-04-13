export function buildTaskWhere(
  listId: string,
  params: {
    priority?: string;
    label?: string | string[];
    due?: string;
    status?: string;
  },
) {
  // Build a Prisma-compatible where object
  const where: Record<string, unknown> = { listId };

  if (params.priority && params.priority !== "any")
    where.priority = params.priority;
  if (params.status === "active") where.done = false;
  else if (params.status === "completed") where.done = true;

  if (params.due) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (params.due === "overdue") where.dueDate = { lt: now, not: null };
    else if (params.due === "today")
      where.dueDate = { gte: startOfDay, lte: endOfDay };
    else if (params.due === "week")
      where.dueDate = { gte: startOfDay, lte: endOfWeek };
  }

  const labelIds = Array.isArray(params.label)
    ? params.label
    : params.label
      ? [params.label]
      : [];
  if (labelIds.length > 0)
    where.labels = { some: { labelId: { in: labelIds } } };

  return where;
}
