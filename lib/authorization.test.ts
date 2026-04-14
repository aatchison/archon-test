// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

const mockListFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockMemberFindUnique = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    list: { findUnique: (...args: unknown[]) => mockListFindUnique(...args) },
    listMember: { findUnique: (...args: unknown[]) => mockMemberFindUnique(...args) },
  },
}));

const { isOwner, canEdit, canView, requireOwner, requireEdit, requireView } = await import("./authorization");

describe("isOwner", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); mockMemberFindUnique.mockReset(); });

  it("returns true for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await isOwner("l1")).toBe(true);
  });

  it("returns false for non-owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    expect(await isOwner("l1")).toBe(false);
  });
});

describe("canEdit", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); mockMemberFindUnique.mockReset(); });

  it("returns true for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await canEdit("l1")).toBe(true);
  });

  it("returns true for editor member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "EDITOR" });
    expect(await canEdit("l1")).toBe(true);
  });

  it("returns false for viewer member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "VIEWER" });
    expect(await canEdit("l1")).toBe(false);
  });

  it("returns false for non-member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue(null);
    expect(await canEdit("l1")).toBe(false);
  });
});

describe("canView", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); mockMemberFindUnique.mockReset(); });

  it("returns true for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await canView("l1")).toBe(true);
  });

  it("returns true for editor", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "EDITOR" });
    expect(await canView("l1")).toBe(true);
  });

  it("returns true for viewer", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "VIEWER" });
    expect(await canView("l1")).toBe(true);
  });

  it("returns false for non-member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue(null);
    expect(await canView("l1")).toBe(false);
  });
});

describe("requireOwner", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); });

  it("returns userId for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await requireOwner("l1")).toBe("user-1");
  });

  it("throws for non-owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    await expect(requireOwner("l1")).rejects.toThrow("Not found");
  });
});

describe("requireEdit", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); mockMemberFindUnique.mockReset(); });

  it("returns userId for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await requireEdit("l1")).toBe("user-1");
  });

  it("returns userId for editor", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "EDITOR" });
    expect(await requireEdit("l1")).toBe("user-1");
  });

  it("throws for viewer", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "VIEWER" });
    await expect(requireEdit("l1")).rejects.toThrow("Not found");
  });

  it("throws for non-member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue(null);
    await expect(requireEdit("l1")).rejects.toThrow("Not found");
  });
});

describe("requireView", () => {
  beforeEach(() => { mockListFindUnique.mockReset(); mockMemberFindUnique.mockReset(); });

  it("returns userId for owner", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "user-1" });
    expect(await requireView("l1")).toBe("user-1");
  });

  it("returns userId for viewer", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue({ role: "VIEWER" });
    expect(await requireView("l1")).toBe("user-1");
  });

  it("throws for non-member", async () => {
    mockListFindUnique.mockResolvedValue({ ownerId: "other" });
    mockMemberFindUnique.mockResolvedValue(null);
    await expect(requireView("l1")).rejects.toThrow("Not found");
  });
});
