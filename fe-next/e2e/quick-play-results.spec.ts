import { test, expect, type Page } from '@playwright/test';

/**
 * Quick Play wheel round ends on the results screen. Guest run, no words
 * played: the 60 s timer runs out and the results screen mounts. Checks the
 * avatar hero, the stat cards, the single primary action, and that the signup
 * sheet is held back over the reveal.
 *
 * networkidle and load never settle on /quick-play (live sockets), so we wait
 * for React to attach to the mode card instead.
 */
async function waitForReactAttached(page: Page, testId: string) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber'));
    },
    testId,
    { timeout: 60_000 }
  );
}

test.describe('/quick-play results', () => {
  test('shows the avatar hero, stat cards and one primary action, and holds the signup sheet back', async ({ page }) => {
    test.setTimeout(150_000);

    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookie-consent', 'accepted');
        sessionStorage.setItem('android_app_install_promo_shown', '1');
      } catch {}
    });
    await page.goto('/en/quick-play', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('mode-card-wheel-rush').waitFor({ state: 'visible', timeout: 60_000 });
    await waitForReactAttached(page, 'mode-card-wheel-rush');
    await page.getByTestId('mode-card-wheel-rush').click({ timeout: 20_000 });

    const results = page.getByTestId('quick-play-results');
    await expect(results).toBeVisible({ timeout: 120_000 });

    await expect(page.getByText('Round complete')).toBeVisible();
    await expect(page.getByTestId('quick-hero-avatar')).toBeVisible();
    await expect(page.getByTestId('quick-results-rays')).toHaveCount(1);
    await expect(page.getByTestId('quick-stats')).toBeVisible();
    await expect(page.getByTestId('quick-stat-score')).toBeVisible();
    await expect(page.getByTestId('quick-stat-words')).toBeVisible();

    const next = page.getByTestId('quick-results-next');
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();

    const stats = await page.getByTestId('quick-stats').boundingBox();
    const bar = await page.getByTestId('quick-results-cta-bar').boundingBox();
    const details = await page.getByTestId('quick-results-details').boundingBox();
    expect(stats && bar && details).toBeTruthy();
    expect(stats!.y + stats!.height).toBeLessThan(bar!.y);
    expect(details!.y).toBeGreaterThan(bar!.y - 48);

    const fade = await page.getByTestId('quick-results-cta-fade').boundingBox();
    expect(fade).toBeTruthy();
    expect(fade!.y + fade!.height).toBeLessThanOrEqual(bar!.y + 1);

    await page.waitForTimeout(4_000);
    expect(await page.getByText('Save your streak').count()).toBe(0);
  });
});
