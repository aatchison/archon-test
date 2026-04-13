import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import ListCard from "./list-card";

describe("ListCard", () => {
  it("renders list name", () => {
    render(<ListCard id="1" name="Shopping" taskCount={3} dueSoonCount={0} />);
    expect(screen.getByText("Shopping")).toBeTruthy();
  });

  it("uses plural tasks for count > 1", () => {
    render(<ListCard id="1" name="Work" taskCount={5} dueSoonCount={0} />);
    expect(screen.getByText("5 tasks")).toBeTruthy();
  });

  it("uses singular task for count of 1", () => {
    render(<ListCard id="1" name="Work" taskCount={1} dueSoonCount={0} />);
    expect(screen.getByText("1 task")).toBeTruthy();
  });

  it("shows due soon count when > 0", () => {
    render(<ListCard id="1" name="Work" taskCount={5} dueSoonCount={2} />);
    expect(screen.getByText("2 due soon")).toBeTruthy();
  });

  it("hides due soon text when count is 0", () => {
    render(<ListCard id="1" name="Work" taskCount={3} dueSoonCount={0} />);
    expect(screen.queryByText(/due soon/)).toBeNull();
  });

  it("links to the correct list URL", () => {
    render(<ListCard id="abc123" name="Work" taskCount={0} dueSoonCount={0} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/lists/abc123");
  });
});
