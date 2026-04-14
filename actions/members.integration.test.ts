// @ts-nocheck
import { mock, describe, it, expect, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { execFileSync } from "child_process";

const TEST_DB_URL = "file:test.db";
process.env.DATABASE_URL = TEST_DB_URL;

// Mock auth as the owner user
mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "owner-user" } }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const adapter = new PrismaLibSql({ url: TEST_DB_URL });
const testDb = new PrismaClient({ adapter });

mock.module("@/lib/db", () => ({ db: testDb }));

const { addMember, removeMember, updateMemberRole } = await import("./members");

beforeAll(async () => {
  execFileSync("bunx", ["prisma", "migrate", "reset", "--force"], {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
  await testDb.user.create({
    data: { id: "owner-user", email: "owner@example.com" },
  });
  await testDb.user.create({
    data: { id: "member-user", email: "member@example.com" },
  });
  await testDb.list.create({
    data: { id: "collab-list", name: "Shared List", ownerId: "owner-user" },
  });
});

describe("member management integration", () => {
  it("adds, changes role, and removes a member", async () => {
    // Add member
    await addMember("collab-list", "member@example.com", "EDITOR");
    const member = await testDb.listMember.findUnique({
      where: {
        listId_userId: { listId: "collab-list", userId: "member-user" },
      },
    });
    expect(member).toBeTruthy();
    expect(member?.role).toBe("EDITOR");

    // Change role
    await updateMemberRole("collab-list", "member-user", "VIEWER");
    const updated = await testDb.listMember.findUnique({
      where: {
        listId_userId: { listId: "collab-list", userId: "member-user" },
      },
    });
    expect(updated?.role).toBe("VIEWER");

    // Remove
    await removeMember("collab-list", "member-user");
    const removed = await testDb.listMember.findUnique({
      where: {
        listId_userId: { listId: "collab-list", userId: "member-user" },
      },
    });
    expect(removed).toBeNull();
  });
});
