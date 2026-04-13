import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { LabelBadge } from "./label-badge";

afterEach(cleanup);

describe("LabelBadge", () => {
  it("renders the label name", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    expect(screen.getByText("Work")).toBeTruthy();
  });

  it("applies the color as background", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    const el = screen.getByText("Work").closest("span");
    expect(el?.style.backgroundColor).toBe("#3b82f6");
  });

  it("shows remove button when onRemove provided", () => {
    render(<LabelBadge name="Work" color="#3b82f6" onRemove={() => {}} />);
    expect(screen.getByLabelText("Remove Work")).toBeTruthy();
  });

  it("hides remove button when no onRemove", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    expect(screen.queryByLabelText("Remove Work")).toBeNull();
  });
});
