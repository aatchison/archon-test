// @ts-nocheck
import { mock, describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "test-user" } }),
  getUserId: async () => "test-user",
  signIn: async () => {},
  signOut: async () => {},
}));

const mockSearchTasks = mock(async () => ({ tasks: [], total: 0 }));
mock.module("@/actions/search", () => ({
  searchTasks: (...args: any[]) => mockSearchTasks(...args),
}));
mock.module("@/components/search-result", () => ({
  SearchResultItem: ({ result }: any) => (
    <div data-testid="result">{result.title}</div>
  ),
}));
mock.module("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
mock.module("@/lib/search", () => ({}));

import SearchPage from "./page";

afterEach(() => {
  cleanup();
  mockSearchTasks.mockReset();
  mockSearchTasks.mockImplementation(async () => ({ tasks: [], total: 0 }));
});

async function renderPage(params: Record<string, string> = {}) {
  const Component = await SearchPage({
    searchParams: Promise.resolve(params),
  });
  render(Component);
}

describe("SearchPage", () => {
  it("shows empty state when no query", async () => {
    await renderPage();

    expect(screen.getByText("Search")).toBeTruthy();
    expect(
      screen.getByText("Enter a search query to find tasks."),
    ).toBeTruthy();
  });

  it('shows "No tasks found" when query returns no results', async () => {
    mockSearchTasks.mockImplementation(async () => ({
      tasks: [],
      total: 0,
    }));

    await renderPage({ q: "nonexistent" });

    expect(
      screen.getByText("No tasks found matching your query."),
    ).toBeTruthy();
  });

  it("shows result count for results", async () => {
    mockSearchTasks.mockImplementation(async () => ({
      tasks: [
        {
          id: "t1",
          title: "Found task",
          description: "A task",
          priority: "medium",
          status: "active",
          listId: "l1",
        },
        {
          id: "t2",
          title: "Another task",
          description: "Another",
          priority: "low",
          status: "active",
          listId: "l1",
        },
      ],
      total: 2,
    }));

    await renderPage({ q: "task" });

    expect(screen.getByText(/2 results for/)).toBeTruthy();
  });

  it("renders SearchResultItem for each result", async () => {
    mockSearchTasks.mockImplementation(async () => ({
      tasks: [
        {
          id: "t1",
          title: "First task",
          description: "Desc",
          priority: "high",
          status: "active",
          listId: "l1",
        },
        {
          id: "t2",
          title: "Second task",
          description: "Desc",
          priority: "low",
          status: "completed",
          listId: "l1",
        },
      ],
      total: 2,
    }));

    await renderPage({ q: "task" });

    const results = screen.getAllByTestId("result");
    expect(results).toHaveLength(2);
    expect(screen.getByText("First task")).toBeTruthy();
    expect(screen.getByText("Second task")).toBeTruthy();
  });

  it("shows pagination when total > 20", async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      description: "Desc",
      priority: "medium",
      status: "active",
      listId: "l1",
    }));

    mockSearchTasks.mockImplementation(async () => ({
      tasks,
      total: 45,
    }));

    await renderPage({ q: "task" });

    expect(screen.getByText("Page 1 of 3")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
  });
});
