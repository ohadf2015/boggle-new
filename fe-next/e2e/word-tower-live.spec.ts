import { test, expect } from '@playwright/test';

const MISSING_CODE = /ChunkLoadError|Loading chunk|Cannot find module|dynamically imported module|is not defined|Element type is invalid/i;

test.describe('Word Tower live entry points survive the v1 removal', () => {
  for (const route of ['/en/word-tower', '/en/word-tower/daily']) {
    test(`${route} loads without a missing-module error`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBe(200);
      await page.waitForLoadState('load');
      expect(errors.filter((m) => MISSING_CODE.test(m))).toEqual([]);
    });
  }

  test('the share card route still renders an image', async ({ request }) => {
    const res = await request.get('/api/word-tower/share?h=42&f=3&b=city&w=TOWER');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image');
  });
});
