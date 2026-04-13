import Link from "next/link";
import { signOut } from "@/lib/auth";

export default function Sidebar({
  lists,
  user,
}: {
  lists: { id: string; name: string }[];
  user: { name?: string | null; email?: string | null };
}) {
  return (
    <aside className="w-64 border-r bg-gray-50 flex flex-col h-full">
      <div className="p-4 font-bold text-xl border-b">Archon Todo</div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link
          href="/lists"
          className="block p-2 hover:bg-gray-200 rounded"
        >
          All lists
        </Link>
        <div className="pt-4 space-y-1">
          {lists.length === 0 ? (
            <p className="text-sm text-gray-500">No lists yet</p>
          ) : (
            lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="block p-2 hover:bg-gray-200 rounded text-sm"
              >
                {list.name}
              </Link>
            ))
          )}
        </div>
      </nav>
      <div className="p-4 border-t flex items-center justify-between">
        <span className="text-sm font-medium">{user?.name ?? user?.email}</span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="text-sm text-red-600 hover:underline">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
