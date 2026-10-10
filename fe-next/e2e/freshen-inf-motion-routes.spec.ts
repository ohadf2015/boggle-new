import { test, expect, type Page } from '@playwright/test';

// Routes whose client bundles change with the `motion` -> `m` migration and the
// Pixi import confinement. Each must hydrate and render without a page error.
const ROUTES = ['/en', '/en/daily', '/en/blast', '/en/quick-play', '/en/adventure', '/en/word-tower', '/en/multiplayer', '/en/student/craft'];

async function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const path of ROUTES) {
  test(`${path} hydrates without page errors`, async ({ page }) => {
    const errors = await collectPageErrors(page);
    const response = await page.goto(path, { waitUntil: 'load' });
    expect(response?.status(), `status for ${path}`).toBeLessThan(400);
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors.filter((m) => !/ResizeObserver|Non-Error/.test(m))).toEqual([]);
  });
}
