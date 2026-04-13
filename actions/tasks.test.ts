// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

const mockListFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskUpdate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskDelete = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    list: { findUnique: (...args: unknown[]) => mockListFindUnique(...args) },
    task: {
      create: (...args: unknown[]) => mockTaskCreate(...args),
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      delete: (...args: unknown[]) => mockTaskDelete(...args),
    },
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

const { createTask, updateTask, deleteTask, toggleDone } = await import(
  "./tasks"
);

const mockList = { id: "l1", ownerId: "user-1" };
const mockTask = {
  id: "t1",
  title: "Test",
  done: false,
  listId: "l1",
  list: mockList,
};

describe("createTask", () => {
  beforeEach(() => {
    mockListFindUnique.mockReset();
    mockTaskCreate.mockReset();
    mockTaskFindUnique.mockReset();
    mockTaskUpdate.mockReset();
    mockTaskDelete.mockReset();
  });

  it("throws if title is empty", async () => {
    mockListFindUnique.mockResolvedValue(mockList);
    await expect(createTask("l1", { title: "" })).rejects.toThrow(
      "Title is required",
    );
  });

  it("throws Not found if list belongs to another user", async () => {
    mockListFindUnique.mockResolvedValue({ id: "l1", ownerId: "other" });
    await expect(createTask("l1", { title: "hi" })).rejects.toThrow(
      "Not found",
    );
  });

  it("creates and returns the task", async () => {
    mockListFindUnique.mockResolvedValue(mockList);
    mockTaskCreate.mockResolvedValue(mockTask);
    const result = await createTask("l1", { title: "Test" });
    expect(result.title).toBe("Test");
  });
});

describe("toggleDone", () => {
  beforeEach(() => {
    mockTaskFindUnique.mockReset();
    mockTaskUpdate.mockReset();
  });

  it("flips done false to true", async () => {
    mockTaskFindUnique.mockResolvedValue({ ...mockTask, done: false });
    mockTaskUpdate.mockResolvedValue({ ...mockTask, done: true });
    const result = await toggleDone("t1");
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { done: true },
    });
    expect(result.done).toBe(true);
  });

  it("flips done true to false", async () => {
    mockTaskFindUnique.mockResolvedValue({ ...mockTask, done: true });
    mockTaskUpdate.mockResolvedValue({ ...mockTask, done: false });
    expect((await toggleDone("t1")).done).toBe(false);
  });
});

describe("deleteTask", () => {
  beforeEach(() => {
    mockTaskFindUnique.mockReset();
    mockTaskDelete.mockReset();
  });

  it("throws Not found if task belongs to another user's list", async () => {
    mockTaskFindUnique.mockResolvedValue({
      ...mockTask,
      list: { id: "l1", ownerId: "other" },
    });
    await expect(deleteTask("t1")).rejects.toThrow("Not found");
  });

  it("deletes the task", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockTaskDelete.mockResolvedValue({});
    await deleteTask("t1");
    expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
