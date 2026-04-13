"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CurrentFilters {
  priority?: string;
  label?: string[];
  due?: string;
  status?: string;
}

interface TaskFiltersProps {
  labels: Label[];
  currentFilters: CurrentFilters;
}

export function TaskFilters({ labels, currentFilters }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "Any" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`);
  };

  const clearFilters = () => {
    router.replace("?");
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-100 rounded-lg">
      <div className="flex flex-col gap-1">
        <label htmlFor="priority" className="text-sm font-medium">
          Priority
        </label>
        <select
          id="priority"
          value={currentFilters.priority || "Any"}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="border rounded p-1"
        >
          <option value="Any">Any</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="due" className="text-sm font-medium">
          Due Date
        </label>
        <select
          id="due"
          value={currentFilters.due || "Any"}
          onChange={(e) => updateFilter("due", e.target.value)}
          className="border rounded p-1"
        >
          <option value="Any">Any</option>
          <option value="Overdue">Overdue</option>
          <option value="Today">Due today</option>
          <option value="Week">Due this week</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          value={currentFilters.status || "All"}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="border rounded p-1"
        >
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:underline mt-5"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
