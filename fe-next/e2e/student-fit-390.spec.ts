import { test, expect, type Browser } from '@playwright/test';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { open, randomUsername } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';
import { measureRoundFit } from './helpers/roundFit';

/**
 * Join and the student home must fit a 390x844 phone with no vertical scroll.
 * jsdom cannot measure layout, so this asserts it in a real browser.
 */
test.use({ viewport: { width: 390, height: 844 } });

for (const path of ['/en/join', '/en/student']) {
  test(`${path} fits 390x844 without vertical scroll`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await page.locator('main, [role="main"], body').first().waitFor();
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    }));

    expect(metrics.scrollHeight, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.scrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.innerWidth);
  });
}

/**
 * The in-round frame is shared by arcade and classroom rooms, so an arcade room
 * guards the student phone: the board sits right under the HUD, is never
 * squashed, and nothing (coach card, toast, dock, callouts) covers a tile.
 */
async function onboarded(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const page = await context.newPage();
  await open(page, '/multiplayer', 'en');
  await applyStorageFixture(page, ONBOARDED_USER);
  await open(page, '/multiplayer', 'en');
  const mp = new MultiplayerPage(page);
  await mp.waitForEntryReady();
  return { context, page, mp };
}

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
  test(`classic round on a ${viewport.width}x${viewport.height} phone: board under the HUD, square, uncovered`, async ({ browser }) => {
    test.setTimeout(180_000);
    const host = await onboarded(browser, { width: 1440, height: 900 });
    await host.mp.createRoom(randomUsername('Host'));
    const code = await host.mp.waitForHostLobby();
    await host.mp.selectClassicMode();
    const phone = await onboarded(browser, viewport);
    await phone.mp.joinByInvite('en', code, randomUsername('Kid'));
    await host.mp.waitForPlayerCount(2);
    await host.mp.startGameButton.click();
    await phone.mp.waitForGameStart();
    await expect(phone.page.locator('[data-testid="mp-countdown"]')).toBeHidden({ timeout: 15_000 });
    await phone.page.waitForTimeout(1500);

    const fit = await measureRoundFit(phone.page);
    const detail = JSON.stringify(fit);
    expect(fit.scrollHeight, detail).toBeLessThanOrEqual(fit.innerHeight);
    expect(fit.scrollWidth, detail).toBeLessThanOrEqual(fit.innerWidth);
    expect(fit.coveredTiles, detail).toBe(0);
    expect(Math.abs(fit.boardWidth - fit.boardHeight), detail).toBeLessThanOrEqual(2);
    expect(fit.boardWidth, detail).toBeGreaterThanOrEqual(viewport.width - 40);
    expect(fit.gapAboveBoard, detail).toBeLessThanOrEqual(96);
    expect(fit.boardBottom, detail).toBeLessThanOrEqual(fit.innerHeight);

    await host.context.close();
    await phone.context.close();
  });
}
