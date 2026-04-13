import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ListCard from "@/components/list-card";
import ListForm from "@/components/list-form";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const lists = await db.list.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: true } },
      tasks: { where: { done: false, dueDate: { lte: threeDaysFromNow } }, select: { id: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Lists</h1>
        <ListForm />
      </div>
      {lists.length === 0 ? (
        <p className="text-gray-400 text-sm">No lists yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              taskCount={list._count.tasks}
              dueSoonCount={list.tasks.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
