import { defineConfig, devices } from '@playwright/test';

// Read-only checks against a deployed site (production by default). See e2e/smoke/readOnly.ts.
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: true,
  retries: 1,
  workers: 4,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://www.lexiclash.live',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
