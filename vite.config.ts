import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 5173,
    strictPort: false,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
