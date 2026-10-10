import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readGrid, toGridArray, solveGrid, findWordPath } from './helpers/grid-solver';

const DESKTOP = { width: 1440, height: 900 };

async function prime(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
  });
}

async function dismissCoaches(page: Page) {
  const coach = page.locator('button').filter({ hasText: /^\s*(skip|got it|ok|let'?s go)\s*$/i });
  for (let i = 0; i < 4; i++) {
    const first = coach.first();
    if (!(await first.isVisible().catch(() => false))) return;
    await first.click().catch(() => undefined);
  }
}

async function expectShell(page: Page, mode: string) {
  await expect(page.locator(`[data-game-shell="${mode}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('game-shell-left')).toBeVisible();
  await expect(page.getByTestId('game-shell-right')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectBoardOwnsHeight(page: Page) {
  const board = page.locator('.game-board-frame').first();
  await expect(board).toBeVisible();
  const box = await board.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(DESKTOP.height * 0.6);
}

function desktopOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'chromium', 'desktop layout');
}

test.describe('desktop game shell (1440x900)', () => {
  test.use({ viewport: DESKTOP });
  test.beforeEach(async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await prime(page);
  });

  test('quick classic: board owns the centre, clock and race in the rail, a typed word lands in the feed', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await page.goto('/en/quick-play');
    await page.getByTestId('mode-card-classic').click();
    await dismissCoaches(page);
    await expectShell(page, 'quick-classic');
    await expectBoardOwnsHeight(page);
    await expect(page.getByTestId('game-shell-left').getByTestId('shell-clock')).toBeVisible();

    const cells = await readGrid(page);
    const solved = await solveGrid(baseURL!, toGridArray(cells), 'en');
    const word = [...solved.easy, ...solved.medium, ...solved.hard].find((w) => findWordPath(cells, w));
    test.skip(!word, 'solver found no word on this board');
    await page.locator('body').click({ position: { x: 5, y: DESKTOP.height - 5 } });
    await page.keyboard.type(word!, { delay: 40 });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-shell-right').locator('[data-testid^="shell-word-row-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('solo classic: rails frame a height-sized board', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/en/singleplayer');
    await page.getByRole('button', { name: /^\s*start\s*$/i }).first().click({ timeout: 30_000 });
    await dismissCoaches(page);
    await expectShell(page, 'classic');
    await expectBoardOwnsHeight(page);
  });

  test('blast: tile guide and word feed sit beside the board', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/en/blast');
    await page.getByTestId('play-button').click({ timeout: 30_000 });
    await dismissCoaches(page);
    await expectShell(page, 'blast');
    await expect(page.getByTestId('blast-tile-legend')).toBeVisible();
  });

  test('word chain: the pyramid moves to the rail and the riddle takes the stage', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/en/connections/pyramid');
    await expectShell(page, 'word-chain');
    await expect(page.getByTestId('game-shell-left').getByTestId('pyramid-rail-map')).toBeVisible();
    await expect(page.getByTestId('game-shell-stage').getByTestId('pyramid-root')).toBeVisible();
  });
});

test.describe('phone keeps its own layout (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'phone layout');
    await prime(page);
  });

  test('quick classic: no rails, the board keeps its own clock', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/en/quick-play');
    await page.getByTestId('mode-card-classic').click();
    await dismissCoaches(page);
    await expect(page.locator('.game-board-frame').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('game-shell-left')).toBeHidden();
    await expect(page.getByTestId('timer-container')).toBeVisible();
  });
});
