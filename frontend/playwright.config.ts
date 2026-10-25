import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

// Run against the local production build (`vite preview` + API, started automatically if not running),
// or against any deployment with E2E_BASE_URL=https://... (e.g. Docker on :8080 or Vercel).
const external = process.env.E2E_BASE_URL;
// Absolute + quoted so a relative E2E_PYTHON works from the backend cwd and under Windows cmd.exe.
const python = process.env.E2E_PYTHON ? `"${resolve(process.env.E2E_PYTHON)}"` : "python";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: external ?? "http://localhost:4173",
    // PW_CHANNEL=msedge|chrome uses an installed browser instead of `npx playwright install chromium`.
    channel: process.env.PW_CHANNEL || undefined,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: external
    ? undefined
    : [
        {
          command: `${python} -m uvicorn app.main:app --port 8000`,
          cwd: "../backend",
          url: "http://localhost:8000/api/health",
          reuseExistingServer: true,
          timeout: 120_000,
        },
        { command: "npm run build && npx vite preview --strictPort", url: "http://localhost:4173", reuseExistingServer: true, timeout: 180_000 },
      ],
});
