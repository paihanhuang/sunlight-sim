import type { PropertyLocation } from "../types";

let loaderPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __initSunlightGoogleMaps?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== "undefined" && google.maps) {
    return Promise.resolve();
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise((resolve, reject) => {
    window.__initSunlightGoogleMaps = () => resolve();

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback: "__initSunlightGoogleMaps",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps JavaScript API failed to load."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export async function geocodeAddress(
  address: string,
  apiKey: string | undefined
): Promise<PropertyLocation> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error("Address is required.");
  }

  if (!apiKey) {
    throw new Error("Address lookup requires VITE_GOOGLE_MAPS_API_KEY. Use coordinates for now.");
  }

  await loadGoogleMaps(apiKey);
  const geocodingLibrary =
    (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
  const geocoder = new geocodingLibrary.Geocoder();
  const response = await geocoder.geocode({ address: trimmed });
  const first = response.results.at(0);

  if (!first) {
    throw new Error("No address match was found.");
  }

  return {
    label: first.formatted_address,
    latitude: first.geometry.location.lat(),
    longitude: first.geometry.location.lng(),
    confidence: first.geometry.location_type.toLowerCase(),
  };
}
