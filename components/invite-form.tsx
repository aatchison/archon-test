"use client";

import { useState } from "react";
import { addMember } from "@/actions/members";

export function InviteForm({ listId }: { listId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await addMember(listId, email, role);
      setEmail("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? "Inviting..." : "Invite"}
      </button>
    </form>
  );
}
