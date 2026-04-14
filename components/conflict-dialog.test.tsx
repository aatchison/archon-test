import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictDialog } from "@/components/conflict-dialog";

describe("ConflictDialog", () => {
  it("renders nothing when no conflict", () => {
    const { container } = render(
      <ConflictDialog
        task={null}
        onRefresh={() => {}}
        onOverwrite={() => {}}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when conflict task provided", () => {
    render(
      <ConflictDialog
        task={{ id: "t1", title: "Test" }}
        onRefresh={() => {}}
        onOverwrite={() => {}}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText(/edited by someone else/i)).toBeTruthy();
  });

  it("calls onRefresh when Refresh clicked", async () => {
    const onRefresh = mock(() => {});
    render(
      <ConflictDialog
        task={{ id: "t1", title: "Test" }}
        onRefresh={onRefresh}
        onOverwrite={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("Refresh"));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("calls onOverwrite when Overwrite clicked", async () => {
    const onOverwrite = mock(() => {});
    render(
      <ConflictDialog
        task={{ id: "t1", title: "Test" }}
        onRefresh={() => {}}
        onOverwrite={onOverwrite}
      />,
    );
    await userEvent.click(screen.getByText("Overwrite"));
    expect(onOverwrite).toHaveBeenCalled();
  });
});
