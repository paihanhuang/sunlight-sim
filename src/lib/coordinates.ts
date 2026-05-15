import type { PropertyLocation } from "../types";

export const DEFAULT_LOCATION: PropertyLocation = {
  label: "Sample property - San Francisco, CA",
  latitude: 37.7749,
  longitude: -122.4194,
  confidence: "sample-coordinate",
};

export function parseCoordinate(value: string, field: "latitude" | "longitude"): number {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a number.`);
  }

  const min = field === "latitude" ? -90 : -180;
  const max = field === "latitude" ? 90 : 180;

  if (parsed < min || parsed > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}
