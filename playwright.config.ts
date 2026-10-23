import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, CONTEXT_DEFAULTS, PORT } from "./e2e/env";

const CI = process.env.CI !== undefined && process.env.CI !== "";

export default defineConfig({
  // Playwright's default testDir is the config's folder, whose default testMatch would also collect Vitest files.
  testDir: "./e2e",
  // Every spec signs in as the one seeded admin, so tests run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: 0,
  // README screenshots run only on demand: CLI --grep cannot re-include what the config grepInvert drops.
  ...(process.env.README_SCREENSHOTS ? {} : { grepInvert: /@screenshots/ }),
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "dot",
  use: {
    ...devices["Desktop Chrome"],
    ...CONTEXT_DEFAULTS,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: {
    // The reset runs here, not in globalSetup: Playwright starts webServer first, and the server must open a fresh DB.
    command: `npm run -s db:reset && npm run -s db:migrate && npm run -s db:seed && npm run start -- -p ${PORT}`,
    // `localhost`, not 127.0.0.1: under `next start` the session cookie is `secure`, which Chromium allows on localhost only.
    url: `${BASE_URL}/login`,
    // A port already in use must fail loudly rather than silently test another worktree's server.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: "file:./data/e2e.db",
      SESSION_SECRET: "e2e-only-session-secret-not-for-production-use",
    },
  },
});
