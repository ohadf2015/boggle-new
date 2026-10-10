import { test, expect } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';

/**
 * Quick Play wheel round ends on the results screen. Guest run, no words
 * played: the 60 s timer runs out and the results hero mounts. Checks the
 * player avatar, the rays and sparkles layers, the single primary CTA, and
 * that the signup sheet does not cover the reveal.
 */
test.describe('/quick-play results', () => {
  test('shows the avatar hero and holds the signup sheet back', async ({ page }) => {
    test.setTimeout(150_000);

    await goto(page, '/quick-play');
    await waitForHydration(page);
    await page.getByTestId('mode-card-wheel-rush').click({ timeout: 20_000 });

    const results = page.getByTestId('quick-play-results');
    await expect(results).toBeVisible({ timeout: 120_000 });

    await expect(page.getByText('Round complete')).toBeVisible();
    await expect(page.getByTestId('quick-hero-avatar')).toBeVisible();
    await expect(page.getByTestId('quick-results-rays')).toHaveCount(1);
    await expect(page.getByTestId('quick-coin-flight')).toHaveCount(1);

    const next = page.getByTestId('quick-results-next');
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();

    await page.waitForTimeout(4_000);
    await expect(page.getByText('Save your streak')).toHaveCount(0);
  });
});
