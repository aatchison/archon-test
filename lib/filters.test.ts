import { describe, it, expect } from "bun:test";
import { buildTaskWhere } from "./filters";

describe("buildTaskWhere", () => {
  it("returns listId only when no filters", () => {
    const where = buildTaskWhere("l1", {});
    expect(where).toEqual({ listId: "l1" });
  });

  it("filters by priority", () => {
    const where = buildTaskWhere("l1", { priority: "HIGH" });
    expect(where.priority).toBe("HIGH");
  });

  it("ignores priority 'any'", () => {
    const where = buildTaskWhere("l1", { priority: "any" });
    expect(where.priority).toBeUndefined();
  });

  it("filters active tasks", () => {
    const where = buildTaskWhere("l1", { status: "active" });
    expect(where.done).toBe(false);
  });

  it("filters completed tasks", () => {
    const where = buildTaskWhere("l1", { status: "completed" });
    expect(where.done).toBe(true);
  });

  it("filters by single label", () => {
    const where = buildTaskWhere("l1", { label: "lb1" });
    expect(where.labels).toEqual({ some: { labelId: { in: ["lb1"] } } });
  });

  it("filters by multiple labels", () => {
    const where = buildTaskWhere("l1", { label: ["lb1", "lb2"] });
    expect(where.labels).toEqual({ some: { labelId: { in: ["lb1", "lb2"] } } });
  });

  it("filters overdue tasks", () => {
    const where = buildTaskWhere("l1", { due: "overdue" }) as any;
    expect(where.dueDate.lt).toBeDefined();
    expect(where.dueDate.not).toBeNull();
  });

  it("filters today tasks", () => {
    const where = buildTaskWhere("l1", { due: "today" }) as any;
    expect(where.dueDate.gte).toBeDefined();
    expect(where.dueDate.lte).toBeDefined();
  });

  it("filters this week tasks", () => {
    const where = buildTaskWhere("l1", { due: "week" }) as any;
    expect(where.dueDate.gte).toBeDefined();
    expect(where.dueDate.lte).toBeDefined();
  });
});
