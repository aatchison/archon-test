// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
  getUserId: async () => "user-1",
}));

const mockSearchTasks = spyOn(
  { fn: async () => ({ tasks: [], total: 0 }) },
  "fn",
);
const mockGetSuggestions = spyOn({ fn: async () => [] }, "fn");

mock.module("@/lib/search", () => ({
  searchTasks: (...args: unknown[]) => mockSearchTasks(...args),
  getSearchSuggestions: (...args: unknown[]) => mockGetSuggestions(...args),
  sanitizeQuery: (raw: string) => {
    const words = raw.trim().split(/\s+/).filter((w) => w.length > 0).map((w) => w.replace(/\"/g, ""));
    if (words.length === 0) return "";
    return words.map((w, i) => (i === words.length - 1 ? '"' + w + '"*' : '"' + w + '"')).join(" ");
  },
  rebuildSearchIndex: async (prisma: any) => {
    await prisma.$queryRawUnsafe("DELETE FROM task_fts");
    await prisma.$queryRawUnsafe("INSERT INTO task_fts(task_id, title, description) SELECT id, title, COALESCE(description, '') FROM \"Task\"");
  },
}));

mock.module("@/lib/db", () => ({ db: {} }));

const { searchTasks, getSearchSuggestions } = await import("./search");

describe("searchTasks", () => {
  beforeEach(() => {
    mockSearchTasks.mockReset().mockResolvedValue({ tasks: [], total: 0 });
  });

  it("returns empty for empty query", async () => {
    const result = await searchTasks("");
    expect(result).toEqual({ tasks: [], total: 0 });
    expect(mockSearchTasks).not.toHaveBeenCalled();
  });

  it("returns empty for whitespace-only query", async () => {
    const result = await searchTasks("   ");
    expect(result).toEqual({ tasks: [], total: 0 });
    expect(mockSearchTasks).not.toHaveBeenCalled();
  });

  it("returns empty for query over 200 chars", async () => {
    const result = await searchTasks("a".repeat(201));
    expect(result).toEqual({ tasks: [], total: 0 });
    expect(mockSearchTasks).not.toHaveBeenCalled();
  });

  it("trims whitespace before delegating", async () => {
    await searchTasks("  hello  ");
    expect(mockSearchTasks).toHaveBeenCalledWith(
      {},
      "user-1",
      "hello",
      undefined,
      undefined,
    );
  });

  it("delegates to lib/search with correct args", async () => {
    const filters = { status: "active" };
    const page = 2;
    await searchTasks("test query", filters, page);
    expect(mockSearchTasks).toHaveBeenCalledWith(
      {},
      "user-1",
      "test query",
      filters,
      page,
    );
  });
});

describe("getSearchSuggestions", () => {
  beforeEach(() => {
    mockGetSuggestions.mockReset().mockResolvedValue([]);
  });

  it("returns empty for empty query", async () => {
    const result = await getSearchSuggestions("");
    expect(result).toEqual([]);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it("returns empty for query over 200 chars", async () => {
    const result = await getSearchSuggestions("a".repeat(201));
    expect(result).toEqual([]);
    expect(mockGetSuggestions).not.toHaveBeenCalled();
  });

  it("delegates to lib/search with correct args", async () => {
    await getSearchSuggestions("todo");
    expect(mockGetSuggestions).toHaveBeenCalledWith({}, "user-1", "todo");
  });
});
