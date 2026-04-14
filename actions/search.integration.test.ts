// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { execFileSync } from "child_process";
import {
  sanitizeQuery,
  searchTasks,
  getSearchSuggestions,
  rebuildSearchIndex,
} from "@/lib/search";

// Set up test database
const TEST_DB_URL = "file:test-search.db";
process.env.DATABASE_URL = TEST_DB_URL;

// Mock auth to return a test user
mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "search-user-a" } }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

// Create a test-specific Prisma client
const adapter = new PrismaLibSql({ url: TEST_DB_URL });
const testDb = new PrismaClient({ adapter });

// Override the db module to use test database
mock.module("@/lib/db", () => ({ db: testDb }));

// Test data IDs
const USER_A = "search-user-a";
const USER_B = "search-user-b";
const LIST_A = "search-list-a";
const LIST_B = "search-list-b";
const LIST_SHARED = "search-list-shared";

beforeAll(async () => {
  // Reset test database
  execFileSync("bunx", ["prisma", "migrate", "reset", "--force"], {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  // Create two users
  await testDb.user.create({
    data: { id: USER_A, email: "search-a@example.com" },
  });
  await testDb.user.create({
    data: { id: USER_B, email: "search-b@example.com" },
  });

  // User A owns LIST_A
  await testDb.list.create({
    data: { id: LIST_A, name: "Groceries", ownerId: USER_A },
  });

  // User B owns LIST_B
  await testDb.list.create({
    data: { id: LIST_B, name: "Work Tasks", ownerId: USER_B },
  });

  // User B owns LIST_SHARED, User A is a member
  await testDb.list.create({
    data: { id: LIST_SHARED, name: "Shared Project", ownerId: USER_B },
  });
  await testDb.listMember.create({
    data: { listId: LIST_SHARED, userId: USER_A, role: "EDITOR" },
  });

  // Create tasks in LIST_A (owned by User A)
  await testDb.task.create({
    data: {
      id: "task-milk",
      title: "Buy almond milk",
      description: "Get the unsweetened kind from the store",
      listId: LIST_A,
    },
  });
  await testDb.task.create({
    data: {
      id: "task-bread",
      title: "Buy sourdough bread",
      description: "From the bakery downtown",
      listId: LIST_A,
    },
  });
  await testDb.task.create({
    data: {
      id: "task-eggs",
      title: "Buy organic eggs",
      listId: LIST_A,
    },
  });

  // Create tasks in LIST_B (owned by User B, User A has NO access)
  await testDb.task.create({
    data: {
      id: "task-report",
      title: "Write quarterly report",
      description: "Include revenue and growth metrics",
      listId: LIST_B,
    },
  });
  await testDb.task.create({
    data: {
      id: "task-meeting",
      title: "Schedule team meeting",
      listId: LIST_B,
    },
  });

  // Create tasks in LIST_SHARED (owned by User B, User A is member)
  await testDb.task.create({
    data: {
      id: "task-deploy",
      title: "Deploy application update",
      description: "Push the latest build to production",
      listId: LIST_SHARED,
    },
  });
  await testDb.task.create({
    data: {
      id: "task-review",
      title: "Review pull request",
      description: "Check the authentication module changes",
      listId: LIST_SHARED,
    },
  });

  // Create many tasks for pagination testing (in LIST_A)
  for (let i = 1; i <= 25; i++) {
    await testDb.task.create({
      data: {
        id: `task-pagination-${i}`,
        title: `Pagination test item ${i}`,
        description: `Description for pagination item number ${i}`,
        listId: LIST_A,
      },
    });
  }

  // FTS5 triggers don't fire reliably through the libsql Prisma adapter,
  // so we rebuild the search index explicitly after seeding test data.
  await rebuildSearchIndex(testDb);
});

afterAll(async () => {
  // Prisma 7 with driver adapters doesn't expose $disconnect
});

describe("searchTasks", () => {
  it("returns results matching a query", async () => {
    const results = await searchTasks(testDb, USER_A, "milk");
    expect(results.total).toBeGreaterThanOrEqual(1);
    expect(results.tasks.length).toBeGreaterThanOrEqual(1);
    const titles = results.tasks.map((t) => t.title);
    expect(titles).toContain("Buy almond milk");
  });

  it("returns results matching description text", async () => {
    const results = await searchTasks(testDb, USER_A, "bakery");
    expect(results.total).toBeGreaterThanOrEqual(1);
    const titles = results.tasks.map((t) => t.title);
    expect(titles).toContain("Buy sourdough bread");
  });

  it("returns empty results for non-matching query", async () => {
    const results = await searchTasks(testDb, USER_A, "xyznonexistent");
    expect(results.total).toBe(0);
    expect(results.tasks).toHaveLength(0);
  });

  it("returns empty results for empty query", async () => {
    const results = await searchTasks(testDb, USER_A, "");
    expect(results.total).toBe(0);
    expect(results.tasks).toHaveLength(0);
  });

  it("respects authorization - user sees own lists", async () => {
    const results = await searchTasks(testDb, USER_A, "Buy");
    const listIds = results.tasks.map((t) => t.listId);
    // User A owns LIST_A, should see those tasks
    expect(listIds).toContain(LIST_A);
    // User A does NOT have access to LIST_B
    expect(listIds).not.toContain(LIST_B);
  });

  it("respects authorization - user sees shared lists they are a member of", async () => {
    const results = await searchTasks(testDb, USER_A, "Deploy");
    expect(results.total).toBeGreaterThanOrEqual(1);
    const titles = results.tasks.map((t) => t.title);
    expect(titles).toContain("Deploy application update");
    // Verify it comes from the shared list
    const task = results.tasks.find(
      (t) => t.title === "Deploy application update",
    );
    expect(task?.listId).toBe(LIST_SHARED);
  });

  it("respects authorization - user cannot see lists they have no access to", async () => {
    const results = await searchTasks(testDb, USER_A, "quarterly report");
    expect(results.total).toBe(0);
    expect(results.tasks).toHaveLength(0);
  });

  it("filters by listId", async () => {
    const results = await searchTasks(testDb, USER_A, "Buy", {
      listId: LIST_A,
    });
    expect(results.total).toBeGreaterThanOrEqual(1);
    for (const task of results.tasks) {
      expect(task.listId).toBe(LIST_A);
    }
  });

  it("filters by listId returns nothing for unauthorized list", async () => {
    const results = await searchTasks(testDb, USER_A, "report", {
      listId: LIST_B,
    });
    expect(results.total).toBe(0);
  });

  it("pagination returns correct page size and offset", async () => {
    // Page 1 should return up to 20 results
    const page1 = await searchTasks(testDb, USER_A, "pagination", {}, 1);
    expect(page1.total).toBe(25);
    expect(page1.tasks).toHaveLength(20);

    // Page 2 should return the remaining 5
    const page2 = await searchTasks(testDb, USER_A, "pagination", {}, 2);
    expect(page2.total).toBe(25);
    expect(page2.tasks).toHaveLength(5);

    // No overlap between pages
    const page1Ids = new Set(page1.tasks.map((t) => t.id));
    for (const task of page2.tasks) {
      expect(page1Ids.has(task.id)).toBe(false);
    }
  });

  it("page beyond results returns empty tasks", async () => {
    const results = await searchTasks(testDb, USER_A, "pagination", {}, 99);
    expect(results.total).toBe(25);
    expect(results.tasks).toHaveLength(0);
  });
});

describe("getSearchSuggestions", () => {
  it("returns up to 5 suggestions matching query", async () => {
    const suggestions = await getSearchSuggestions(testDb, USER_A, "pagination");
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.taskId).toBeDefined();
      expect(s.title).toBeDefined();
      expect(s.listId).toBe(LIST_A);
      expect(s.listName).toBe("Groceries");
    }
  });

  it("returns empty for non-matching query", async () => {
    const suggestions = await getSearchSuggestions(
      testDb,
      USER_A,
      "xyznonexistent",
    );
    expect(suggestions).toHaveLength(0);
  });

  it("respects authorization in suggestions", async () => {
    const suggestions = await getSearchSuggestions(
      testDb,
      USER_A,
      "quarterly",
    );
    // User A should not see User B's private list tasks
    expect(suggestions).toHaveLength(0);
  });

  it("returns empty for empty query", async () => {
    const suggestions = await getSearchSuggestions(testDb, USER_A, "");
    expect(suggestions).toHaveLength(0);
  });
});

describe("rebuildSearchIndex", () => {
  it("repopulates the FTS5 table from tasks", async () => {
    // First, manually clear the FTS table
    await testDb.$queryRawUnsafe("DELETE FROM task_fts");

    // Verify search returns nothing after clearing
    const emptyResults = await searchTasks(testDb, USER_A, "milk");
    expect(emptyResults.total).toBe(0);

    // Rebuild the index
    await rebuildSearchIndex(testDb);

    // Verify search works again
    const results = await searchTasks(testDb, USER_A, "milk");
    expect(results.total).toBeGreaterThanOrEqual(1);
    const titles = results.tasks.map((t) => t.title);
    expect(titles).toContain("Buy almond milk");
  });
});
