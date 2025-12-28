import { defineConfig, devices } from '@playwright/test';

/**
 * Custom Playwright config for single player redesign testing
 * Uses existing dev server instead of starting a new one
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['test-singleplayer-redesign.spec.ts', 'manual-test-singleplayer.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-singleplayer' }]],
  timeout: 60000,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - assumes dev server is already running
});
