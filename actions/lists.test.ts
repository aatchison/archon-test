// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

const mockCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockUpdate = spyOn({ fn: async () => ({}) }, "fn");
const mockDelete = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    list: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

const mockRequireOwner = spyOn({ fn: async () => "user-1" }, "fn");
mock.module("@/lib/authorization", () => ({
  requireOwner: (...args: unknown[]) => mockRequireOwner(...args),
}));

const { createList, renameList, deleteList } = await import("./lists");

describe("createList", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  it("throws if name is empty", async () => {
    await expect(createList("")).rejects.toThrow("Name is required");
    await expect(createList("   ")).rejects.toThrow("Name is required");
  });

  it("creates and returns the list", async () => {
    const mockList = { id: "l1", name: "Work", ownerId: "user-1", version: 0 };
    mockCreate.mockResolvedValue(mockList);
    const result = await createList("Work");
    expect(result).toEqual(mockList);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "Work", ownerId: "user-1" },
    });
  });
});

describe("renameList", () => {
  beforeEach(() => {
    mockRequireOwner.mockReset().mockResolvedValue("user-1");
    mockUpdate.mockReset();
  });

  it("throws Not found if not owner", async () => {
    mockRequireOwner.mockRejectedValue(new Error("Not found"));
    await expect(renameList("l1", "New")).rejects.toThrow("Not found");
  });

  it("renames the list", async () => {
    mockUpdate.mockResolvedValue({
      id: "l1",
      name: "New",
      ownerId: "user-1",
      version: 0,
    });
    const result = await renameList("l1", "New");
    expect(result.name).toBe("New");
  });
});

describe("deleteList", () => {
  beforeEach(() => {
    mockRequireOwner.mockReset().mockResolvedValue("user-1");
    mockDelete.mockReset();
  });

  it("throws Not found if not owner", async () => {
    mockRequireOwner.mockRejectedValue(new Error("Not found"));
    await expect(deleteList("l1")).rejects.toThrow("Not found");
  });

  it("deletes the list", async () => {
    mockDelete.mockResolvedValue({});
    await deleteList("l1");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });
});
