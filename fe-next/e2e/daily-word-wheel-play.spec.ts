import { test, expect, type Page } from '@playwright/test';

const PRACTICE = '/en/daily/word-wheel?practice=1';

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

async function dismissCoaches(page: Page) {
  for (let i = 0; i < 4; i++) {
    const btn = page.getByRole('button', { name: /^(skip|got it|next)$/i }).first();
    if (!(await btn.isVisible().catch(() => false))) return;
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function startPractice(page: Page) {
  await open(page, PRACTICE);
  const play = page.getByRole('button', { name: /^play$/i }).first();
  await expect(play).toBeVisible({ timeout: 30000 });
  await play.click({ force: true });
  await expect(page.getByTestId('wheel-orbit')).toBeVisible({ timeout: 20000 });
  await dismissCoaches(page);
}

test.describe('Daily Word Wheel — phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pre-game card: one PLAY, the rules once, the board behind one tap', async ({ page }) => {
    await open(page, PRACTICE);
    await expect(page.getByRole('button', { name: /^play$/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('ready-rules')).toBeVisible();

    const toggle = page.getByRole('button', { name: /today's board/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: /hide board/i })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('tab')).toHaveCount(3, { timeout: 15000 });
    await page.getByTestId('leaderboard-more-tabs').click();
    await expect(page.getByRole('menuitem')).toHaveCount(3);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('play: rank ladder, typed word line and a reaction to every submit', async ({ page }) => {
    await startPractice(page);
    await expect(page.getByTestId('rank-ladder')).toBeVisible();
    await expect(page.getByTestId('rank-bubble')).toHaveText('0');
    await expect(page.getByTestId('found-words-slot')).toBeVisible();

    const letters = page.locator('[data-testid="wheel-orbit"] [data-wheel-letter]');
    for (const i of [0, 1, 2]) await letters.nth(i).click({ force: true });
    await expect(page.getByTestId('built-letter-tile')).toHaveCount(3);
    await page.getByTestId('inline-submit-chip').click({ force: true });
    await expect(page.getByTestId('word-feedback')).toBeVisible({ timeout: 10000 });

    const ranks = page.getByRole('button', { name: /see all ranks/i });
    await ranks.click();
    await expect(page.getByTestId('rank-list')).toBeVisible();
  });

  test('a word that breaks the rules is shown back in red', async ({ page }) => {
    await startPractice(page);
    const outer = page.locator('[data-testid="wheel-orbit"] [data-wheel-letter]:not([data-wheel-index="-1"])');
    for (const i of [0, 1, 2]) await outer.nth(i).click({ force: true });
    await page.getByTestId('inline-submit-chip').click({ force: true });
    await expect(page.getByTestId('word-feedback')).toHaveAttribute('data-kind', 'error', { timeout: 10000 });
    await expect(page.getByTestId('word-builder')).toHaveAttribute('data-state', 'rejected');
  });

  test('ending the run lands on the rank hero with share', async ({ page }) => {
    await startPractice(page);
    await page.getByRole('button', { name: /^end run$/i }).click({ force: true });
    await expect(page.getByTestId('word-wheel-results-hero')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('results-rank-name')).toBeVisible();
    await expect(page.getByTestId('word-wheel-words-stat')).toBeVisible();
  });
});

test.describe('Daily Word Wheel — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('play uses the width: rivals left, wheel and ladder centre, words right', async ({ page }) => {
    await startPractice(page);
    await expect(page.getByTestId('word-wheel-desktop-grid')).toBeVisible();
    await expect(page.getByText(/live ranks/i)).toBeVisible();
    await expect(page.getByTestId('rank-ladder')).toHaveCount(1);
    await expect(page.getByTestId('rank-bubble')).toBeVisible();
    await expect(page.getByTestId('found-words-slot')).toBeVisible();
    await page.getByRole('button', { name: /see all ranks/i }).click();
    await expect(page.getByTestId('rank-list')).toBeVisible();
  });
});

test.describe('Daily hub', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('lists today\'s puzzles with one primary quest', async ({ page }) => {
    await open(page, '/en/daily');
    await expect(page.locator('[data-testid^="quest-card-"]').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('secondary-modes')).toBeVisible();
  });
});
