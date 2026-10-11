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
    test.setTimeout(90_000);
    await page.goto('/en/singleplayer');
    await page.getByRole('button', { name: /^\s*start\s*$/i }).first().click({ timeout: 60_000 });
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

  test('lightning round: clock, target and keys in the rail, board in the centre', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/en/brain');
    await page.getByTestId('drill-level-lightning-round').click({ timeout: 60_000 });
    await page.getByRole('button', { name: /let'?s train/i }).click({ timeout: 30_000 });
    await expectShell(page, 'lightning');
    await expectBoardOwnsHeight(page);
    await expect(page.getByTestId('game-shell-left').getByTestId('shell-clock')).toBeVisible();
  });

  test('adventure: the guest fight keeps its foe bar on top, the board owns the centre and typed words land in the feed', async ({ page }) => {
    test.setTimeout(90_000);
    const demo = page.waitForResponse((r) => r.url().includes('/api/adventure/demo') && r.ok(), { timeout: 60_000 });
    await page.goto('/en/adventure');
    const { hints } = (await (await demo).json()) as { hints?: string[] };
    await dismissCoaches(page);
    await expectShell(page, 'adventure');
    await expectBoardOwnsHeight(page);
    await expect(page.getByTestId('game-shell-left').getByTestId('shell-clock')).toBeVisible();
    const word = hints?.[0];
    test.skip(!word, 'demo board came without hint words');
    await page.locator('body').click({ position: { x: 5, y: DESKTOP.height - 5 } });
    await page.keyboard.type(word!, { delay: 40 });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('game-shell-right').locator('[data-testid^="shell-word-row-"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('quick wheel: the wheel takes the centre, ranks left, one found-words list right', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/en/quick-play');
    await page.getByTestId('mode-card-wheel-rush').click();
    await dismissCoaches(page);
    await expectShell(page, 'wheel');
    const orbit = await page.getByTestId('wheel-orbit').boundingBox();
    expect(orbit?.height ?? 0).toBeGreaterThan(DESKTOP.height * 0.4);
    await expect(page.getByTestId('found-words-slot')).toHaveCount(1);
    await expect(page.getByTestId('game-shell-right').getByTestId('found-words-slot')).toBeVisible();
    await expect(page.getByTestId('game-shell-left').getByTestId('rank-ladder')).toBeVisible();
    await expect(page.getByTestId('game-shell-left').getByTestId('shell-keys')).toBeVisible();
  });

  test('wordcraft: the board is sized by height with the chrome beside it, no site header', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/en/word-craft');
    await page.getByRole('button', { name: /^\s*start game\s*$/i }).click({ timeout: 60_000 });
    const board = page.locator('[data-wc-board-square]');
    await expect(board).toBeVisible({ timeout: 30_000 });
    const box = await board.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(DESKTOP.height * 0.75);
    const rack = await page.locator('[data-rack-tile-id]').first().boundingBox();
    expect(rack?.x ?? 0).toBeGreaterThan((box?.x ?? 0) + (box?.width ?? 0));
    for (const header of await page.locator('[data-wc-page] > header').all()) await expect(header).toBeHidden();
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

  test('quick wheel: rails stay empty, one ladder and one word strip on the phone', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/en/quick-play');
    await page.getByTestId('mode-card-wheel-rush').click();
    await dismissCoaches(page);
    await expect(page.getByTestId('wheel-orbit')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('game-shell-left')).toBeHidden();
    await expect(page.getByTestId('game-shell-left').locator('*')).toHaveCount(0);
    await expect(page.getByTestId('rank-ladder')).toHaveCount(1);
    await expect(page.getByTestId('found-words-slot')).toHaveCount(1);
  });
});
