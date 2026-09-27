import { test, expect } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';
import { readGrid } from './helpers/grid-solver';

/**
 * Highest-traffic solo path (PostHog 30d: 311 starts / 150 finishes).
 *
 * `singleplayerChunkRetry.test.tsx` mocks next/dynamic to null — it never
 * mounts SinglePlayerView. This spec is the real mount: past the
 * "Loading single player..." wrapper onto a playable board.
 *
 * Lands approved (stranded) proposals:
 * - da4cd485-ea66-4a27-989a-e006c29abc68
 * - ac9dfe82-e330-4eca-8064-3bf258f9c63d
 */

async function openSoloBotsBoard(page: import('@playwright/test').Page) {
  await goto(page, '/singleplayer?autoStart=bots');
  await applyStorageFixture(page, ONBOARDED_USER);
  await page.evaluate(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    // Returning-player gate redirects autoStart=bots → MP Quick Play.
    localStorage.removeItem('lexiclash_bots_game_played');
  });
  await goto(page, '/singleplayer?autoStart=bots');
  await waitForHydration(page);

  const notNow = page.getByRole('button', { name: /not now/i });
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
}

test.describe('/singleplayer mount-and-play', () => {
  test('reaches a playable board past the loading wrapper', async ({ page }) => {
    test.setTimeout(45_000);

    await openSoloBotsBoard(page);

    await expect(page.getByText('Loading single player...')).toHaveCount(0, {
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

    await expect(page).toHaveURL(/\/en\/singleplayer/);
  });
});
