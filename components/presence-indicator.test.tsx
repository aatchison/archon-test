import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { PresenceIndicator } from "@/components/presence-indicator";

describe("PresenceIndicator", () => {
  it("renders nothing when no viewers", () => {
    const { container } = render(<PresenceIndicator viewers={[]} />);
    expect(container.textContent).toBe("");
  });

  it("renders viewer names", () => {
    render(
      <PresenceIndicator viewers={[{ userId: "u1", userName: "Alice" }]} />,
    );
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByLabelText("1 user viewing")).toBeTruthy();
  });

  it("shows overflow count for 4+ viewers", () => {
    const viewers = [
      { userId: "u1", userName: "Alice" },
      { userId: "u2", userName: "Bob" },
      { userId: "u3", userName: "Carol" },
      { userId: "u4", userName: "Dave" },
    ];
    render(<PresenceIndicator viewers={viewers} />);
    expect(screen.getByText("+1")).toBeTruthy();
  });
});
