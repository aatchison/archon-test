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
  auth: async () => ({ user: { id: "int-user-1" } }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

// Create a test-specific Prisma client
const adapter = new PrismaLibSql({ url: TEST_DB_URL });
const testDb = new PrismaClient({ adapter });

// Override the db module to use test database
mock.module("@/lib/db", () => ({ db: testDb }));

const { createList, renameList, deleteList } = await import("./lists");

beforeAll(async () => {
  // Reset test database
  execFileSync("bunx", ["prisma", "migrate", "reset", "--force", ""], {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  // Create test user
  await testDb.user.create({
    data: { id: "int-user-1", email: "int@example.com" },
  });
});

afterAll(async () => {
  // Prisma 7 with driver adapters doesn't expose $disconnect
});

describe("list CRUD integration", () => {
  it("creates, renames, and deletes a list", async () => {
    const list = await createList("Shopping");
    expect(list.name).toBe("Shopping");
    expect(list.ownerId).toBe("int-user-1");

    const renamed = await renameList(list.id, "Groceries");
    expect(renamed.name).toBe("Groceries");

    const fromDb = await testDb.list.findUnique({ where: { id: list.id } });
    expect(fromDb?.name).toBe("Groceries");

    await deleteList(list.id);
    expect(await testDb.list.findUnique({ where: { id: list.id } })).toBeNull();
  });
});
