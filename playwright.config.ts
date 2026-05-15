import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const viteEnv = loadEnv("", process.cwd(), "");
for (const [key, value] of Object.entries(viteEnv)) {
  process.env[key] ??= value;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
    headless: false,
    launchOptions: {
      slowMo: 80,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 960 },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chrome-headed-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
