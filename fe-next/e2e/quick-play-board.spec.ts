import { test, expect } from '@playwright/test';
import { goto } from './helpers/test-utils';
import { readGrid } from './helpers/grid-solver';

/**
 * /en/quick-play is the highest-traffic solo path, and its headless probes
 * show "Building your board…" with no grid cells — a hydration-timing
 * artifact in probes, but indistinguishable there from a real board-render
 * regression. This spec is the automated signal that tells them apart:
 * past the loading wrapper onto a mounted board with real letters.
 * (Mirrors the /singleplayer mount-and-play assertions.)
 */

test.describe('/en/quick-play board render', () => {
  test('renders a playable letter grid past the loading wrapper', async ({ page }) => {
    test.setTimeout(45_000);

    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookie-consent', 'accepted');
        localStorage.setItem('lexiclash_onboarding_completed', 'true');
        sessionStorage.setItem('android_app_install_promo_shown', '1');
      } catch {}
    });
    await goto(page, '/quick-play?mode=classic');

    // The hub holds "Building your board…" through the round fetch + strike
    // beat; the round unmounts it when the board is dealt.
    await expect(page.getByText('Building your board…')).toHaveCount(0, {
      timeout: 20_000,
    });

    await expect(page.locator('[data-testid="grid-container"]')).toBeVisible({
      timeout: 20_000,
    });

    const cells = page.locator('[role="gridcell"]');
    await expect(cells.first()).toBeVisible({ timeout: 20_000 });
    expect(await cells.count()).toBeGreaterThanOrEqual(16);

    const letters = await readGrid(page);
    expect(letters.length).toBeGreaterThanOrEqual(16);
    expect(letters.every((c) => c.letter.length > 0)).toBe(true);

    await expect(page).toHaveURL(/\/en\/quick-play/);
  });
});
