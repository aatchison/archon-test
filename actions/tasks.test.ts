// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

mock.module("@/lib/event-hub", () => ({
  eventHub: {
    subscribe: () => () => {},
    publish: () => {},
    getPresence: () => [],
    getConnectionCount: () => 0,
    reset: () => {},
  },
  resetEventHub: () => {},
}));

mock.module("@/lib/errors", () => ({
  ConflictError: class ConflictError extends Error {
    currentVersion: number;
    constructor(msg: string, v: number) {
      super(msg);
      this.name = "ConflictError";
      this.currentVersion = v;
    }
  },
}));

const mockRequireEdit = spyOn({ fn: async () => "user-1" }, "fn");

mock.module("@/lib/authorization", () => ({
  requireEdit: (...args: unknown[]) => mockRequireEdit(...args),
}));

const mockTaskCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskUpdate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskDelete = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskUpdateMany = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    task: {
      create: (...args: unknown[]) => mockTaskCreate(...args),
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      delete: (...args: unknown[]) => mockTaskDelete(...args),
      updateMany: (...args: unknown[]) => mockTaskUpdateMany(...args),
    },
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

const { createTask, updateTask, deleteTask, toggleDone } = await import(
  "./tasks"
);

const mockTask = {
  id: "t1",
  title: "Test",
  done: false,
  listId: "l1",
  version: 0,
  description: null,
  priority: "NONE",
  dueDate: null,
  list: { id: "l1", ownerId: "user-1" },
};

describe("createTask", () => {
  beforeEach(() => {
    mockRequireEdit.mockReset().mockResolvedValue("user-1");
    mockTaskCreate.mockReset();
    mockTaskFindUnique.mockReset();
    mockTaskUpdate.mockReset();
    mockTaskDelete.mockReset();
    mockTaskUpdateMany.mockReset();
  });

  it("throws if title is empty", async () => {
    await expect(createTask("l1", { title: "" })).rejects.toThrow(
      "Title is required",
    );
  });

  it("throws Not found if not authorized", async () => {
    mockRequireEdit.mockRejectedValue(new Error("Not found"));
    await expect(createTask("l1", { title: "hi" })).rejects.toThrow(
      "Not found",
    );
  });

  it("creates and returns the task", async () => {
    mockTaskCreate.mockResolvedValue(mockTask);
    const result = await createTask("l1", { title: "Test" });
    expect(result.title).toBe("Test");
  });
});

describe("toggleDone", () => {
  beforeEach(() => {
    mockRequireEdit.mockReset().mockResolvedValue("user-1");
    mockTaskFindUnique.mockReset();
    mockTaskUpdate.mockReset();
    mockTaskUpdateMany.mockReset();
  });

  it("flips done false to true", async () => {
    mockTaskFindUnique
      .mockResolvedValueOnce({ ...mockTask, done: false })
      .mockResolvedValueOnce({ ...mockTask, done: true });
    mockTaskUpdate.mockResolvedValue({ ...mockTask, done: true });
    const result = await toggleDone("t1");
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { done: true, version: { increment: 1 } },
    });
    expect(result.done).toBe(true);
  });

  it("flips done true to false", async () => {
    mockTaskFindUnique
      .mockResolvedValueOnce({ ...mockTask, done: true })
      .mockResolvedValueOnce({ ...mockTask, done: false });
    mockTaskUpdate.mockResolvedValue({ ...mockTask, done: false });
    expect((await toggleDone("t1")).done).toBe(false);
  });
});

describe("deleteTask", () => {
  beforeEach(() => {
    mockRequireEdit.mockReset().mockResolvedValue("user-1");
    mockTaskFindUnique.mockReset();
    mockTaskDelete.mockReset();
    mockTaskUpdateMany.mockReset();
  });

  it("throws Not found if not authorized", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockRequireEdit.mockRejectedValue(new Error("Not found"));
    await expect(deleteTask("t1")).rejects.toThrow("Not found");
  });

  it("deletes the task", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockTaskDelete.mockResolvedValue({});
    await deleteTask("t1");
    expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
