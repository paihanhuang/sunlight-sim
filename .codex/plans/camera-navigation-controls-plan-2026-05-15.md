# Camera Navigation Controls Plan

Date: 2026-05-15

## Problem

Manual testing exposed a core usability gap: the simulator does not make map
navigation obvious or reliable enough for evaluating sunlight from arbitrary
viewing angles. A buyer needs to zoom, rotate, and tilt around the property to
inspect shadows on yards, walls, windows, roof planes, neighboring buildings,
and street-facing facades.

Current implementation notes:

- `CesiumSunViewer` creates a Cesium viewer with most built-in widgets hidden.
- The default Cesium mouse/touch camera controller should exist, but there are
  no visible camera controls or instructions.
- The UI dock and top bar sit above the full-screen canvas; they intentionally
  intercept pointer events where visible.
- Tests currently validate app controls and canvas rendering, but they do not
  validate wheel zoom, drag rotate, tilt, touch gestures, camera presets, or
  keyboard accessibility.
- Mobile layout can leave little practical canvas area for gestures because the
  controls stack over the map.

## Design Goal

Make camera navigation explicit, discoverable, and testable while preserving
the simulator's sunlight workflow.

The user should be able to:

- Zoom in/out.
- Rotate around the selected property.
- Tilt from overhead to oblique/street-adjacent angles.
- Reset to the selected property.
- Jump to useful sunlight-assessment camera presets.
- Use either mouse/touch gestures or visible controls.
- Understand when an interaction is happening over the map versus over a UI
  panel.

## Stage 0: Reproduce and Instrument Current Failure

Deliverables:

- Add a temporary or permanent debug camera readout available in test mode:
  - heading,
  - pitch,
  - range/height,
  - camera changed timestamp.
- Add test IDs to the Cesium canvas and camera readout.
- Confirm whether manual gesture failure is:
  - pointer events blocked by overlay layout,
  - Cesium camera controls disabled or constrained,
  - active camera flight consuming input,
  - insufficient free canvas area on desktop/mobile,
  - browser/WebGL focus issue,
  - user expectation mismatch due lack of visible controls.

Testing:

- Headed Playwright test that performs:
  - mouse wheel over canvas,
  - left-drag over canvas,
  - right-drag or middle-drag tilt where supported,
  - verifies camera readout changes after each gesture.
- Manual test on desktop:
  - Chrome,
  - with and without Google 3D Tiles key,
  - outside and inside UI-panel boundaries.

Exit Criteria:

- We know which interactions fail and why.
- The test suite can detect a non-moving camera, not just a nonblank canvas.

## Stage 1: Explicit Camera Controller Configuration

Deliverables:

- Configure Cesium `screenSpaceCameraController` intentionally:
  - enable rotate,
  - enable translate/pan,
  - enable zoom,
  - enable tilt,
  - enable look,
  - tune zoom distance/rate for property-scale inspection.
- Preserve collision behavior carefully:
  - Google 3D Tiles may support collision with `enableCollision`.
  - Local synthetic scene may need collision disabled to avoid camera traps.
- Prevent programmatic camera flights from fighting user input:
  - cancel or avoid repeated `flyTo` when the user is actively navigating.
  - only auto-focus after explicit location changes.
- Add a small state flag:
  - `cameraMode: "auto" | "manual"`.
  - Once a user navigates, avoid surprise recentering unless they click Reset.

Testing:

- Unit tests for camera-state reducer/helpers if extracted.
- Headed e2e gesture tests for:
  - wheel zoom changes camera range,
  - drag rotate changes heading,
  - tilt changes pitch,
  - camera remains interactive after location change and time scrub.

Exit Criteria:

- Native gestures work reliably on desktop in Google and local simulation modes.

## Stage 2: Visible Camera Controls

Deliverables:

- Add a compact camera toolbar outside the left control dock, positioned over a
  clear map area such as lower-right.
- Controls should use icons with tooltips:
  - zoom in,
  - zoom out,
  - rotate left,
  - rotate right,
  - tilt up,
  - tilt down,
  - reset view,
  - optional locate property.
- Use lucide icons where available.
- Keep controls as fixed-size square icon buttons to avoid layout shifts.
- Camera actions should operate around the selected property target, not around
  an arbitrary globe point.
- Add camera presets:
  - overhead,
  - low oblique,
  - north-facing,
  - south-facing,
  - east-facing,
  - west-facing,
  - afternoon-shadow view,
  - morning-shadow view.
- Add a small "Manual view" indicator after the user changes the camera.

Testing:

- Headed e2e clicks every toolbar control and verifies the camera readout
  changes in the expected direction.
- Screenshot checks that the toolbar does not cover key readouts, attribution,
  or the time controls on desktop.
- Accessibility tests:
  - buttons have accessible names,
  - keyboard focus is visible,
  - Enter/Space activates controls.

Exit Criteria:

- A user who does not know Cesium gestures can still navigate the map precisely.

## Stage 3: Layout and Hit-Testing Fixes

Deliverables:

- Reserve intentional interaction zones:
  - controls remain in the dock,
  - the majority of map canvas remains unobstructed,
  - camera toolbar floats over a non-critical area.
- Add a collapsible/minimizable control dock:
  - on desktop, allow hiding the left dock for full-map navigation,
  - on mobile, default to a compact bottom sheet with a handle.
- Ensure pointer-events are explicit:
  - map canvas receives events outside panels/toolbars,
  - panels receive events only within visible bounds,
  - transparent overlay areas do not block the canvas.
