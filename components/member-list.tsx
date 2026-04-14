"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "./role-badge";
import { updateMemberRole, removeMember } from "@/actions/members";

export function MemberList({
  members,
  listId,
  isOwner,
}: {
  members: Array<{
    user: { id: string; name: string | null; email: string };
    role: string;
    listId: string;
    userId: string;
  }>;
  listId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-red-600 text-sm" role="alert">
          {error}
        </p>
      )}
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between p-2 border rounded"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">{member.user.name}</p>
              <p className="text-xs text-gray-500">{member.user.email}</p>
            </div>
            <RoleBadge role={member.role} />
          </div>

          {isOwner && member.role !== "OWNER" && (
            <div className="flex items-center gap-2">
              <select
                aria-label={`Change role for ${member.user.name || member.user.email}`}
                value={member.role}
                onChange={async (e) => {
                  try {
                    setError(null);
                    await updateMemberRole(
                      listId,
                      member.userId,
                      e.target.value as "EDITOR" | "VIEWER",
                    );
                    router.refresh();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to update role",
                    );
                  }
                }}
                className="border rounded px-1 py-1 text-xs"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setError(null);
                    await removeMember(listId, member.userId);
                    router.refresh();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to remove member",
                    );
                  }
                }}
                className="text-red-600 text-xs font-medium hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
