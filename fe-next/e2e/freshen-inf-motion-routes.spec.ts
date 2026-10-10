import { test, expect, type Page } from '@playwright/test';

// Routes whose client bundles change with the `motion` -> `m` migration and the
// Pixi import confinement. Each must hydrate and render without a page error.
const ROUTES = ['/en', '/en/daily', '/en/blast', '/en/quick-play', '/en/adventure', '/en/word-tower'];

async function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

for (const path of ROUTES) {
  test(`${path} hydrates without page errors`, async ({ page }) => {
    const errors = await collectPageErrors(page);
    const response = await page.goto(path);
    expect(response?.status(), `status for ${path}`).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
    expect(errors.filter((m) => !/ResizeObserver|Non-Error/.test(m))).toEqual([]);
  });
}
