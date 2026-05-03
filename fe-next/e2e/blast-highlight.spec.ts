import { test, expect } from '@playwright/test';

test.describe('Blast highlight reel', () => {
  test('blast page loads without error', async ({ page }) => {
    // Navigate to English blast page (baseURL set to localhost:3001 in config)
    await page.goto('/en/blast');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Smoke test: verify page loaded with title
    // (deterministic full-flow requires test hooks in BlastEngine not yet present)
    await expect(page).toHaveTitle(/blast|lexiclash/i);
  });

  test('reduced-motion does not crash blast page', async ({ page, browserName }) => {
    // Skip non-chromium browsers for reduced-motion test
    test.skip(browserName !== 'chromium', 'reduced-motion emulation most deterministic on chromium');

    // Emulate reduced-motion media query
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Navigate to English blast page
    await page.goto('/en/blast');

    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Verify page loaded successfully even with reduced-motion enabled
    await expect(page).toHaveTitle(/blast|lexiclash/i);
  });
});
