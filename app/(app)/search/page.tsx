import { searchTasks } from "@/actions/search";
import { SearchResultItem } from "@/components/search-result";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; listId?: string; priority?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const page = Number(params.page ?? "1");
  const filters = {
    listId: params.listId,
    priority: params.priority,
    status: params.status as "active" | "completed" | undefined,
  };

  if (!query.trim()) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <p className="text-gray-500">Enter a search query to find tasks.</p>
      </div>
    );
  }

  const results = await searchTasks(query, filters, page);
  const totalPages = Math.ceil(results.total / 20);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Search Results</h1>
      <p className="text-sm text-gray-500 mb-6">
        {results.total} result{results.total !== 1 ? "s" : ""} for &quot;{query}&quot;
      </p>

      {results.tasks.length === 0 ? (
        <p className="text-gray-500">No tasks found matching your query.</p>
      ) : (
        <div className="space-y-3">
          {results.tasks.map((task) => (
            <SearchResultItem key={task.id} result={task} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
