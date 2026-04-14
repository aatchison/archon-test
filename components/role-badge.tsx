export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    OWNER: "bg-purple-600",
    EDITOR: "bg-blue-600",
    VIEWER: "bg-gray-600",
  };

  return (
    <span
      className={`${styles[role] || "bg-gray-400"} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}
    >
      {role}
    </span>
  );
}
