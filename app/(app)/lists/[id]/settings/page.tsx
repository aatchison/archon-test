import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renameList, deleteList } from "@/actions/lists";
import Link from "next/link";

export default async function ListSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const list = await db.list.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/lists/${list.id}`} className="text-sm text-gray-400 hover:text-gray-900">
          &larr; Back
        </Link>
        <h1 className="text-xl font-semibold">List settings</h1>
      </div>
      <div className="bg-white rounded-lg border divide-y">
        <div className="p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Rename list</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              await renameList(list.id, formData.get("name") as string);
              redirect(`/lists/${list.id}`);
            }}
            className="flex gap-2"
          >
            <input
              name="name"
              defaultValue={list.name}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Save
            </button>
          </form>
        </div>
        <div className="p-6">
          <h2 className="text-sm font-medium text-red-600 mb-3">Delete list</h2>
          <p className="text-sm text-gray-500 mb-3">Permanently deletes this list and all its tasks.</p>
          <form
            action={async () => {
              "use server";
              await deleteList(list.id);
              redirect("/lists");
            }}
          >
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
            >
              Delete list
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
