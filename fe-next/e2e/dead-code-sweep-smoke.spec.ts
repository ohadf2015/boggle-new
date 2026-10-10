import { test, expect } from '@playwright/test';

const PAGES = [
  '/en',
  '/he',
  '/en/word-tower',
  '/en/word-tower/daily',
  '/en/adventure',
  '/en/education',
  '/en/daily',
];

test.describe('pages next to swept-out modules still boot', () => {
  for (const route of PAGES) {
    test(`${route} renders without a runtime error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }
});
