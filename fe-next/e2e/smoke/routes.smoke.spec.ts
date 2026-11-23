import { test, expect } from './readOnly';

const ROUTES = [
  '/en',
  '/he',
  '/es',
  '/en/multiplayer',
  '/en/daily',
  '/en/daily-word-wheel',
  '/en/connections',
  '/en/crossword',
  '/en/blast',
  '/en/word-tower',
  '/en/leaderboard',
  '/en/education',
  '/en/teacher',
  '/en/pricing',
  '/en/how-to-play',
  '/en/blog',
  '/en/word-finder',
];

for (const path of ROUTES) {
  test(`${path} loads, renders a heading and throws nothing`, async ({ page, pageErrors }) => {
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible();
    await page.waitForLoadState('load');
    expect(pageErrors, `uncaught errors on ${path}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  });
}

test('the Hebrew home page is right-to-left', async ({ page }) => {
  await page.goto('/he', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('/api/health answers', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
});
