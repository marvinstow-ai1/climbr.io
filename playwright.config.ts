import { defineConfig, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
const IS_CI = !!process.env.CI;

// When PREVIEW_URL is the local fallback we spin up `vite preview` ourselves so
// the workflow doesn't have to. When it's a remote URL (Vercel preview) we skip
// the local server step.
const USE_LOCAL_SERVER = PREVIEW_URL.startsWith("http://localhost");

export default defineConfig({
  testDir: "./tests",
  testMatch: /smoke\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: IS_CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: PREVIEW_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: IS_CI ? "retain-on-failure" : "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: USE_LOCAL_SERVER
    ? {
        // The smoke runs against a static-served frontend; the backend is
        // fully mocked via `page.route` so we don't need `vercel dev`. We
        // build with a dummy Supabase URL whose hostname becomes the
        // localStorage key prefix (`sb-localhost-auth-token`) that the
        // smoke spec writes to.
        command:
          "npm --prefix frontend run build && npm --prefix frontend run preview -- --port 4173 --strictPort",
        port: 4173,
        reuseExistingServer: !IS_CI,
        timeout: 120_000,
        env: {
          VITE_SUPABASE_URL: "http://localhost:54321",
          VITE_SUPABASE_ANON_KEY: "dummy-anon-key-for-smoke-test",
        },
      }
    : undefined,
});
