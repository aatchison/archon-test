import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canView, canEdit } from "@/lib/authorization";
import ListClient from "./list-client";
import type { TaskPayload } from "@/lib/realtime-types";

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const searchParamsData = await searchParams;

  const allLabels = await db.label.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  const priority = searchParamsData.priority as string | undefined;
  const label = searchParamsData.label as string | string[] | undefined;
  const due = searchParamsData.due as string | undefined;
  const status = searchParamsData.status as string | undefined;

  if (!(await canView(id))) notFound();
  const userCanEdit = await canEdit(id);

  const list = await db.list.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        include: { labels: { include: { label: true } } },
      },
    },
  });

  if (!list) notFound();

  const initialTasks: TaskPayload[] = list.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    done: t.done,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    listId: t.listId,
    version: t.version,
  }));

  return (
    <ListClient
      listId={list.id}
      listName={list.name}
      initialTasks={initialTasks}
      allLabels={allLabels}
      canEdit={userCanEdit}
      currentUserId={session.user.id}
      currentFilters={{
        priority,
        label: Array.isArray(label) ? label : label ? [label] : undefined,
        due,
        status,
      }}
    />
  );
}
