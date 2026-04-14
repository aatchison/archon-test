const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatDueDate(dateString: Date | string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const diffTime = compareDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / MS_PER_DAY);

  if (diffDays < 0) return { text: "Overdue", className: "text-red-500" };
  if (diffDays === 0) return { text: "Today", className: "text-gray-600" };
  if (diffDays === 1) return { text: "Tomorrow", className: "text-gray-600" };

  return {
    text: date.toLocaleDateString(),
    className: "text-gray-400",
  };
}
