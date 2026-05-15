import { describe, expect, it } from "vitest";
import {
  combineDateAndTimeInTimeZone,
  getDaylightAppearance,
  getSolarDay,
  getSolarDayForDate,
  getSunPosition,
  getTimeZoneForLocation,
  getZonedSimulationTime,
} from "./solar";

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

  it("calculates solar day times in the property's timezone", () => {
    const taipeiDay = getSolarDayForDate("2026-06-21", 25.033, 121.5654, "Asia/Taipei");

    expect(taipeiDay.sunrise).toMatch(/^05:/);
    expect(taipeiDay.solarNoon).toMatch(/^11:/);
    expect(taipeiDay.sunset).toMatch(/^18:/);
  });

  it("looks up the selected property's IANA time zone", () => {
    expect(getTimeZoneForLocation(25.033, 121.5654)).toBe("Asia/Taipei");
    expect(getTimeZoneForLocation(37.3852, -122.1141)).toBe("America/Los_Angeles");
  });

  it("converts property-local clock time to the correct instant", () => {
    const taipeiFiveAm = combineDateAndTimeInTimeZone(
      "2026-06-21",
      "05:00",
      "Asia/Taipei"
    );
    const taipeiNinePm = combineDateAndTimeInTimeZone(
      "2026-06-21",
      "21:00",
      "Asia/Taipei"
    );

    expect(taipeiFiveAm.toISOString()).toBe("2026-06-20T21:00:00.000Z");
    expect(taipeiNinePm.toISOString()).toBe("2026-06-21T13:00:00.000Z");
  });

  it("keeps 5am and 9pm as distinct low-light conditions in the property timezone", () => {
    const fiveAm = getZonedSimulationTime("2026-06-21", "05:00", 25.033, 121.5654);
    const ninePm = getZonedSimulationTime("2026-06-21", "21:00", 25.033, 121.5654);

    const morning = getSunPosition(fiveAm.date, 25.033, 121.5654);
    const evening = getSunPosition(ninePm.date, 25.033, 121.5654);

    expect(fiveAm.timeZone).toBe("Asia/Taipei");
    expect(ninePm.timeZone).toBe("Asia/Taipei");
    expect(morning.elevationDeg).toBeLessThan(10);
    expect(evening.elevationDeg).toBeLessThan(10);
    expect(evening.elevationDeg).toBeLessThan(morning.elevationDeg - 10);
    expect(Math.abs(morning.azimuthDeg - evening.azimuthDeg)).toBeGreaterThan(90);
  });

  it("darkens night more than dawn for baked map imagery compensation", () => {
    const fiveAm = getZonedSimulationTime("2026-06-21", "05:00", 25.033, 121.5654);
    const ninePm = getZonedSimulationTime("2026-06-21", "21:00", 25.033, 121.5654);
    const morning = getSunPosition(fiveAm.date, 25.033, 121.5654);
    const evening = getSunPosition(ninePm.date, 25.033, 121.5654);

    const dawnAppearance = getDaylightAppearance(morning.elevationDeg);
    const nightAppearance = getDaylightAppearance(evening.elevationDeg);

    expect(nightAppearance.label).toBe("Night");
    expect(nightAppearance.overlayOpacity).toBeGreaterThan(
      dawnAppearance.overlayOpacity + 0.15
    );
  });
});
