// @ts-nocheck
import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { execFileSync } from "child_process";

// Set up test database
const TEST_DB_URL = "file:test.db";
process.env.DATABASE_URL = TEST_DB_URL;

// Mock auth to return a test user
mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "int-user-2" } }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

// Create a test-specific Prisma client
const adapter = new PrismaLibSql({ url: TEST_DB_URL });
const testDb = new PrismaClient({ adapter });

// Override the db module to use test database
mock.module("@/lib/db", () => ({ db: testDb }));

const { createTask, toggleDone, updateTask, deleteTask } = await import(
  "./tasks"
);

beforeAll(async () => {
  // Reset test database
  execFileSync("bunx", ["prisma", "migrate", "reset", "--force"], {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  // Create test user and list
  await testDb.user.create({
    data: { id: "int-user-2", email: "int2@example.com" },
  });
  await testDb.list.create({
    data: { id: "int-list-1", name: "Test List", ownerId: "int-user-2" },
  });
});

afterAll(async () => {
  // Prisma 7 with driver adapters doesn't expose $disconnect
});

describe("task CRUD integration", () => {
  it("creates, toggles, updates, and deletes a task", async () => {
    const task = await createTask("int-list-1", { title: "Buy milk" });
    expect(task.title).toBe("Buy milk");
    expect(task.done).toBe(false);

    const toggled = await toggleDone(task.id);
    expect(toggled.done).toBe(true);

    const updated = await updateTask(task.id, { title: "Buy oat milk" });
    expect(updated.title).toBe("Buy oat milk");

    await deleteTask(task.id);
    expect(await testDb.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
});

describe("version conflict integration", () => {
  it("detects stale version via updateMany", async () => {
    const task = await testDb.task.create({
      data: { title: "Conflict Test", listId: "int-list-1" },
    });

    // Simulate another user updating (version goes to 1)
    await testDb.task.update({
      where: { id: task.id },
      data: { title: "Updated by other user", version: { increment: 1 } },
    });

    // Try to update with stale version (0) — should match 0 rows
    const result = await testDb.task.updateMany({
      where: { id: task.id, version: 0 },
      data: { done: true, version: { increment: 1 } },
    });

    expect(result.count).toBe(0);

    // Cleanup
    await testDb.task.delete({ where: { id: task.id } });
  });
});
