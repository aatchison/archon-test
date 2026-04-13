import Link from "next/link";

interface ListCardProps {
  id: string;
  name: string;
  taskCount: number;
  dueSoonCount: number;
}

export default function ListCard({
  id,
  name,
  taskCount,
  dueSoonCount,
}: ListCardProps) {
  return (
    <Link
      href={`/lists/${id}`}
      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-semibold text-lg">{name}</h3>
      <div className="flex gap-3 text-sm text-gray-600 mt-2">
        <span>
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>
        {dueSoonCount > 0 && (
          <span className="text-red-500 font-medium">
            {dueSoonCount} due soon
          </span>
        )}
      </div>
    </Link>
  );
}
