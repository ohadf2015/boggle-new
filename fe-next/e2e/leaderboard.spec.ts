import { test, expect } from '@playwright/test';

// The nav links to this page as "Ranks" from every page. It used to dead-end on
// a "Coming soon" stub whenever the public Supabase env vars were absent from
// the build; the page now falls back to the cached /api/leaderboard route and
// must always render real rows.
test.describe('leaderboard page', () => {
  test('/en/leaderboard renders leaderboard rows, not the coming-soon stub', async ({ page }) => {
    const res = await page.goto('/en/leaderboard', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(400);

    await expect(page.getByText(/coming soon/i)).toHaveCount(0);
    await expect(page.getByTestId('leaderboard-row').first()).toBeVisible();
  });

  test('/en/ranks redirects to the leaderboard', async ({ page }) => {
    await page.goto('/en/ranks');
    await expect(page).toHaveURL(/\/en\/leaderboard$/);
  });
});
