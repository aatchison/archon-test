import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Sidebar from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lists = await db.list.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const sharedLists = await db.listMember.findMany({
    where: { userId: session.user.id },
    include: { list: { select: { id: true, name: true } } },
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar lists={lists} sharedLists={sharedLists} user={session.user} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
