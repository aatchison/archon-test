import { describe, it, expect } from "bun:test";
import { formatDueDate } from "./dates";

describe("formatDueDate", () => {
  it("returns null for null input", () => {
    expect(formatDueDate(null)).toBeNull();
  });

  it("returns Overdue for past dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatDueDate(yesterday.toISOString());
    expect(result?.text).toBe("Overdue");
    expect(result?.className).toContain("red");
  });

  it("returns Today for today", () => {
    const today = new Date();
    const result = formatDueDate(today.toISOString());
    expect(result?.text).toBe("Today");
  });

  it("returns Tomorrow for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = formatDueDate(tomorrow.toISOString());
    expect(result?.text).toBe("Tomorrow");
  });

  it("returns formatted date for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const result = formatDueDate(future.toISOString());
    expect(result?.text).not.toBe("Overdue");
    expect(result?.text).not.toBe("Today");
    expect(result?.text).not.toBe("Tomorrow");
  });

  it("handles Date objects", () => {
    const today = new Date();
    const result = formatDueDate(today);
    expect(result?.text).toBe("Today");
  });
});
