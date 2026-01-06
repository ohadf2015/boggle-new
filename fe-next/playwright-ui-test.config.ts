import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for UI Improvements Testing
 * Tests against existing server on port 3001
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/ui-improvements.spec.ts',
  fullyParallel: false, // Run sequentially for better screenshots
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-ui-tests' }]],
  timeout: 120000, // 2 minutes per test

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
  ],

  // Use existing server on port 3000
  webServer: undefined, // Server already running
});
