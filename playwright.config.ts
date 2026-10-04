import { defineConfig, devices } from "@playwright/test";

// Kräver en körande app (npm run build && npm start) kopplad till en Supabase med migrationen.
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "sv-SE",
    reducedMotion: "reduce",
    timezoneId: "Europe/Stockholm",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
});
