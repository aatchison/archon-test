import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { RoleBadge } from "./role-badge";

afterEach(cleanup);

describe("RoleBadge", () => {
  it("renders OWNER with purple styling", () => {
    render(<RoleBadge role="OWNER" />);
    expect(screen.getByText("OWNER")).toBeTruthy();
  });

  it("renders EDITOR with blue styling", () => {
    render(<RoleBadge role="EDITOR" />);
    expect(screen.getByText("EDITOR")).toBeTruthy();
  });

  it("renders VIEWER with gray styling", () => {
    render(<RoleBadge role="VIEWER" />);
    expect(screen.getByText("VIEWER")).toBeTruthy();
  });
});
