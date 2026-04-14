import { mock, describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";

mock.module("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
mock.module("@/components/label-badge", () => ({
  LabelBadge: ({ name }: any) => <span>{name}</span>,
}));
mock.module("@/lib/dates", () => ({
  formatDueDate: () => ({ text: "Today", className: "text-gray-600" }),
}));
mock.module("@/lib/search", () => ({}));

import { SearchResultItem } from "./search-result";
import type { SearchResult } from "@/lib/search";

afterEach(cleanup);

const base: SearchResult = {
  id: "t1",
  title: "Test task",
  description: "desc",
  done: false,
  priority: "NONE",
  dueDate: new Date(),
  listId: "l1",
  listName: "My List",
  rank: -1.5,
  snippet: "test <mark>match</mark> here",
  labels: [],
};

describe("SearchResultItem", () => {
  it("renders title", () => {
    render(<SearchResultItem result={base} />);
    expect(screen.getByText("Test task")).toBeTruthy();
  });

  it("shows priority badge for HIGH", () => {
    render(<SearchResultItem result={{ ...base, priority: "HIGH" }} />);
    expect(screen.getByText("HIGH")).toBeTruthy();
  });

  it("hides NONE priority", () => {
    render(<SearchResultItem result={base} />);
    expect(screen.queryByText("NONE")).toBeNull();
  });

  it("applies line-through when done", () => {
    render(<SearchResultItem result={{ ...base, done: true }} />);
    const el = screen.getByText("Test task");
    expect(el.className).toContain("line-through");
  });

  it("renders list name", () => {
    render(<SearchResultItem result={base} />);
    expect(screen.getByText("My List")).toBeTruthy();
  });

  it("renders snippet with mark tags preserved", () => {
    render(<SearchResultItem result={base} />);
    const mark = document.querySelector("mark");
    expect(mark).toBeTruthy();
    expect(mark!.textContent).toContain("match");
  });

  it("strips non-mark HTML from snippet", () => {
    render(
      <SearchResultItem
        result={{ ...base, snippet: '<script>alert("x")</script>test <mark>ok</mark>' }}
      />,
    );
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("mark")).toBeTruthy();
  });

  it("renders label badges", () => {
    const labels = [
      { id: "lb1", name: "Bug", color: "#ff0000" },
      { id: "lb2", name: "Feature", color: "#00ff00" },
    ];
    render(<SearchResultItem result={{ ...base, labels }} />);
    expect(screen.getByText("Bug")).toBeTruthy();
    expect(screen.getByText("Feature")).toBeTruthy();
  });

  it("links to correct list URL", () => {
    render(<SearchResultItem result={base} />);
    const link = document.querySelector('a[href="/lists/l1"]');
    expect(link).toBeTruthy();
  });
});
