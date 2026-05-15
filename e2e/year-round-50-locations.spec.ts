import { expect, test, type Page } from "@playwright/test";

const RUN_DURATION_MS = 30 * 60 * 1000;
const YEAR = 2026;
const MONTH_DAYS = ["01-15", "02-15", "03-20", "04-15", "05-15", "06-21", "07-15", "08-15", "09-22", "10-15", "11-15", "12-21"];
const DAY_TIMES = ["07:30", "10:30", "13:30", "16:30"];

type TestLocation = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

const LOCATIONS: TestLocation[] = [
  { city: "Taipei", country: "Taiwan", latitude: 25.033, longitude: 121.5654 },
  { city: "Taichung", country: "Taiwan", latitude: 24.1477, longitude: 120.6736 },
  { city: "Tainan", country: "Taiwan", latitude: 22.9999, longitude: 120.227 },
  { city: "Kaohsiung", country: "Taiwan", latitude: 22.6273, longitude: 120.3014 },
  { city: "Hsinchu", country: "Taiwan", latitude: 24.8138, longitude: 120.9675 },
  { city: "Hualien", country: "Taiwan", latitude: 23.9872, longitude: 121.6015 },
  { city: "Taitung", country: "Taiwan", latitude: 22.7554, longitude: 121.1504 },
  { city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { city: "Kyoto", country: "Japan", latitude: 35.0116, longitude: 135.7681 },
  { city: "Osaka", country: "Japan", latitude: 34.6937, longitude: 135.5023 },
  { city: "Yokohama", country: "Japan", latitude: 35.4437, longitude: 139.638 },
  { city: "Sapporo", country: "Japan", latitude: 43.0618, longitude: 141.3545 },
  { city: "Fukuoka", country: "Japan", latitude: 33.5902, longitude: 130.4017 },
  { city: "Kobe", country: "Japan", latitude: 34.6901, longitude: 135.1955 },
  { city: "Nara", country: "Japan", latitude: 34.6851, longitude: 135.8048 },
  { city: "London", country: "UK", latitude: 51.5074, longitude: -0.1278 },
  { city: "Edinburgh", country: "UK", latitude: 55.9533, longitude: -3.1883 },
  { city: "Bath", country: "UK", latitude: 51.3758, longitude: -2.3599 },
  { city: "York", country: "UK", latitude: 53.959, longitude: -1.0815 },
  { city: "Oxford", country: "UK", latitude: 51.752, longitude: -1.2577 },
  { city: "Cambridge", country: "UK", latitude: 52.2053, longitude: 0.1218 },
  { city: "Manchester", country: "UK", latitude: 53.4808, longitude: -2.2426 },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { city: "Lyon", country: "France", latitude: 45.764, longitude: 4.8357 },
  { city: "Marseille", country: "France", latitude: 43.2965, longitude: 5.3698 },
  { city: "Nice", country: "France", latitude: 43.7102, longitude: 7.262 },
  { city: "Bordeaux", country: "France", latitude: 44.8378, longitude: -0.5792 },
  { city: "Strasbourg", country: "France", latitude: 48.5734, longitude: 7.7521 },
  { city: "Annecy", country: "France", latitude: 45.8992, longitude: 6.1294 },
  { city: "Los Altos", country: "USA", latitude: 37.3852, longitude: -122.1141 },
  { city: "Seattle", country: "USA", latitude: 47.6062, longitude: -122.3321 },
  { city: "San Francisco", country: "USA", latitude: 37.7749, longitude: -122.4194 },
  { city: "New York", country: "USA", latitude: 40.7128, longitude: -74.006 },
  { city: "Boston", country: "USA", latitude: 42.3601, longitude: -71.0589 },
  { city: "Chicago", country: "USA", latitude: 41.8781, longitude: -87.6298 },
  { city: "Washington DC", country: "USA", latitude: 38.9072, longitude: -77.0369 },
  { city: "Miami", country: "USA", latitude: 25.7617, longitude: -80.1918 },
  { city: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405 },
  { city: "Munich", country: "Germany", latitude: 48.1351, longitude: 11.582 },
  { city: "Hamburg", country: "Germany", latitude: 53.5511, longitude: 9.9937 },
  { city: "Heidelberg", country: "Germany", latitude: 49.3988, longitude: 8.6724 },
  { city: "Dresden", country: "Germany", latitude: 51.0504, longitude: 13.7373 },
  { city: "Cologne", country: "Germany", latitude: 50.9375, longitude: 6.9603 },
  { city: "Freiburg", country: "Germany", latitude: 47.999, longitude: 7.8421 },
  { city: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417 },
  { city: "Geneva", country: "Switzerland", latitude: 46.2044, longitude: 6.1432 },
  { city: "Lucerne", country: "Switzerland", latitude: 47.0502, longitude: 8.3093 },
  { city: "Bern", country: "Switzerland", latitude: 46.948, longitude: 7.4474 },
  { city: "Basel", country: "Switzerland", latitude: 47.5596, longitude: 7.5886 },
  { city: "Lausanne", country: "Switzerland", latitude: 46.5197, longitude: 6.6323 },
];

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

async function applyLocation(page: Page, location: TestLocation) {
  await page.getByLabel("Latitude").fill(location.latitude.toString());
  await page.getByLabel("Longitude").fill(location.longitude.toString());
  await page.getByRole("button", { name: "Apply coordinates" }).click();
  await expect(page.getByText("Coordinates applied.")).toBeVisible();
}

async function applySolarMoment(page: Page, monthDay: string, time: string) {
  await page.getByLabel("Date").fill(`${YEAR}-${monthDay}`);
  await page.getByLabel("Clock").fill(time);
  await expect(page.getByLabel("Clock")).toHaveValue(time);
}

test.describe("30-minute headed year-round sunlight sweep", () => {
  test.skip(
    process.env.RUN_YEAR_ROUND_50 !== "true",
    "Run with npm run test:e2e:year-round."
  );

  test("simulates one year across 50 international locations", async ({ page }) => {
    test.setTimeout(RUN_DURATION_MS + 120_000);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sunlight Simulator" })).toBeVisible();
    await expect(page.getByTestId("cesium-viewer").locator("canvas")).toBeVisible();
    await expect(page.getByTestId("viewer-status")).toContainText(/simulation|Google/i);
    await expectCanvasHasRenderedPixels(page);

    await page.getByLabel("Dynamic shadows").check();
    await page.getByLabel("Quality").selectOption("balanced");

    const start = Date.now();
    const deadline = start + RUN_DURATION_MS;
    const visited = new Set<string>();
    let samples = 0;
    let cycles = 0;
    let lastLog = start;

    while (Date.now() < deadline) {
      cycles += 1;

      for (const location of LOCATIONS) {
        if (Date.now() >= deadline) {
          break;
        }

        visited.add(`${location.city}, ${location.country}`);
        await applyLocation(page, location);

        for (const monthDay of MONTH_DAYS) {
          if (Date.now() >= deadline) {
            break;
          }

          for (const time of DAY_TIMES) {
            if (Date.now() >= deadline) {
              break;
            }

            await applySolarMoment(page, monthDay, time);
            samples += 1;

            if (samples % 24 === 0) {
              await expectCanvasHasRenderedPixels(page);
            }

            const now = Date.now();
            if (now - lastLog >= 60_000) {
              const elapsedMinutes = ((now - start) / 60_000).toFixed(1);
              console.log(
                `[year-round] ${elapsedMinutes}m elapsed; ${samples} solar moments; ${visited.size}/${LOCATIONS.length} locations; current ${location.city}, ${location.country}`
              );
              lastLog = now;
            }

            await page.waitForTimeout(250);
          }
        }
      }
    }

    await expect(page.getByLabel("Dynamic shadows")).toBeChecked();
    await expect(page.getByLabel("Quality")).toHaveValue("balanced");
    await expectCanvasHasRenderedPixels(page);
    expect(visited.size).toBe(LOCATIONS.length);
    expect(samples).toBeGreaterThanOrEqual(LOCATIONS.length * MONTH_DAYS.length);

    const elapsedMinutes = ((Date.now() - start) / 60_000).toFixed(1);
    console.log(
      `[year-round] completed ${elapsedMinutes}m headed sweep; ${samples} solar moments; ${cycles} city-list cycles; ${visited.size} locations`
    );
  });
});
