"use client";

interface ConflictDialogProps {
  task: { id: string; title: string } | null;
  onRefresh: () => void;
  onOverwrite: () => void;
}

export function ConflictDialog({
  task,
  onRefresh,
  onOverwrite,
}: ConflictDialogProps) {
  if (!task) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      aria-describedby="conflict-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
        <h2 id="conflict-title" className="text-lg font-semibold mb-2">
          Conflict Detected
        </h2>
        <p id="conflict-desc" className="text-gray-600 mb-4">
          "{task.title}" was edited by someone else while you were working on
          it.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onOverwrite}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}
