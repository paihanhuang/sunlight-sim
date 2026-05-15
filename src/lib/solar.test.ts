import { describe, expect, it } from "vitest";
import { getSolarDay, getSunPosition } from "./solar";

describe("solar position", () => {
  it("places the sun high near the equator around equinox noon UTC", () => {
    const position = getSunPosition(new Date("2026-03-20T12:00:00Z"), 0, 0);

    expect(position.elevationDeg).toBeGreaterThan(85);
    expect(position.isDaylight).toBe(true);
  });

  it("puts the morning sun in the eastern sky for San Francisco", () => {
    const position = getSunPosition(new Date("2026-06-21T15:00:00Z"), 37.7749, -122.4194);

    expect(position.azimuthDeg).toBeGreaterThan(45);
    expect(position.azimuthDeg).toBeLessThan(150);
    expect(position.elevationDeg).toBeGreaterThan(20);
  });

  it("detects nighttime for San Francisco after local midnight", () => {
    const position = getSunPosition(new Date("2026-06-21T08:00:00Z"), 37.7749, -122.4194);

    expect(position.isDaylight).toBe(false);
    expect(position.elevationDeg).toBeLessThan(0);
  });

  it("calculates a plausible summer daylight window", () => {
    const day = getSolarDay(new Date("2026-06-21T12:00:00"), 37.7749, -122.4194);

    expect(day.sunrise).toMatch(/^\d{2}:\d{2}$/);
    expect(day.solarNoon).toMatch(/^\d{2}:\d{2}$/);
    expect(day.sunset).toMatch(/^\d{2}:\d{2}$/);
  });
});
