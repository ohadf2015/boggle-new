import zlib from 'node:zlib';
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

async function wheelTiles(page: Page) {
  return page.locator('[data-testid="wheel-orbit"] [data-wheel-letter]').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        l: (e.getAttribute('data-wheel-letter') || '').toLowerCase(),
        hub: e.getAttribute('data-wheel-index') === '-1',
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
      };
    }),
  );
}

async function wheelWords(page: Page, tiles: { l: string; hub: boolean }[]) {
  const res = await page.request.get('/dicts/en.dict.gz');
  expect(res.ok()).toBe(true);
  const center = tiles.find((t) => t.hub)?.l;
  const avail: Record<string, number> = {};
  for (const t of tiles) avail[t.l] = (avail[t.l] || 0) + 1;
  return zlib.gunzipSync(await res.body()).toString('utf8').split('\n').filter((w) => {
    if (w.length !== 4 || !center || !w.includes(center)) return false;
    const need: Record<string, number> = {};
    for (const c of w) if ((need[c] = (need[c] || 0) + 1) > (avail[c] || 0)) return false;
    return true;
  });
}

async function swipe(page: Page, word: string, tiles: { l: string; x: number; y: number }[]) {
  const used = new Set<number>();
  const pts = [...word].map((c) => {
    const i = tiles.findIndex((t, j) => !used.has(j) && t.l === c);
    used.add(i);
    return tiles[i];
  });
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) {
    await page.mouse.move(p.x, p.y, { steps: 6 });
    await page.waitForTimeout(160);
  }
  await page.mouse.up();
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
    await expect(page.getByTestId('word-feedback')).toBeVisible({ timeout: 20000 });

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

  test('a swipe clears the wheel at release and real words land in the list and the score', async ({ page }) => {
    await startPractice(page);
    const tiles = await wheelTiles(page);
    const words = await wheelWords(page, tiles);
    expect(words.length).toBeGreaterThan(0);

    for (const word of words.slice(0, 6)) {
      await dismissCoaches(page);
      await swipe(page, word, tiles);
      await page.waitForTimeout(250);
      await expect(page.getByTestId('built-letter-tile')).toHaveCount(0);
      if ((await page.getByTestId('found-word').count()) > 0) break;
      await page.waitForTimeout(900);
    }
    await expect.poll(() => page.getByTestId('found-word').count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('rank-bubble')).not.toHaveText('0');
  });

  test('first daily visit: nothing floats over the wheel and a swipe from a lower letter lands, even over a stray selection', async ({ page }) => {
    await page.route('**/api/daily-challenge/word-wheel/check-played/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasPlayed: false }) }),
    );
    await page.route('**/api/daily-challenge/word-wheel/submit', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
    );
    await open(page, '/en/daily/word-wheel');
    const play = page.getByRole('button', { name: /^play$/i }).first();
    await expect(play).toBeVisible({ timeout: 30000 });
    await play.click({ force: true });
    await expect(page.getByTestId('wheel-orbit')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(2500);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    const tiles = await wheelTiles(page);
    const lowFirst = (await wheelWords(page, tiles)).sort((a, b) => {
      const y = (w: string) => tiles.find((t) => t.l === w[0])?.y ?? 0;
      return y(b) - y(a);
    });
    expect(lowFirst.length).toBeGreaterThan(0);

    await page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      window.getSelection()?.addRange(range);
    });
    for (const word of lowFirst.slice(0, 6)) {
      await swipe(page, word, tiles);
      await page.waitForTimeout(250);
      expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
      if ((await page.getByTestId('found-word').count()) > 0) break;
      await page.waitForTimeout(900);
    }
    await expect.poll(() => page.getByTestId('found-word').count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('rank-bubble')).not.toHaveText('0');
  });

  test('mid-swipe the line only promises points for a real word', async ({ page }) => {
    await startPractice(page);
    const tiles = await wheelTiles(page);
    const outer = tiles.filter((t) => !t.hub).slice(0, 3);
    await page.mouse.move(outer[0].x, outer[0].y);
    await page.mouse.down();
    for (const p of outer.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
    await expect(page.getByTestId('built-letter-tile')).toHaveCount(3);
    await expect(page.getByTestId('word-points-preview')).toHaveCount(0);
    await page.mouse.up();
  });

  test('ending the run lands on the rank hero with share', async ({ page }) => {
    await startPractice(page);
    await page.getByRole('button', { name: /^end run$/i }).click({ force: true });
    const hero = page.getByTestId('daily-results-hero');
    await expect(hero).toBeVisible({ timeout: 15000 });
    await expect(hero).toHaveAttribute('data-mode', 'word-wheel');
    await expect(page.getByTestId('wheel-rank-meter')).toBeVisible();
    await expect(page.getByTestId('daily-results-stat').first()).toBeVisible();
  });
});

test.describe('Daily Word Wheel — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('play uses the width: rivals left, wheel and ladder centre, words right', async ({ page }) => {
    await startPractice(page);
    await expect(page.locator('[data-game-shell="wheel"]')).toBeVisible();
    await expect(page.getByTestId('game-shell-left').getByText(/live ranks/i)).toBeVisible();
    await expect(page.getByTestId('rank-ladder')).toHaveCount(1);
    await expect(page.getByTestId('rank-bubble')).toBeVisible();
    await expect(page.getByTestId('found-words-slot')).toHaveCount(1);
    await expect(page.getByTestId('game-shell-right').getByTestId('found-words-slot')).toBeVisible();
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
