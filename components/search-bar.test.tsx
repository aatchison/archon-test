import {
  mock,
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
} from "bun:test";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";

const mockPush = mock(() => {});
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetSuggestions = mock(async () => []);
mock.module("@/actions/search", () => ({
  getSearchSuggestions: (...args: any[]) => mockGetSuggestions(...args),
}));
mock.module("@/lib/search", () => ({}));

import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockPush.mockReset();
    mockGetSuggestions.mockReset();
    mockGetSuggestions.mockResolvedValue([]);
  });

  it("renders search input with placeholder", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("Search tasks...")).toBeTruthy();
  });

  it("has correct aria-label", () => {
    render(<SearchBar />);
    expect(screen.getByLabelText("Search tasks")).toBeTruthy();
  });

  it("submitting form with query navigates to /search?q=...", () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(input, { target: { value: "my query" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).toHaveBeenCalledWith("/search?q=my%20query");
  });

  it("does not navigate on empty submit", () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Search tasks...");
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows suggestions after typing", async () => {
    mockGetSuggestions.mockResolvedValueOnce([
      {
        taskId: "t1",
        title: "Task one",
        listId: "l1",
        listName: "My List",
      },
    ]);
    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), {
      target: { value: "ta" },
    });
    await waitFor(
      () => {
        expect(screen.getByText("Task one")).toBeTruthy();
      },
      { timeout: 1000 },
    );
  });

  it("clicking suggestion navigates to /lists/{listId}", async () => {
    mockGetSuggestions.mockResolvedValueOnce([
      {
        taskId: "t1",
        title: "Task one",
        listId: "l1",
        listName: "My List",
      },
    ]);
    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), {
      target: { value: "ta" },
    });
    await waitFor(
      () => {
        expect(screen.getByText("Task one")).toBeTruthy();
      },
      { timeout: 1000 },
    );
    fireEvent.click(screen.getByText("Task one"));
    expect(mockPush).toHaveBeenCalledWith("/lists/l1");
  });

  it('shows "Search for" link at bottom of suggestions', async () => {
    mockGetSuggestions.mockResolvedValueOnce([
      {
        taskId: "t1",
        title: "Task one",
        listId: "l1",
        listName: "My List",
      },
    ]);
    render(<SearchBar />);
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), {
      target: { value: "ta" },
    });
    await waitFor(
      () => {
        expect(screen.getByText(/Search for/)).toBeTruthy();
      },
      { timeout: 1000 },
    );
  });
});
