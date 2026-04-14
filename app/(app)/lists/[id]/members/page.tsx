import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isOwner } from "@/lib/authorization";
import { db } from "@/lib/db";
import { InviteForm } from "@/components/invite-form";
import { MemberList } from "@/components/member-list";

export default async function ListMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const list = await db.list.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!list) notFound();

  const ownerAccess = await isOwner(list.id);
  if (!ownerAccess) notFound();

  const membersWithOwner = [
    {
      userId: list.ownerId,
      role: "OWNER" as const,
      user: {
        id: list.owner.id,
        name: list.owner.name,
        email: list.owner.email ?? "Owner",
      },
      listId: list.id,
    },
    ...list.members,
  ];

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Manage Members</h1>
        <p className="text-gray-500 text-sm">
          Invite and manage members for this list.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invite Member</h2>
        <InviteForm listId={list.id} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Members</h2>
        <MemberList
          members={membersWithOwner}
          listId={list.id}
          isOwner={true}
        />
      </div>
    </div>
  );
}
