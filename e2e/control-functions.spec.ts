import { expect, test, type Page } from "@playwright/test";

type CameraState = {
  heading: number;
  pitch: number;
  range: number;
  centerDistance: number;
  x: number;
  y: number;
  z: number;
  directionX: number;
  directionY: number;
  directionZ: number;
};

async function expectCanvasHasRenderedPixels(page: Page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return false;
    }

    const gl =
      canvas.getContext("webgl2", { preserveDrawingBuffer: true }) ||
      canvas.getContext("webgl", { preserveDrawingBuffer: true }) ||
      canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });

    if (!gl) {
      return false;
    }

    const context = gl as WebGLRenderingContext | WebGL2RenderingContext;
    const pixels = new Uint8Array(4);
    context.readPixels(
      Math.max(0, Math.floor(canvas.width / 2)),
      Math.max(0, Math.floor(canvas.height / 2)),
      1,
      1,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels
    );

    return pixels.some((value) => value > 0);
  });
}

async function readCameraState(page: Page): Promise<CameraState> {
  const state = await page.getByTestId("cesium-viewer").evaluate((element) => ({
    heading: Number(element.getAttribute("data-camera-heading")),
    pitch: Number(element.getAttribute("data-camera-pitch")),
    range: Number(element.getAttribute("data-camera-range")),
    centerDistance: Number(element.getAttribute("data-camera-center-distance")),
    x: Number(element.getAttribute("data-camera-x")),
    y: Number(element.getAttribute("data-camera-y")),
    z: Number(element.getAttribute("data-camera-z")),
    directionX: Number(element.getAttribute("data-camera-direction-x")),
    directionY: Number(element.getAttribute("data-camera-direction-y")),
    directionZ: Number(element.getAttribute("data-camera-direction-z")),
  }));

  expect(Number.isFinite(state.heading)).toBe(true);
  expect(Number.isFinite(state.pitch)).toBe(true);
  expect(Number.isFinite(state.range)).toBe(true);
  expect(Number.isFinite(state.centerDistance)).toBe(true);
  expect(Number.isFinite(state.x)).toBe(true);
  expect(Number.isFinite(state.y)).toBe(true);
  expect(Number.isFinite(state.z)).toBe(true);
  expect(Number.isFinite(state.directionX)).toBe(true);
  expect(Number.isFinite(state.directionY)).toBe(true);
  expect(Number.isFinite(state.directionZ)).toBe(true);

  return state;
}

async function waitForCameraChange(
  page: Page,
  before: CameraState,
  predicate: (after: CameraState, before: CameraState) => boolean
) {
  await page.waitForFunction(
    ({ beforeState }) => {
      const element = document.querySelector('[data-testid="cesium-viewer"]');
      if (!element) {
        return false;
      }

      const after = {
        heading: Number(element.getAttribute("data-camera-heading")),
        pitch: Number(element.getAttribute("data-camera-pitch")),
        range: Number(element.getAttribute("data-camera-range")),
        x: Number(element.getAttribute("data-camera-x")),
        y: Number(element.getAttribute("data-camera-y")),
        z: Number(element.getAttribute("data-camera-z")),
      };

      const positionDelta =
        Math.abs(after.x - beforeState.x) +
        Math.abs(after.y - beforeState.y) +
        Math.abs(after.z - beforeState.z);

      return (
        Math.abs(after.heading - beforeState.heading) > 0.05 ||
        Math.abs(after.pitch - beforeState.pitch) > 0.05 ||
        Math.abs(after.range - beforeState.range) > 0.5 ||
        positionDelta > 0.5
      );
    },
    { beforeState: before },
    { timeout: 10_000 }
  );

  const after = await readCameraState(page);
  expect(predicate(after, before)).toBe(true);
}

