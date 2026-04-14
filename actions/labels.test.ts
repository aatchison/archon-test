// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

const mockLabelCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelUpdate = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelDelete = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskLabelCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskLabelDelete = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    label: {
      create: (...args: unknown[]) => mockLabelCreate(...args),
      findUnique: (...args: unknown[]) => mockLabelFindUnique(...args),
      update: (...args: unknown[]) => mockLabelUpdate(...args),
      delete: (...args: unknown[]) => mockLabelDelete(...args),
    },
    task: {
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
    },
    taskLabel: {
      create: (...args: unknown[]) => mockTaskLabelCreate(...args),
      delete: (...args: unknown[]) => mockTaskLabelDelete(...args),
    },
  },
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const mockRequireEdit = spyOn({ fn: async () => "user-1" }, "fn");
mock.module("@/lib/authorization", () => ({
  requireEdit: (...args: unknown[]) => mockRequireEdit(...args),
}));

const {
  createLabel,
  updateLabel,
  deleteLabel,
  addLabelToTask,
  removeLabelFromTask,
} = await import("./labels");

const mockLabel = {
  id: "lb1",
  name: "Work",
  color: "#3b82f6",
  userId: "user-1",
};
const mockTask = {
  id: "t1",
  listId: "l1",
  list: { id: "l1", ownerId: "user-1" },
};

describe("createLabel", () => {
  beforeEach(() => {
    mockLabelCreate.mockReset();
  });

  it("throws if name is empty", async () => {
    await expect(createLabel({ name: "", color: "#fff" })).rejects.toThrow();
  });

  it("creates a label", async () => {
    mockLabelCreate.mockResolvedValue(mockLabel);
    await createLabel({ name: "Work", color: "#3b82f6" });
    expect(mockLabelCreate).toHaveBeenCalled();
  });
});

describe("updateLabel", () => {
  beforeEach(() => {
    mockLabelFindUnique.mockReset();
    mockLabelUpdate.mockReset();
  });

  it("throws if label belongs to another user", async () => {
    mockLabelFindUnique.mockResolvedValue({ ...mockLabel, userId: "other" });
    await expect(updateLabel("lb1", { name: "New" })).rejects.toThrow();
  });

  it("updates the label", async () => {
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockLabelUpdate.mockResolvedValue({ ...mockLabel, name: "Personal" });
    await updateLabel("lb1", { name: "Personal" });
    expect(mockLabelUpdate).toHaveBeenCalled();
  });
});

describe("deleteLabel", () => {
  beforeEach(() => {
    mockLabelFindUnique.mockReset();
    mockLabelDelete.mockReset();
  });

  it("throws if label belongs to another user", async () => {
    mockLabelFindUnique.mockResolvedValue({ ...mockLabel, userId: "other" });
    await expect(deleteLabel("lb1")).rejects.toThrow();
  });

  it("deletes the label", async () => {
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockLabelDelete.mockResolvedValue({});
    await deleteLabel("lb1");
    expect(mockLabelDelete).toHaveBeenCalledWith({ where: { id: "lb1" } });
  });
});

describe("addLabelToTask", () => {
  beforeEach(() => {
    mockRequireEdit.mockReset().mockResolvedValue("user-1");
    mockTaskFindUnique.mockReset();
    mockLabelFindUnique.mockReset();
    mockTaskLabelCreate.mockReset();
  });

  it("throws if not authorized to edit list", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockRequireEdit.mockRejectedValue(new Error("Not found"));
    await expect(addLabelToTask("t1", "lb1")).rejects.toThrow("Not found");
  });

  it("creates the task-label association", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockTaskLabelCreate.mockResolvedValue({});
    await addLabelToTask("t1", "lb1");
    expect(mockTaskLabelCreate).toHaveBeenCalledWith({
      data: { taskId: "t1", labelId: "lb1" },
    });
  });
});

describe("removeLabelFromTask", () => {
  beforeEach(() => {
    mockRequireEdit.mockReset().mockResolvedValue("user-1");
    mockTaskFindUnique.mockReset();
    mockTaskLabelDelete.mockReset();
  });

  it("removes the task-label association", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockTaskLabelDelete.mockResolvedValue({});
    await removeLabelFromTask("t1", "lb1");
    expect(mockTaskLabelDelete).toHaveBeenCalledWith({
      where: { taskId_labelId: { taskId: "t1", labelId: "lb1" } },
    });
  });
});
