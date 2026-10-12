import { test, expect, type Page } from '@playwright/test';

const ROUTES = ['/en', '/en/daily', '/en/blast', '/en/quick-play', '/en/adventure', '/en/word-tower', '/en/multiplayer', '/en/student/craft', '/en/student/review'];

// master 77bd0eade already throws React #418 (text hydration mismatch) on /en/daily; the daily piece owns it.
const KNOWN: Record<string, RegExp> = { '/en/daily': /Minified React error #418;.*args\[\]=text/ };

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
    const known = KNOWN[path];
    expect(errors.filter((m) => !/ResizeObserver|Non-Error/.test(m) && !(known && known.test(m)))).toEqual([]);
  });
}
