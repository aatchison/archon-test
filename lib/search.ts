import type { PrismaClient } from "@prisma/client";

export interface SearchFilters {
  listId?: string;
  assigneeId?: string;
  priority?: string;
  status?: "active" | "completed";
  dueDate?: "overdue" | "today" | "week";
  sort?: "relevance" | "dueDate" | "createdAt" | "priority";
}

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: string;
  dueDate: Date | null;
  listId: string;
  listName: string;
  rank: number;
  snippet: string;
  labels: { id: string; name: string; color: string }[];
}

export interface SearchSuggestion {
  taskId: string;
  title: string;
  listId: string;
  listName: string;
}

export interface SearchResults {
  tasks: SearchResult[];
  total: number;
}

export function sanitizeQuery(raw: string): string {
  const words = raw
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/\"/g, ""));
  if (words.length === 0) return "";
  const quoted = words.map((w, i) => {
    if (i === words.length - 1) return '"' + w + '"*';
    return '"' + w + '"';
  });
  return quoted.join(" ");
}

const PAGE_SIZE = 20;

function buildOrderClause(sort?: string): string {
  switch (sort) {
    case "dueDate":
      return 'ORDER BY t."dueDate" IS NULL, t."dueDate" ASC';
    case "createdAt":
      return 'ORDER BY t."createdAt" DESC';
    case "priority":
      return "ORDER BY CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 WHEN 'LOW' THEN 2 ELSE 3 END ASC";
    default:
      return "ORDER BY bm25(task_fts, 5.0, 1.0)";
  }
}

function buildFilterClauses(filters: SearchFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.listId) {
    clauses.push('t."listId" = ?');
    params.push(filters.listId);
  }
  if (filters.assigneeId) {
    clauses.push('t."assigneeId" = ?');
    params.push(filters.assigneeId);
  }
  if (filters.priority && filters.priority !== "any") {
    clauses.push("t.priority = ?");
    params.push(filters.priority);
  }
  if (filters.status === "active") clauses.push("t.done = 0");
  else if (filters.status === "completed") clauses.push("t.done = 1");
  if (filters.dueDate) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const msPerDay = 24 * 60 * 60 * 1000;
    if (filters.dueDate === "overdue") {
      clauses.push('t."dueDate" < ? AND t."dueDate" IS NOT NULL');
      params.push(now.toISOString());
    } else if (filters.dueDate === "today") {
      const endOfDay = new Date(startOfDay.getTime() + msPerDay - 1);
      clauses.push('t."dueDate" >= ? AND t."dueDate" <= ?');
      params.push(startOfDay.toISOString(), endOfDay.toISOString());
    } else if (filters.dueDate === "week") {
      const endOfWeek = new Date(startOfDay.getTime() + 7 * msPerDay);
      clauses.push('t."dueDate" >= ? AND t."dueDate" <= ?');
      params.push(startOfDay.toISOString(), endOfWeek.toISOString());
    }
  }
  return { clauses, params };
}

export async function searchTasks(
  prisma: PrismaClient,
  userId: string,
  query: string,
  filters: SearchFilters = {},
  page = 1,
): Promise<SearchResults> {
  const ftsQuery = sanitizeQuery(query);
  if (!ftsQuery) return { tasks: [], total: 0 };
  const { clauses, params } = buildFilterClauses(filters);
  const orderClause = buildOrderClause(filters.sort);
  const offset = (page - 1) * PAGE_SIZE;
  const filterSQL = clauses.length > 0 ? "AND " + clauses.join(" AND ") : "";
  const baseQuery =
    'FROM task_fts JOIN "Task" t ON t.id = task_fts.task_id JOIN "List" l ON l.id = t."listId" WHERE task_fts MATCH ? AND (l."ownerId" = ? OR EXISTS (SELECT 1 FROM "ListMember" lm WHERE lm."listId" = l.id AND lm."userId" = ?)) ' +
    filterSQL;
  const baseParams = [ftsQuery, userId, userId, ...params];
  const countResult = await prisma.$queryRawUnsafe<[{ cnt: number }]>(
    "SELECT COUNT(*) as cnt " + baseQuery,
    ...baseParams,
  );
  const total = Number(countResult[0]?.cnt ?? 0) || 0;
  if (total === 0) return { tasks: [], total: 0 };
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      description: string | null;
      done: number;
      priority: string;
      dueDate: string | null;
      listId: string;
      listName: string;
      rank: number;
      snippet: string;
    }>
  >(
    "SELECT t.id, t.title, t.description, t.done, t.priority, t.\"dueDate\", t.\"listId\", l.name as \"listName\", bm25(task_fts, 5.0, 1.0) as rank, snippet(task_fts, 2, '<mark>', '</mark>', '...', 32) as snippet " +
      baseQuery +
      " " +
      orderClause +
      " LIMIT ? OFFSET ?",
    ...baseParams,
    PAGE_SIZE,
    offset,
  );
  const taskIds = rows.map((r) => r.id);
  const labels =
    taskIds.length > 0
      ? await prisma.$queryRawUnsafe<
          Array<{
            taskId: string;
            labelId: string;
            labelName: string;
            labelColor: string;
          }>
        >(
          'SELECT tl."taskId", l.id as "labelId", l.name as "labelName", l.color as "labelColor" FROM "TaskLabel" tl JOIN "Label" l ON l.id = tl."labelId" WHERE tl."taskId" IN (' +
            taskIds.map(() => "?").join(",") +
            ")",
          ...taskIds,
        )
      : [];
  const labelsByTask = new Map<
    string,
    { id: string; name: string; color: string }[]
  >();
  for (const l of labels) {
    if (!labelsByTask.has(l.taskId)) labelsByTask.set(l.taskId, []);
    labelsByTask
      .get(l.taskId)!
      .push({ id: l.labelId, name: l.labelName, color: l.labelColor });
  }
  const tasks: SearchResult[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    done: Boolean(row.done),
    priority: row.priority,
    dueDate: row.dueDate ? new Date(row.dueDate) : null,
    listId: row.listId,
    listName: row.listName,
    rank: row.rank,
    snippet: row.snippet,
    labels: labelsByTask.get(row.id) ?? [],
  }));
  return { tasks, total };
}

export async function getSearchSuggestions(
  prisma: PrismaClient,
  userId: string,
  query: string,
): Promise<SearchSuggestion[]> {
  const ftsQuery = sanitizeQuery(query);
  if (!ftsQuery) return [];
  const rows = await prisma.$queryRawUnsafe<
    Array<{ taskId: string; title: string; listId: string; listName: string }>
  >(
    'SELECT t.id as "taskId", t.title, t."listId", l.name as "listName" FROM task_fts JOIN "Task" t ON t.id = task_fts.task_id JOIN "List" l ON l.id = t."listId" WHERE task_fts MATCH ? AND (l."ownerId" = ? OR EXISTS (SELECT 1 FROM "ListMember" lm WHERE lm."listId" = l.id AND lm."userId" = ?)) ORDER BY bm25(task_fts, 5.0, 1.0) LIMIT 5',
    ftsQuery,
    userId,
    userId,
  );
  return rows;
}

export async function rebuildSearchIndex(prisma: PrismaClient): Promise<void> {
  await prisma.$queryRawUnsafe("DELETE FROM task_fts");
  await prisma.$queryRawUnsafe(
    "INSERT INTO task_fts(task_id, title, description) SELECT id, title, COALESCE(description, '') FROM \"Task\"",
  );
}
