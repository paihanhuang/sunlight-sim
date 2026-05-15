import { describe, expect, it } from "vitest";
import { formatCoordinate, parseCoordinate } from "./coordinates";

describe("coordinates", () => {
  it("parses valid latitude and longitude", () => {
    expect(parseCoordinate("37.7749", "latitude")).toBeCloseTo(37.7749);
    expect(parseCoordinate("-122.4194", "longitude")).toBeCloseTo(-122.4194);
  });

  it("rejects out-of-range values", () => {
    expect(() => parseCoordinate("91", "latitude")).toThrow(/between -90 and 90/);
    expect(() => parseCoordinate("-181", "longitude")).toThrow(/between -180 and 180/);
  });

  it("formats coordinates consistently", () => {
    expect(formatCoordinate(37.7749123)).toBe("37.77491");
  });
});
