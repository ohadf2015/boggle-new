import { test, expect, type Page } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

async function openSoloBoard(page: Page) {
  await goto(page, '/singleplayer?autoStart=bots');
  await applyStorageFixture(page, ONBOARDED_USER);
  await page.evaluate(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.removeItem('lexiclash_bots_game_played');
  });
  await goto(page, '/singleplayer?autoStart=bots');
  await waitForHydration(page);
  const notNow = page.getByRole('button', { name: /not now/i });
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await expect(page.locator('[data-row][data-col]').first()).toBeVisible({ timeout: 30_000 });
}

test.describe('solo desktop game rails', () => {
  test('1440x900: found-word rail stretches to the board height, no horizontal scroll', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop viewport check runs on the desktop project only');
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSoloBoard(page);

    const rail = page.getByTestId('desktop-rail-words');
    await expect(rail).toBeVisible();
    const box = await rail.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(400);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('390x844: the desktop rail stays hidden on phone width', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await openSoloBoard(page);

    await expect(page.getByTestId('desktop-rail-words')).toBeHidden();
  });
});
