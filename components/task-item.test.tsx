import { mock, describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";

mock.module("@/actions/tasks", () => ({
  toggleDone: async () => {},
  deleteTask: async () => {},
}));

import TaskItem from "./task-item";

afterEach(cleanup);

const base = {
  id: "t1",
  title: "Write tests",
  done: false,
  priority: "NONE" as const,
  dueDate: undefined,
  listId: "l1",
};

describe("TaskItem", () => {
  it("renders the task title", () => {
    render(<TaskItem task={base} />);
    expect(screen.getByText("Write tests")).toBeTruthy();
  });

  it("shows HIGH priority badge", () => {
    render(<TaskItem task={{ ...base, priority: "HIGH" }} />);
    expect(screen.getByText("HIGH")).toBeTruthy();
  });

  it("does not render NONE priority as text", () => {
    render(<TaskItem task={base} />);
    expect(screen.queryByText("NONE")).toBeNull();
  });

  it("applies line-through when done", () => {
    render(<TaskItem task={{ ...base, done: true }} />);
    const el = screen.getByText("Write tests");
    expect(el.className).toContain("line-through");
  });

  it("renders delete button", () => {
    render(<TaskItem task={base} />);
    expect(screen.getByText("Delete")).toBeTruthy();
  });
});
