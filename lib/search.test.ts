// @ts-nocheck
import { describe, it, expect, beforeEach, mock } from "bun:test";

// Use dynamic import to get the real module even when other test files mock @/lib/search
const searchModule = await import("./search");
const { sanitizeQuery, searchTasks, getSearchSuggestions, rebuildSearchIndex } = searchModule;

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

describe("searchTasks", () => {
  it("returns empty results when sanitized query is empty", async () => {
    const queryRaw = mock(() => Promise.resolve([]));
    const prisma = { $queryRawUnsafe: queryRaw };
    const result = await searchTasks(prisma as any, "user1", "");
    expect(result).toEqual({ tasks: [], total: 0 });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("calls $queryRawUnsafe with MATCH and userId params", async () => {
    const queryRaw = mock((...args: any[]) => {
      return Promise.resolve([{ cnt: 1 }]);
    });
    const prisma = { 
      $queryRawUnsafe: queryRaw,
    };
    
    await searchTasks(prisma as any, "user1", "test");

    expect(queryRaw).toHaveBeenCalled();
    const firstCall = queryRaw.mock.calls[0];
    expect(firstCall[0]).toContain("COUNT");
    expect(firstCall[0]).toContain("MATCH");
    expect(firstCall[1]).toBe('"test"*');
    expect(firstCall[2]).toBe("user1");
    expect(firstCall[3]).toBe("user1");
  });
});

describe("getSearchSuggestions", () => {
  it("returns empty array when sanitized query is empty", async () => {
    const queryRaw = mock(() => Promise.resolve([]));
    const prisma = { $queryRawUnsafe: queryRaw };
    const result = await getSearchSuggestions(prisma as any, "user1", "");
    expect(result).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe("rebuildSearchIndex", () => {
  it("calls DELETE then INSERT on task_fts", async () => {
    const calls: any[][] = [];
    const queryRaw = (...args: any[]) => {
      calls.push(args);
      return Promise.resolve([]);
    };
    const prisma = { $queryRawUnsafe: queryRaw };
    await rebuildSearchIndex(prisma as any);

    expect(calls.length).toBe(2);
    expect(calls[0][0]).toBe("DELETE FROM task_fts");
    expect(calls[1][0]).toContain("INSERT INTO task_fts");
  });
});
