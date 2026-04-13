"use client";

import { useState } from "react";
import { createList } from "@/actions/lists";

export default function ListForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      await createList(name);
      setName("");
      setIsOpen(false);
    } finally {
      setIsPending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        New list
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="List name"
        required
        className="border p-2 rounded-md"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isPending ? "Creating..." : "Create"}
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="px-4 py-2 text-gray-600 hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}
