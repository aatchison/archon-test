import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import TaskItem from "@/components/task-item";
import TaskForm from "@/components/task-form";
import { buildTaskWhere } from "@/lib/filters";
import { TaskFilters } from "@/components/task-filters";
import { canView, canEdit } from "@/lib/authorization";

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

  const where = buildTaskWhere(id, { priority, label, due, status });

  const list = await db.list.findUnique({
    where: { id },
    include: {
      tasks: {
        where,
        orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        include: { labels: { include: { label: true } } },
      },
    },
  });

  if (!(await canView(id))) notFound();
  if (!list) notFound();
  const userCanEdit = await canEdit(id);

  type TaskWithList = (typeof list.tasks)[number];
  const pending = list.tasks.filter((t: TaskWithList) => !t.done);
  const done = list.tasks.filter((t: TaskWithList) => t.done);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{list.name}</h1>
        <Link
          href={`/lists/${list.id}/settings`}
          className="text-sm text-gray-400 hover:text-gray-900"
        >
          Settings
        </Link>
      </div>
      <TaskFilters
        currentFilters={{
          priority,
          label: Array.isArray(label) ? label : label ? [label] : undefined,
          due,
          status,
        }}
      />
      {userCanEdit && <TaskForm listId={list.id} />}
      <div className="mt-4 space-y-1">
        {pending.map((task: TaskWithList) => (
          <TaskItem
            key={task.id}
            task={{ ...task, labels: task.labels.map((tl) => tl.label) }}
            allLabels={allLabels}
            canEdit={userCanEdit}
          />
        ))}
        {done.length > 0 && (
          <>
            <div className="border-t my-4" />
            <p className="text-xs text-gray-400 mb-2 px-3">Completed</p>
            {done.map((task: TaskWithList) => (
              <TaskItem
                key={task.id}
                task={{ ...task, labels: task.labels.map((tl) => tl.label) }}
                allLabels={allLabels}
                canEdit={userCanEdit}
              />
            ))}
          </>
        )}
        {list.tasks.length === 0 && (
          <p className="text-gray-400 text-sm mt-4 px-3">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}
