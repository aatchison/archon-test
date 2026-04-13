import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import TaskItem from "@/components/task-item";
import TaskForm from "@/components/task-form";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const list = await db.list.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ done: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!list || list.ownerId !== session.user.id) notFound();

  const pending = list.tasks.filter((t: { done: boolean }) => !t.done);
  const done = list.tasks.filter((t: { done: boolean }) => t.done);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{list.name}</h1>
        <Link href={`/lists/${list.id}/settings`} className="text-sm text-gray-400 hover:text-gray-900">
          Settings
        </Link>
      </div>
      <TaskForm listId={list.id} />
      <div className="mt-4 space-y-1">
        {pending.map((task: any) => (
          <TaskItem key={task.id} task={task} />
        ))}
        {done.length > 0 && (
          <>
            <div className="border-t my-4" />
            <p className="text-xs text-gray-400 mb-2 px-3">Completed</p>
            {done.map((task: any) => (
              <TaskItem key={task.id} task={task} />
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
