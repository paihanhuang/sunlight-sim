export type PropertyLocation = {
  label: string;
  latitude: number;
  longitude: number;
  confidence?: string;
};

export type ShadowQuality = "balanced" | "high" | "battery";

export type MapMode = "google-photorealistic" | "local-simulation";