async function getFreeCanvasPoint(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      throw new Error("Cesium canvas was not found.");
    }

    const rect = canvas.getBoundingClientRect();
    const candidates = [
      [0.78, 0.55],
      [0.86, 0.46],
      [0.66, 0.72],
      [0.92, 0.34],
    ];

    for (const [xRatio, yRatio] of candidates) {
      const x = rect.left + rect.width * xRatio;
      const y = rect.top + rect.height * yRatio;
      if (document.elementFromPoint(x, y) === canvas) {
        return { x, y };
      }
    }

    throw new Error("No unobstructed canvas point was found for camera testing.");
  });
}

test("headed comprehensive simulator controls work through real browser interactions", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sunlight Simulator" })).toBeVisible();
  await expect(page.getByTestId("cesium-viewer").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("map-compass")).toBeVisible();
  await expect(page.getByTestId("map-compass")).toHaveAttribute(
    "data-compass-heading",
    /^-?\d+(\.\d+)?$/
  );
  await expect(page.getByTestId("daylight-overlay")).toHaveAttribute(
    "data-daylight-opacity",
    /^\d+\.\d{3}$/
  );
  await expect(page.getByTestId("viewer-status")).toContainText(/simulation|Google/i);
  await expectCanvasHasRenderedPixels(page);

  await page.getByLabel("Latitude").fill("37.3852");
  await page.getByLabel("Longitude").fill("-122.1141");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText("Coordinates applied.")).toBeVisible();
  await expect(page.getByText(/37\.38520, -122\.11410/)).toBeVisible();

  await page.getByRole("textbox", { name: "Address" }).fill("1600 Amphitheatre Parkway");
  await page.getByRole("button", { name: "Search address" }).click();
  if (process.env.VITE_GOOGLE_MAPS_API_KEY) {
    await expect(page.getByText("Address resolved.")).toBeVisible();
  } else {
    await expect(page.getByText(/Address lookup requires VITE_GOOGLE_MAPS_API_KEY/)).toBeVisible();
  }

  await page.getByLabel("Latitude").fill("47.6062");
  await page.getByLabel("Longitude").fill("-122.3321");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText(/47\.60620, -122\.33210/)).toBeVisible();
  await expect(page.getByText("America/Los_Angeles")).toBeVisible();

  await page.getByLabel("Date").fill("2026-06-21");
  await page.getByLabel("Clock").fill("08:40");
  await expect(page.getByLabel("Clock")).toHaveValue("08:40");
  await expect(page.getByText("08:40")).toBeVisible();

  await page.getByLabel("Time of day").fill("750");
  await expect(page.getByLabel("Clock")).toHaveValue("12:30");

  await page.getByRole("button", { name: "Sunrise" }).click();
  await expect(page.getByLabel("Clock")).not.toHaveValue("12:30");

  await page.getByRole("button", { name: "Noon" }).click();
  const noonValue = await page.getByLabel("Clock").inputValue();
  expect(noonValue).toMatch(/^\d{2}:\d{2}$/);

  await page.getByRole("button", { name: "Sunset" }).click();
  await expect(page.getByLabel("Clock")).not.toHaveValue(noonValue);

  await page.getByLabel("Latitude").fill("25.033");
  await page.getByLabel("Longitude").fill("121.5654");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText(/25\.03300, 121\.56540/)).toBeVisible();
  await expect(page.getByText("Asia/Taipei")).toBeVisible();
  await page.getByLabel("Clock").fill("05:00");
  await expect(page.getByLabel("Clock")).toHaveValue("05:00");
  await expect(page.getByText(/Low sun|Twilight/)).toBeVisible();
  const dawnOverlayOpacity = Number(
    await page.getByTestId("daylight-overlay").getAttribute("data-daylight-opacity")
  );
  await page.getByLabel("Clock").fill("21:00");
  await expect(page.getByLabel("Clock")).toHaveValue("21:00");
  await expect(page.getByText("Night")).toBeVisible();
  await expect
    .poll(async () =>
      Number(await page.getByTestId("daylight-overlay").getAttribute("data-daylight-opacity"))
    )
    .toBeGreaterThan(dawnOverlayOpacity + 0.15);

  await page.getByLabel("Dynamic shadows").uncheck();
  await expect(page.getByLabel("Dynamic shadows")).not.toBeChecked();
  await page.getByLabel("Dynamic shadows").check();
  await expect(page.getByLabel("Dynamic shadows")).toBeChecked();

  await page.getByLabel("Quality").selectOption("battery");
  await expect(page.getByLabel("Quality")).toHaveValue("battery");
  await page.getByLabel("Quality").selectOption("high");
  await expect(page.getByLabel("Quality")).toHaveValue("high");
  await page.getByLabel("Quality").selectOption("balanced");
  await expect(page.getByLabel("Quality")).toHaveValue("balanced");

  const point = await getFreeCanvasPoint(page);

  const beforeZoom = await readCameraState(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, -900);
  await waitForCameraChange(
    page,
    beforeZoom,
    (after, before) => Math.abs(after.range - before.range) > 0.5
  );

  const beforeZoomButton = await readCameraState(page);
  await page.getByRole("button", { name: "Camera zoom in" }).click();
  await waitForCameraChange(
    page,
    beforeZoomButton,
    (after, before) =>
      after.centerDistance < before.centerDistance &&
      Math.abs(after.heading - before.heading) < 0.1 &&
      Math.abs(after.pitch - before.pitch) < 0.1 &&
      Math.abs(after.directionX - before.directionX) < 0.001 &&
      Math.abs(after.directionY - before.directionY) < 0.001 &&
      Math.abs(after.directionZ - before.directionZ) < 0.001
  );

  const beforeZoomOutButton = await readCameraState(page);
  await page.getByRole("button", { name: "Camera zoom out" }).click();
  await waitForCameraChange(
    page,
    beforeZoomOutButton,
    (after, before) =>
      after.centerDistance > before.centerDistance &&
      Math.abs(after.heading - before.heading) < 0.1 &&
      Math.abs(after.pitch - before.pitch) < 0.1 &&
      Math.abs(after.directionX - before.directionX) < 0.001 &&
      Math.abs(after.directionY - before.directionY) < 0.001 &&
      Math.abs(after.directionZ - before.directionZ) < 0.001
  );

  const beforeRotateRight = await readCameraState(page);
  const compassBeforeRotateRight = await page
    .getByTestId("map-compass")
    .getAttribute("data-compass-heading");
  await page.getByRole("button", { name: "Camera rotate right" }).click();
  await waitForCameraChange(
    page,
    beforeRotateRight,
    (after, before) => Math.abs(after.heading - before.heading) > 0.05
  );
  await expect(page.getByTestId("map-compass")).not.toHaveAttribute(
    "data-compass-heading",
    compassBeforeRotateRight ?? ""
  );

  const beforeRotateLeft = await readCameraState(page);
  await page.getByRole("button", { name: "Camera rotate left" }).click();
  await waitForCameraChange(
    page,
    beforeRotateLeft,
    (after, before) => Math.abs(after.heading - before.heading) > 0.05
  );

  const beforeTiltUp = await readCameraState(page);
  await page.getByRole("button", { name: "Camera tilt up" }).click();
  await waitForCameraChange(
    page,
    beforeTiltUp,
    (after, before) => after.pitch > before.pitch
  );

  const beforeTiltDown = await readCameraState(page);
  await page.getByRole("button", { name: "Camera tilt down" }).click();
  await waitForCameraChange(
    page,
    beforeTiltDown,
    (after, before) => after.pitch < before.pitch
  );

  await page.getByRole("button", { name: "Camera reset view" }).click();
  await expect(page.getByRole("button", { name: "Camera reset view" })).toBeVisible();
  await readCameraState(page);

  await expectCanvasHasRenderedPixels(page);
});
