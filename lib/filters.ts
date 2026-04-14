import { MS_PER_DAY } from "./dates";

export function buildTaskWhere(
  listId: string,
  filterParams: {
    priority?: string;
    label?: string | string[];
    due?: string;
    status?: string;
  },
) {
  // Build a Prisma-compatible where object
  const where: Record<string, unknown> = { listId };

  if (filterParams.priority && filterParams.priority !== "any")
    where.priority = filterParams.priority;
  if (filterParams.status === "active") where.done = false;
  else if (filterParams.status === "completed") where.done = true;

  if (filterParams.due) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + MS_PER_DAY - 1);
    const endOfWeek = new Date(startOfDay.getTime() + 7 * MS_PER_DAY);
    if (filterParams.due === "overdue") where.dueDate = { lt: now, not: null };
    else if (filterParams.due === "today")
      where.dueDate = { gte: startOfDay, lte: endOfDay };
    else if (filterParams.due === "week")
      where.dueDate = { gte: startOfDay, lte: endOfWeek };
  }

  const labelIds = Array.isArray(filterParams.label)
    ? filterParams.label
    : filterParams.label
      ? [filterParams.label]
      : [];
  if (labelIds.length > 0)
    where.labels = { some: { labelId: { in: labelIds } } };

  return where;
}
