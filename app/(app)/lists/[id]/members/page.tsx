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
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!list) notFound();

  const ownerAccess = await isOwner(session.user.id, list.id);
  if (!ownerAccess) {
    return <div>You do not have permission to manage members.</div>;
  }

  const membersWithOwner = [
    {
      userId: list.ownerId,
      role: "OWNER",
      user: {
        id: list.ownerId,
        name: "Owner", // In a real app, you'd fetch the owner's user details
        email: "Owner",
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
          Invite and manage collaborators for this list.
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
