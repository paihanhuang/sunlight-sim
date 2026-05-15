import { expect, test } from "@playwright/test";

async function expectCanvasHasRenderedPixels(page: import("@playwright/test").Page) {
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

test("headed user workflow changes property, time, and shadow settings", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sunlight Simulator" })).toBeVisible();
  await expect(page.getByTestId("cesium-viewer").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("viewer-status")).toContainText(/simulation|Google/i);
  await expectCanvasHasRenderedPixels(page);

  await page.getByLabel("Latitude").fill("34.0522");
  await page.getByLabel("Longitude").fill("-118.2437");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText("Coordinates applied.")).toBeVisible();
  await expect(page.getByText(/34\.05220, -118\.24370/)).toBeVisible();

  await page.getByLabel("Date").fill("2026-12-21");
  await page.getByLabel("Clock").fill("09:30");
  await expect(page.getByText("09:30")).toBeVisible();

  await page.getByRole("button", { name: "Noon" }).click();
  await expect(page.getByLabel("Clock")).not.toHaveValue("09:30");

  await page.getByLabel("Dynamic shadows").uncheck();
  await expect(page.getByLabel("Dynamic shadows")).not.toBeChecked();

  await page.getByLabel("Quality").selectOption("high");
  await expect(page.getByLabel("Quality")).toHaveValue("high");
});

test("headed address flow handles configured key state without blocking coordinate use", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("textbox", { name: "Address" })
    .fill("1600 Amphitheatre Parkway, Mountain View, CA");
  await page.getByRole("button", { name: "Search address" }).click();

  if (process.env.VITE_GOOGLE_MAPS_API_KEY) {
    await expect(page.getByText("Address resolved.")).toBeVisible();
  } else {
    await expect(page.getByText(/Address lookup requires VITE_GOOGLE_MAPS_API_KEY/)).toBeVisible();
  }

  await page.getByLabel("Latitude").fill("40.7128");
  await page.getByLabel("Longitude").fill("-74.0060");
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText(/40\.71280, -74\.00600/)).toBeVisible();
});
