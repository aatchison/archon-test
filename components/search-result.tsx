import Link from "next/link";
import { LabelBadge } from "@/components/label-badge";
import { formatDueDate } from "@/lib/dates";
import type { SearchResult } from "@/lib/search";

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-500 text-white",
  MEDIUM: "bg-amber-500 text-white",
  LOW: "bg-blue-500 text-white",
  NONE: "hidden",
};

function sanitizeSnippet(html: string): string {
  return html.replace(/<\/?(?!mark\b)[^>]*>/gi, "");
}

export function SearchResultItem({ result }: { result: SearchResult }) {
  const dueDateDisplay = formatDueDate(result.dueDate);

  return (
    <Link
      href={`/lists/${result.listId}`}
      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${result.done ? "line-through text-gray-500" : ""}`}
            >
              {result.title}
            </span>
            {result.priority !== "NONE" && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${priorityColors[result.priority]}`}
              >
                {result.priority}
              </span>
            )}
          </div>
          {result.snippet && (
            <p
              className="text-sm text-gray-600 mt-1"
              dangerouslySetInnerHTML={{
                __html: sanitizeSnippet(result.snippet),
              }}
            />
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {result.listName}
            </span>
            {result.labels.map((label) => (
              <LabelBadge
                key={label.id}
                name={label.name}
                color={label.color}
              />
            ))}
            {dueDateDisplay && (
              <span className={`text-xs ${dueDateDisplay.className}`}>
                {dueDateDisplay.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