- Avoid covering Google/Cesium attribution.

Testing:

- Playwright hit-test checks using `elementFromPoint` at map interaction
  coordinates.
- Desktop viewport tests:
  - 1440x960,
  - 1280x720,
  - ultrawide.
- Mobile viewport tests:
  - iPhone-sized,
  - small Android-sized,
  - landscape mobile.
- Headed test manually drags through a known free-map area and verifies camera
  movement.

Exit Criteria:

- Canvas interaction remains available on every supported viewport.

## Stage 4: Touch and Trackpad Navigation

Deliverables:

- Validate and tune touch interaction:
  - pinch zoom,
  - one-finger rotate/pan behavior as configured,
  - two-finger tilt where supported,
  - toolbar fallback for devices where gestures are awkward.
- Add touch-friendly button sizing for camera toolbar.
- Avoid scroll/gesture conflict between the map and the mobile control sheet.

Testing:

- Playwright mobile emulation for:
  - tap camera buttons,
  - drag map,
  - basic touch/pointer events where Playwright support is reliable.
- Manual mobile browser test if available.
- Trackpad manual test on desktop:
  - scroll/pinch,
  - two-finger drag,
  - modifier-key alternatives if needed.

Exit Criteria:

- Mobile users can inspect shadows from multiple angles without fighting the UI.

## Stage 5: Sunlight-Specific Camera Modes

Deliverables:

- Add "Inspect shadow" camera helpers:
  - align camera with sun direction,
  - look opposite sun direction to see cast shadows,
  - side view perpendicular to sun direction,
  - overhead shadow map view.
- Link presets to current date/time and selected property.
- Keep the sun compass and camera heading consistent:
  - camera heading readout,
  - sun azimuth readout,
  - optional delta angle between camera direction and sun direction.

Testing:

- Unit tests for heading/preset math.
- E2E test:
  - set date/time,
  - click "shadow view",
  - verify camera heading is near expected sun-relative bearing.
- Visual smoke tests for morning/noon/evening presets.

Exit Criteria:

- Camera controls directly support the real estate lighting questions rather
  than only generic map navigation.

## Stage 6: Persistence and Shareability

Deliverables:

- Encode camera state in the URL:
  - lat/lng,
  - date/time,
  - heading,
  - pitch,
  - range,
  - shadow setting.
- Add "copy view link" for a property/view/time.
- On page load, restore camera state if present; otherwise use the default
  property-focused camera.

Testing:

- Unit tests for URL serialization/deserialization.
- E2E test:
  - navigate to a view,
  - copy/read URL,
  - reload,
  - verify location/time/camera readout restored.

Exit Criteria:

- A user can save or share the exact lighting view being assessed.

## Stage 7: Regression and Long-Run Coverage

Deliverables:

- Extend normal headed e2e:
  - camera gestures,
  - toolbar controls,
  - camera presets,
  - reset behavior.
- Extend the 30-minute year-round test lightly:
  - sample one camera preset or gesture per location,
  - avoid multiplying runtime or Google tile cost unnecessarily.
- Add a dedicated camera stress test:
  - repeated zoom/rotate/tilt across Google and local modes,
  - memory/performance observations,
  - no camera NaN/blank canvas states.

Testing:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:e2e:headed`
- `npm run test:e2e:year-round` only when long-run validation is explicitly
  requested.

Exit Criteria:

- The work is not considered complete unless headed e2e proves real user camera
  navigation works.

## Cross-Critique Concerns and Responses

1. Concern: Visible camera buttons might hide the map and make lighting harder
   to inspect.
   Response: Keep a compact lower-right toolbar, make the dock collapsible, and
   test layout at desktop/mobile breakpoints.

2. Concern: Gesture tests can be flaky with WebGL.
   Response: Verify camera numeric readouts instead of relying only on
   screenshots; use headed tests for final acceptance.

3. Concern: Programmatic recentering may undo user camera choices.
   Response: Track manual camera mode; only reset/fly on explicit location
   changes or Reset clicks.

4. Concern: Google 3D Tiles and local synthetic scene may behave differently.
   Response: Test both modes. Local mode provides deterministic CI-safe
   geometry; Google mode gets headed manual/live validation.

5. Concern: Mobile gestures can conflict with scrolling UI panels.
   Response: Introduce a bottom-sheet layout and explicit hit-test coverage.

6. Concern: Users need lighting-specific angles, not just free orbit controls.
   Response: Add sun-relative camera presets such as shadow view, sun-facing
   view, and overhead shadow view.

7. Concern: Camera controls could degrade performance with request-render mode.
   Response: request renders after toolbar commands and rely on Cesium input
   events for native gestures; include performance smoke in headed tests.

8. Concern: Accessibility can be lost with icon-only controls.
   Response: every icon button gets accessible names, titles/tooltips, keyboard
   activation, and visible focus.

9. Concern: Attribution or legal notices may be obscured by new controls.
   Response: screenshot/layout tests confirm attribution remains visible.

10. Concern: Camera state can make reports impossible to reproduce.
    Response: encode camera state in shareable URLs and later reports.

## Recommended First Implementation Slice

Implement Stages 0-2 first:

- camera readout,
- explicit Cesium camera controller configuration,
- visible camera toolbar,
- desktop headed gesture tests,
- desktop headed toolbar tests.

Then manually retest the exact complaint:

- zoom in/out,
- rotate,
- tilt,
- inspect Google 3D Tiles from arbitrary angles,
- confirm sunlight/shadow readouts still update while camera view changes.
