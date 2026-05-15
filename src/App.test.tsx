import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./components/CesiumSunViewer", () => ({
  CesiumSunViewer: () => <div data-testid="mock-cesium-viewer" />,
}));

describe("App", () => {
  it("renders the primary simulator controls", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Sunlight Simulator" })).toBeInTheDocument();
    expect(screen.getByLabelText("Latitude")).toBeInTheDocument();
    expect(screen.getByLabelText("Longitude")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Clock")).toBeInTheDocument();
    expect(screen.getByLabelText("Dynamic shadows")).toBeChecked();
  });
});
