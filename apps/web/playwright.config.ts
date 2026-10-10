import { defineConfig, devices } from "@playwright/test";

// e2e tests (§10). The full demo path (§13) is Prathmesh's task 13; this starts with a smoke test.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // E2E_BASE_URL points the tests at an already running app (another port, or a deployment).
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "on-first-retry" },
  // Mobile-first: test at a low-cost Android phone size.
  projects: [{ name: "mobile", use: { ...devices["Pixel 5"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000/en",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
