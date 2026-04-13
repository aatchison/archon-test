import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LabelForm } from "@/components/label-form";
import { LabelBadge } from "@/components/label-badge";
import { deleteLabel } from "@/actions/labels";

export default async function LabelsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const labels = await db.label.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Labels</h1>
        <LabelForm />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {labels.map((label) => (
          <div
            key={label.id}
            className="p-4 border rounded-lg bg-white flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <LabelBadge name={label.name} color={label.color} />
              <span className="text-sm text-gray-500">
                {label._count.tasks} tasks
              </span>
            </div>
            <form
              action={async () => {
                "use server";
                await deleteLabel(label.id);
              }}
            >
              <button
                className="text-sm text-red-600 hover:text-red-800 font-medium"
                type="submit"
              >
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
      {labels.length === 0 && (
        <p className="text-center text-gray-500 py-10">
          No labels created yet.
        </p>
      )}
    </div>
  );
}
