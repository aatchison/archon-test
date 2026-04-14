import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ConnectionStatus } from "@/components/connection-status";

describe("ConnectionStatus", () => {
  it("shows green dot when connected", () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it("shows yellow dot when connecting", () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText("Reconnecting...")).toBeTruthy();
  });

  it("shows red dot when disconnected", () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });
});
