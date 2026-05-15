# Sunlight Simulator Stage Plan

Date: 2026-05-15

## Assumptions

- The goal is a browser-based tool for evaluating a real estate property's outdoor sunlight and shade conditions from an address or latitude/longitude.
- The first usable product should show a photorealistic 3D neighborhood view, a date/time control, sun position, and approximate dynamic shadows.
- The app is decision-support only. It must not claim certified daylight, survey, legal, or architectural accuracy.
- Google Maps Platform is acceptable as a paid dependency.
- Implementation has not started yet; this repo currently contains workflow scaffolding and placeholder verification scripts.

## Current API Facts Checked

- Google Photorealistic 3D Tiles are available through the Map Tiles API as a high-resolution textured 3D mesh, rendered by compatible 3D Tiles renderers such as CesiumJS.
- Google Maps JavaScript 3D Maps exposes `Map3DElement` for photorealistic 3D maps, but the documented options center on camera, map mode, UI, and 3D overlays, not explicit date/time sunlight or shadow simulation controls.
- CesiumJS exposes simulation clock, scene lighting, globe lighting, and shadow-map controls, which makes it the better first renderer for a dynamic sunlight simulator.
- Google Solar API can provide building solar insights and data layers such as DSM, RGB imagery, flux, and hourly shade rasters where covered. This is useful for validation and optional analytical overlays, not a replacement for interactive date/time rendering.
- Google Maps Platform policies require visible attribution, forbid unauthorized caching/extraction/offline use, and forbid deriving new 3D objects or geodata from Google Maps content.

Primary docs checked:

- Google Maps JavaScript 3D Maps reference: https://developers.google.com/maps/documentation/javascript/reference/3d-map
- Google Photorealistic 3D Tiles: https://developers.google.com/maps/documentation/tile/3d-tiles
- Google 3D Tiles renderer guidance: https://developers.google.com/maps/documentation/tile/use-renderer
- Google Map Tiles API policies: https://developers.google.com/maps/documentation/tile/policies
- Google Maps Platform API security best practices: https://developers.google.com/maps/api-security-best-practices
- Google Geocoding API: https://developers.google.com/maps/documentation/geocoding/geocoding
- Google Places Autocomplete New: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
- Google Solar API overview and data layers: https://developers.google.com/maps/documentation/solar/overview and https://developers.google.com/maps/documentation/solar/data-layers
- NREL Solar Position Algorithm: https://midcdmz.nrel.gov/spa/
- CesiumJS ShadowMap docs: https://cesium.com/learn/cesiumjs/ref-doc/ShadowMap.html
- CesiumJS Globe lighting docs: https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Documentation/Globe.html

## Architecture Recommendation

Use this stack for the MVP:

- Frontend: TypeScript + Vite + React.
- 3D renderer: CesiumJS.
- Basemap: Google Photorealistic 3D Tiles through Map Tiles API.
- Location input: raw latitude/longitude first, then Google Places Autocomplete and Geocoding.
- Solar math: deterministic sun-position module using a vetted algorithm/library, validated against NREL SPA or NOAA reference cases.
- Optional backend: small Node service only if needed for server-side Geocoding, Solar API calls, billing controls, API-key isolation, and future reports.
- Testing: Vitest for units, Playwright for browser and visual tests, API calls mocked in CI with optional live-contract tests behind environment flags.

Do not use Google's native `gmp-map-3d` as the primary renderer until a spike proves it can support controllable date/time lighting and shadow behavior. It can remain a fallback or comparison path.

## Stage 0: Feasibility, Compliance, and Accuracy Contract

Deliverables:

- Confirm target regions: initially United States residential properties.
- Confirm Google Cloud billing setup, APIs, quota limits, and EEA limitations if applicable.
- Decide the public accuracy language:
  - "Approximate 3D sunlight visualization."
  - "Depends on Google imagery age, 3D mesh quality, seasonal foliage, weather, and missing obstructions."
  - "Not a substitute for survey-grade site analysis."
- Create an explicit compliance checklist:
  - Attribution always visible.
  - No tile/model/image scraping.
  - No offline Google Maps content.
  - No deriving building models or object inventory from Google tiles.
  - Cache only user inputs, app state, and permissible identifiers; do not cache Google map content beyond allowed HTTP behavior.

Testing gates:

- Manual live spike: load Google Photorealistic 3D Tiles in Cesium at three addresses.
- Manual live spike: enable Cesium shadows/lighting and verify time changes alter lighting/shadow direction in a controlled scene.
- Document known mismatch from baked imagery shadows in photorealistic textures.
- Check API key restrictions and billing alerts before any long-running tests.

Exit criteria:

- A written feasibility note confirms the renderer can support a credible MVP.
- The app's disclaimers and compliance checklist are approved before implementation.

## Stage 1: Project Scaffold and Verification Pipeline

Deliverables:

- Create Vite + React + TypeScript app.
- Add ESLint, Prettier, Vitest, Playwright.
- Replace placeholder `verify.sh` and `verify.ps1` with:
  - install check,
  - typecheck,
  - lint,
  - unit tests,
  - Playwright smoke tests when dependencies are installed.
