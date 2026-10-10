import { test, expect } from '@playwright/test';

const PAGES = [
  '/en',
  '/he',
  '/en/word-tower',
  '/en/word-tower/daily',
  '/en/adventure',
  '/en/education',
  '/en/daily',
  '/en/blast',
  '/en/word-of-the-day',
];

const MISSING_CODE = /ChunkLoadError|Loading chunk|Cannot find module|dynamically imported module|is not defined|is not a function|Element type is invalid/i;

test.describe('pages next to swept-out modules still boot', () => {
  for (const route of PAGES) {
    test(`${route} renders without a missing-module error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForLoadState('load');
      expect(errors.filter((m) => MISSING_CODE.test(m))).toEqual([]);
    });
  }
});
