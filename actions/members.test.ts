// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

const mockRequireOwner = spyOn({ fn: async () => "user-1" }, "fn");
mock.module("@/lib/authorization", () => ({
  requireOwner: (...args: unknown[]) => mockRequireOwner(...args),
}));

const mockUserFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockListFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockMemberFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockMemberCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockMemberDelete = spyOn({ fn: async () => ({}) }, "fn");
const mockMemberUpdate = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    list: { findUnique: (...args: unknown[]) => mockListFindUnique(...args) },
    listMember: {
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
      create: (...args: unknown[]) => mockMemberCreate(...args),
      delete: (...args: unknown[]) => mockMemberDelete(...args),
      update: (...args: unknown[]) => mockMemberUpdate(...args),
    },
  },
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const { addMember, removeMember, updateMemberRole } = await import("./members");

describe("addMember", () => {
  beforeEach(() => {
    mockRequireOwner.mockReset().mockResolvedValue("user-1");
    mockUserFindUnique.mockReset();
    mockListFindUnique.mockReset();
    mockMemberFindUnique.mockReset();
    mockMemberCreate.mockReset();
  });

  it("throws if email is empty", async () => {
    await expect(addMember("l1", "", "EDITOR")).rejects.toThrow();
  });

  it("throws if role is invalid", async () => {
    await expect(
      addMember("l1", "test@example.com", "OWNER"),
    ).rejects.toThrow();
  });

  it("throws if user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    await expect(
      addMember("l1", "nobody@example.com", "EDITOR"),
    ).rejects.toThrow("not found");
  });

  it("throws if already a member", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "u2",
      email: "test@example.com",
    });
    mockMemberFindUnique.mockResolvedValue({ listId: "l1", userId: "u2" });
    await expect(addMember("l1", "test@example.com", "EDITOR")).rejects.toThrow(
      "already",
    );
  });

  it("creates the member", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "u2",
      email: "test@example.com",
    });
    mockMemberFindUnique.mockResolvedValue(null);
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1", version: 0 });
    mockMemberCreate.mockResolvedValue({});
    await addMember("l1", "test@example.com", "EDITOR");
    expect(mockMemberCreate).toHaveBeenCalled();
  });
});

describe("removeMember", () => {
  beforeEach(() => {
    mockRequireOwner.mockReset().mockResolvedValue("user-1");
    mockListFindUnique.mockReset();
    mockMemberDelete.mockReset();
  });

  it("throws if target is owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "u2" });
    await expect(removeMember("l1", "u2")).rejects.toThrow("owner");
  });

  it("deletes the member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1", version: 0 });
    mockMemberDelete.mockResolvedValue({});
    await removeMember("l1", "u2");
    expect(mockMemberDelete).toHaveBeenCalled();
  });
});

describe("updateMemberRole", () => {
  beforeEach(() => {
    mockRequireOwner.mockReset().mockResolvedValue("user-1");
    mockListFindUnique.mockReset();
    mockMemberUpdate.mockReset();
  });

  it("throws if role is invalid", async () => {
    await expect(updateMemberRole("l1", "u2", "OWNER")).rejects.toThrow();
  });

  it("throws if target is owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "u2" });
    await expect(updateMemberRole("l1", "u2", "EDITOR")).rejects.toThrow(
      "owner",
    );
  });

  it("updates the role", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1", version: 0 });
    mockMemberUpdate.mockResolvedValue({});
    await updateMemberRole("l1", "u2", "VIEWER");
    expect(mockMemberUpdate).toHaveBeenCalled();
  });
});