- Add `.env.example` with `VITE_GOOGLE_MAPS_API_KEY` or server-side equivalent.
- Add CI-safe mocks for Google/Cesium dependencies.

Testing gates:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npx playwright test` for a minimal app smoke test.

Exit criteria:

- Clean verification on a fresh checkout with no real Google API key required.

## Stage 2: Location Input and Geocoding

Deliverables:

- Input modes:
  - address search,
  - latitude/longitude,
  - shareable URL parameters.
- Address search via Places Autocomplete and/or Geocoding.
- Manual coordinate fallback when Geocoding is unavailable, ambiguous, or too costly.
- Clear result confirmation: formatted address, lat/lng, time zone, and confidence.
- Error states for invalid address, no geocode result, API disabled, quota exceeded, and network failure.

Testing gates:

- Unit tests for coordinate parsing, bounds validation, URL serialization, and error mapping.
- Mocked integration tests for Geocoding and Places responses.
- Playwright tests for address search, lat/lng input, deep links, and failure states.

Exit criteria:

- User can reliably land the camera at a property without entering developer tools.

## Stage 3: Photorealistic 3D Map Viewer

Deliverables:

- Cesium viewer with Google Photorealistic 3D Tiles.
- Correct Google/Cesium attribution display, including `showCreditsOnScreen`.
- Camera presets:
  - overhead,
  - street-adjacent oblique,
  - south-facing,
  - north-facing,
  - property orbit.
- Loading states and WebGL unsupported state.
- Coverage fallback:
  - if photorealistic tiles are unavailable or poor quality, show a 2D/3D fallback message and still allow sun-position analysis.

Testing gates:

- Playwright screenshot tests at desktop and mobile viewport sizes.
- Canvas nonblank pixel checks.
- Attribution visibility checks.
- Performance smoke: initial usable view within a target budget on a representative machine.
- API-key missing and API-disabled flows.

Exit criteria:

- The app consistently renders a navigable photorealistic 3D view at target locations.

## Stage 4: Solar Time and Sun Position Engine

Deliverables:

- Local time zone resolution for the selected property.
- Date/time controls:
  - exact date,
  - time slider,
  - sunrise/noon/sunset shortcuts,
  - solstice/equinox presets,
  - live today mode,
  - daily animation.
- Sun position output:
  - azimuth,
  - elevation,
  - whether sun is above horizon,
  - sunrise/sunset and solar noon.
- Deterministic conversion from location and local time to Cesium clock time / light direction.

Testing gates:

- Golden vector tests against NREL SPA/NOAA reference cases.
- DST tests around spring/fall transitions.
- Leap day test.
- Hemisphere tests.
- High-latitude tests where sunrise/sunset may not exist.
- Time-zone boundary tests.

Exit criteria:

- Sun-position math is stable, tested, and visibly linked to the date/time UI.

## Stage 5: Dynamic Sunlight and Shadow Rendering

Deliverables:

- Cesium sun/lighting configuration tied to the selected simulation time.
- Shadow rendering toggles:
  - dynamic shadows on/off,
  - shadow darkness,
  - soft shadows,
  - quality/performance mode.
- Visible sun-direction helper:
  - compass,
  - sun path arc,
  - optional ground arrow.
- Explicit UI state when shadows are approximate because Google textures may contain baked shadows from source imagery.

Testing gates:

- Synthetic scene tests with known boxes/planes to verify shadow direction and length.
- Browser visual regression for morning/noon/evening at one known site.
- Mobile performance tests with low/medium/high shadow settings.
- GPU failure/degradation test.

Exit criteria:

- A user can scrub time and see directionally plausible light and shadow changes without confusing the result for certified analysis.

## Stage 6: Property-Focused Analysis Tools

Deliverables:

- Drop analysis points around the property: patio, yard, driveway, target window, roof point.
- For each point, show:
  - direct sun/shade estimate over the selected day,
  - sun exposure timeline,
  - first sun / last sun,
  - total daylight and estimated direct sunlight.
- Optional user-drawn polygon for yard/patio analysis.
- Heatmap overlay generated from app-owned sample points, not from extracting Google tile geometry.
- Exportable report view with screenshots, assumptions, date/time, address, and confidence notes.

Testing gates:

- Unit tests for time sampling and exposure aggregation.
- Visual tests for point markers, timeline, and report layout.
- Compliance test: user-created overlays remain separate from Google-derived content.

Exit criteria:

- The app answers real buyer questions such as "Will the backyard get afternoon sun in winter?" and "Which side is shaded at 9 AM?"

## Stage 7: Solar API Validation and Optional Analytical Layer

Deliverables:

- Optional server-side integration with Google Solar API for covered buildings.
- Display Solar API metadata:
  - imagery date,
  - imagery quality,
  - building center,
  - sunshine quantiles,
  - available data layers.
- Compare interactive simulation expectations against Solar API annual/hourly shade signals where possible.
- Do not treat Solar API as exact truth; it has its own coverage, imagery age, and assumptions.

Testing gates:

- Mocked API tests for `buildingInsights`, `dataLayers`, and GeoTIFF retrieval flows.
- GeoTIFF parsing tests using small local fixtures.
- Live-contract test gated by environment variable and skipped in normal CI.
- Cost guard: verify no live test loops over many addresses.

Exit criteria:

- The simulator can show an independent confidence signal without increasing legal or billing risk.

## Stage 8: Accuracy, Calibration, and User Trust

Deliverables:

- Confidence panel that explains:
  - 3D tile coverage/quality,
  - imagery date if available,
  - Solar API quality/date if used,
  - whether trees or new construction may be stale,
  - whether the target is partly occluded or low-detail.
- Optional user calibration:
  - upload/take a reference photo,
  - record "shadow reaches this point at this date/time",
  - adjust confidence notes without modifying Google-derived geometry.
- Optional external-data mode for higher accuracy:
  - municipal LiDAR,
  - user-supplied survey/BIM,
  - user-drawn obstruction models.

Testing gates:

- UX tests that the disclaimer appears before export.
- Snapshot tests for report assumptions.
- Regression tests for no overconfident language.

Exit criteria:

- The product is honest about uncertainty and useful despite uncertainty.

## Stage 9: Security, Billing, Observability, and Privacy

Deliverables:

- Restricted API keys:
  - browser key with HTTP referrer restrictions and API restrictions,
  - optional server key with IP restrictions,
  - separate keys per app/environment.
- Google Cloud budgets and alerts.
- Rate limiting for server endpoints.
- No secret keys in source.
- Basic telemetry:
  - render failures,
  - API failures,
  - tile load timings,
  - browser/GPU capability,
  - no unnecessary personal data collection.
- Document retention policy for saved properties and reports.

Testing gates:

- Secret scanning.
- Environment variable validation tests.
- API-key-missing tests.
- Server endpoint rate-limit tests if backend exists.
- Manual billing dashboard review after live tests.

Exit criteria:

- The app can be tested on real properties without avoidable credential or billing exposure.

## Stage 10: Release Hardening

Deliverables:

- Usability pass on mobile and desktop.
- Accessibility pass for controls, sliders, keyboard navigation, color contrast, and report readability.
- Browser support matrix:
  - Chrome,
  - Safari,
  - Edge,
  - Firefox where Cesium/WebGL behavior permits.
- Production build and deployment target.
- End-user docs:
  - supported inputs,
  - accuracy limitations,
  - billing/API setup for self-hosting,
  - troubleshooting.

Testing gates:

- Full verification script.
- Playwright cross-browser smoke.
- Lighthouse/performance checks.
- Manual test across 5-10 representative properties:
  - dense urban,
  - suburban,
  - trees,
  - hillside,
  - low/poor 3D coverage,
  - new construction if possible.

Exit criteria:

- A buyer can use the app end-to-end and receive a report with clear caveats.

## Cross-Critique Concerns and Resolutions

1. Concern: Google native 3D Maps may not support controllable sunlight.
   Resolution: Use CesiumJS + Google Photorealistic 3D Tiles for MVP; keep native `Map3DElement` only as a fallback/spike path.

2. Concern: Photorealistic textures include baked-in lighting/shadows from capture time.
   Resolution: Label dynamic shadows as approximate; offer analytical overlays and confidence notes; avoid claiming exact visual truth.

3. Concern: Google terms may prohibit extracting geometry or deriving datasets from tiles.
   Resolution: Use tiles only for visualization; do not scrape, cache, trace, classify, or derive models from Google Maps content; use user-drawn or separately licensed data for analysis geometry.

4. Concern: Real estate decisions need accuracy around trees, neighboring buildings, and recent construction.
   Resolution: Display confidence and imagery-date signals; allow optional user calibration; support external LiDAR/BIM later for higher accuracy.

5. Concern: API cost can spike during 3D map development.
   Resolution: API restrictions, budgets, alerts, live-test flags, mocked CI, and no bulk address loops.

6. Concern: Address search can land on the wrong parcel.
   Resolution: Always show resolved coordinate/address confirmation and allow manual coordinate correction.

7. Concern: Sun math errors around time zones and DST can invalidate the result.
   Resolution: Make solar calculations a separately tested module with NREL/NOAA golden vectors and DST/polar edge cases.

8. Concern: Browser/WebGL performance may be poor on phones.
   Resolution: Quality modes, request-render behavior, tile request tuning, reduced shadow quality, and mobile-specific visual/performance tests.

9. Concern: Users may interpret the output as a guarantee.
   Resolution: Use precise UI language, visible assumptions, and report caveats; avoid "accurate" except where tied to a measured/validated subsystem.

10. Concern: Solar API is roof/solar-oriented, not a full backyard daylight simulator.
    Resolution: Use Solar API as optional validation and context, not as the core rendering engine.

## Suggested First Milestone

Build a proof of concept with:

- one hardcoded coordinate,
- Cesium + Google Photorealistic 3D Tiles,
- a date/time slider,
- dynamic sun/shadow toggles,
- attribution visible,
- a disclaimer panel,
- screenshot smoke tests.

This milestone should be completed before building address search, reports, or Solar API integration.
