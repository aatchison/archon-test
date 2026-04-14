// @ts-nocheck
import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import {
  sanitizeQuery,
  searchTasks,
  getSearchSuggestions,
  rebuildSearchIndex,
} from "./search";

describe("sanitizeQuery", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeQuery("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeQuery("   ")).toBe("");
  });

  it("wraps a single word in quotes with trailing *", () => {
    expect(sanitizeQuery("hello")).toBe('"hello"*');
  });

  it("quotes multiple words with * only on the last word", () => {
    expect(sanitizeQuery("hello world")).toBe('"hello" "world"*');
  });

  it("strips double quotes from input", () => {
    expect(sanitizeQuery('he"llo')).toBe('"hello"*');
  });

  it("collapses extra whitespace", () => {
    expect(sanitizeQuery("  hello   world  ")).toBe('"hello" "world"*');
  });
});

function createMockPrisma() {
  return {
    $queryRawUnsafe: mock(() => Promise.resolve([])),
  };
}

describe("searchTasks", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("returns empty results when sanitized query is empty", async () => {
    const result = await searchTasks(prisma as any, "user1", "");
    expect(result).toEqual({ tasks: [], total: 0 });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it("calls $queryRawUnsafe with MATCH and userId params", async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ cnt: 0 }]);

    await searchTasks(prisma as any, "user1", "test");

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const call = prisma.$queryRawUnsafe.mock.calls[0];
    expect(call[0]).toContain("MATCH");
    expect(call[1]).toBe('"test"*');
    expect(call[2]).toBe("user1");
  });
});

describe("getSearchSuggestions", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("returns empty array when sanitized query is empty", async () => {
    const result = await getSearchSuggestions(prisma as any, "user1", "");
    expect(result).toEqual([]);
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe("rebuildSearchIndex", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it("calls DELETE then INSERT on task_fts", async () => {
    await rebuildSearchIndex(prisma as any);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const firstCall = prisma.$queryRawUnsafe.mock.calls[0][0];
    const secondCall = prisma.$queryRawUnsafe.mock.calls[1][0];
    expect(firstCall).toBe("DELETE FROM task_fts");
    expect(secondCall).toContain("INSERT INTO task_fts");
  });
});
