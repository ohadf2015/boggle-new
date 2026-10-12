import zlib from 'node:zlib';
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { goto, clearDailyState, type Locale } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

const CELLS = '[role=gridcell][data-letter]';
const OVERLAY_BTN = /^(skip|got it|next|let'?s go|continue|start playing)$/i;

async function dismissOverlays(page: Page) {
  for (let round = 0; round < 6; round++) {
    await page.waitForTimeout(300);
    const btns = page.getByRole('button', { name: OVERLAY_BTN });
    let clicked = false;
    for (let i = 0; i < (await btns.count()); i++) {
      const btn = btns.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 2_000 }).catch(() => {});
        clicked = true;
        break;
      }
    }
    if (!clicked) return;
  }
}

const PLAY_LABEL: Partial<Record<Locale, RegExp>> = { en: /^play$/i, he: /שחקו/ };

const COACH_SEEN = { lc_coach_wordHunt: '99' };

async function startGame(page: Page, locale: Locale = 'en') {
  await goto(page, '/daily/word-hunt', locale);
  await applyStorageFixture(page, { ...ONBOARDED_USER, ...COACH_SEEN });
  await clearDailyState(page);
  await page.reload();
  const play = page.getByRole('button', { name: PLAY_LABEL[locale] ?? /^play$/i }).first();
  await expect(play).toBeVisible({ timeout: 30_000 });
  await play.click();
  await expect(page.locator(CELLS).first()).toBeVisible({ timeout: 30_000 });
  await dismissOverlays(page);
}

async function centreOf(page: Page, row: number, col: number) {
  const box = await page.locator(`[role=gridcell][data-row="${row}"][data-col="${col}"]`).boundingBox();
  if (!box) throw new Error(`no cell ${row},${col}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function letterAt(page: Page, row: number, col: number) {
  return (await page.locator(`[role=gridcell][data-row="${row}"][data-col="${col}"]`).getAttribute('data-letter')) ?? '';
}

async function dragThrough(page: Page, cells: Array<[number, number]>) {
  const points = [];
  for (const [r, c] of cells) points.push(await centreOf(page, r, c));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
}

type Cell = { row: number; col: number; letter: string };

async function readBoard(page: Page): Promise<Cell[]> {
  return page.locator(CELLS).evaluateAll((els) =>
    els.map((el) => ({
      row: Number((el as HTMLElement).dataset.row),
      col: Number((el as HTMLElement).dataset.col),
      letter: ((el as HTMLElement).dataset.letter || '').toLowerCase(),
    })),
  );
}

let dictionary: Promise<string[]> | null = null;

function loadWords(request: APIRequestContext): Promise<string[]> {
  dictionary ??= (async () => {
    const res = await request.get('/dicts/en.dict.gz');
    expect(res.ok()).toBe(true);
    const text = zlib.gunzipSync(await res.body()).toString('utf8');
    return [...new Set(text.split('\n').map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3 && w.length <= 8))].sort();
  })();
  return dictionary;
}

/** The stage and the board both carry the verdict only for its short hold, so read them in one poll. */
async function expectVerdict(page: Page, pattern: RegExp) {
  const handle = await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="hunt-stage"]');
      const stage = el?.getAttribute('data-verdict');
      const board = document.querySelector('[role=grid]')?.getAttribute('data-verdict');
      if (!stage || !board) return null;
      const points = document.querySelector('[data-testid="hunt-stage-points"]')?.textContent ?? null;
      return { stage, board, text: el?.textContent ?? '', points };
    },
    undefined,
    { timeout: 15_000, polling: 50 },
  );
  const seen = (await handle.jsonValue()) as { stage: string; board: string; text: string; points: string | null };
  expect(seen.stage).toMatch(pattern);
  expect(seen.board).toBe(seen.stage);
  return seen;
}

function hasPrefix(sorted: string[], p: string) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < p) lo = mid + 1;
    else hi = mid;
  }
  return lo < sorted.length && sorted[lo].startsWith(p);
}

/** A 3-letter dictionary word (never the hidden target) and a dead-end non-word, both traceable on the board. */
function planPaths(cells: Cell[], words: string[]) {
  const at = new Map(cells.map((c) => [`${c.row},${c.col}`, c]));
  const set = new Set(words);
  let word: Cell[] | null = null;
  let junk: Cell[] | null = null;
  const dfs = (path: Cell[], s: string) => {
    if (word && junk) return;
    if (!word && s.length === 3 && set.has(s)) word = [...path];
    if (!junk && path.length >= 3 && !hasPrefix(words, s)) junk = [...path];
    if (path.length >= 6 || !hasPrefix(words, s)) return;
    const last = path[path.length - 1];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const n = at.get(`${last.row + dr},${last.col + dc}`);
      if (n && !path.includes(n)) dfs([...path, n], s + n.letter);
    }
  };
  for (const c of cells) dfs([c], c.letter);
  return { word: word as Cell[] | null, junk: junk as Cell[] | null };
}

/** Boustrophedon path from the bottom row up, n cells long, always 8-neighbour adjacent. */
async function serpentine(page: Page, n: number): Promise<Array<[number, number]>> {
  const cells = await readBoard(page);
  const rows = Math.max(...cells.map((c) => c.row)) + 1;
  const cols = Math.max(...cells.map((c) => c.col)) + 1;
  const out: Array<[number, number]> = [];
  for (let i = 0; out.length < n && i < rows; i++) {
    const r = rows - 1 - i;
    for (let j = 0; out.length < n && j < cols; j++) out.push([r, i % 2 ? cols - 1 - j : j]);
  }
  return out;
}

async function swipe(page: Page, path: Cell[]) {
  await dragThrough(page, path.map((c) => [c.row, c.col] as [number, number]));
  await page.mouse.up();
}

test.describe.configure({ timeout: 90_000 });

test.describe('Word Hunt board', () => {
  test('renders the board as a grid of letter tiles with an idle prompt', async ({ page }) => {
    await startGame(page);
    await expect(page.getByRole('grid')).toBeVisible();
    expect(await page.locator(CELLS).count()).toBeGreaterThanOrEqual(9);
    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-phase', 'idle');
    await expect(page.getByTestId('hunt-stage')).not.toContainText('wordHunt.');
  });

  test('a drag spells the live word on the stage and draws a trail through the tiles', async ({ page }) => {
    await startGame(page);
    const expected = (await letterAt(page, 0, 0)) + (await letterAt(page, 0, 1)) + (await letterAt(page, 0, 2));
    await dragThrough(page, [[0, 0], [0, 1], [0, 2]]);

    await expect(page.getByTestId('hunt-live-word')).toHaveText(expected, { ignoreCase: true });
    await expect(page.getByTestId('hunt-trail')).toBeVisible();
    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-phase', 'live');
    expect(await page.locator(`${CELLS}[data-state="sel"]`).count()).toBe(3);

    await page.mouse.up();
  });

  test('releasing submits the word, holds a verdict, then clears the board', async ({ page }) => {
    await startGame(page);
    await dragThrough(page, [[1, 0], [1, 1], [1, 2]]);
    await page.mouse.up();

    await expectVerdict(page, /^(good|bad|dupe)$/);
    await expect(page.getByTestId('hunt-trail')).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-phase', 'idle');
  });

  test('a dictionary word pays its reward once on the stage, joins the found list, and a repeat is already found', async ({ page, request }) => {
    await startGame(page);
    const { word } = planPaths(await readBoard(page), await loadWords(request));
    test.skip(!word, 'no 3-letter dictionary word on today\'s board');
    const spelled = word!.map((c) => c.letter).join('');

    await swipe(page, word!);
    const stage = page.getByTestId('hunt-stage');
    const good = await expectVerdict(page, /^good$/);
    expect(good.points).toMatch(/^\+\d+/);
    await expect(page.getByTestId('hunt-board-bubble')).toHaveCount(0);
    await expect(page.getByText(new RegExp(`^${spelled}$`, 'i')).filter({ visible: true }).first()).toBeVisible();
    await expect(stage).toHaveAttribute('data-phase', 'idle', { timeout: 5_000 });

    await swipe(page, word!);
    await expectVerdict(page, /^dupe$/);
  });

  test('a non-word is rejected with the reason and the life penalty', async ({ page, request }) => {
    await startGame(page);
    const { junk } = planPaths(await readBoard(page), await loadWords(request));
    test.skip(!junk, 'no dead-end path on the board');

    await swipe(page, junk!);
    const bad = await expectVerdict(page, /^bad$/);
    expect(bad.text).toMatch(/-\s?\d/);
  });

  test('a nine-letter swipe is a soft rejection with the length limit, no penalty', async ({ page }) => {
    await startGame(page);
    await dragThrough(page, await serpentine(page, 9));
    await page.mouse.up();
    const long = await expectVerdict(page, /^dupe$/);
    expect(long.text).toMatch(/8/);
  });

  test('a five-letter drag shows the long-word life bonus while it is still being spelled', async ({ page }) => {
    await startGame(page);
    await dragThrough(page, await serpentine(page, 5));
    await expect(page.getByTestId('hunt-stage-count')).toHaveText('5');
    await expect(page.getByTestId('hunt-stage')).toContainText(/\+3/);
    await page.mouse.up();
  });

  test('life drains while the clock runs', async ({ page }) => {
    await startGame(page);
    const bar = page.locator('[role=progressbar][aria-valuemax="100"]:not([aria-label])').first();
    const before = Number(await bar.getAttribute('aria-valuenow'));
    await expect.poll(async () => Number(await bar.getAttribute('aria-valuenow')), { timeout: 15_000 }).toBeLessThan(before);
  });

  test('the Word Hunt coach greets a first-time player and Skip puts the board in front', async ({ page }) => {
    await goto(page, '/daily/word-hunt', 'en');
    await applyStorageFixture(page, ONBOARDED_USER);
    await clearDailyState(page);
    await page.reload();
    await page.getByRole('button', { name: /^play$/i }).first().click();
    await expect(page.locator(CELLS).first()).toBeVisible({ timeout: 30_000 });
    const skip = page.getByRole('button', { name: /^skip$/i }).first();
    await expect(skip).toBeVisible({ timeout: 15_000 });
    await skip.click();
    await expect(skip).toBeHidden();
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('typing a word on the keyboard spells it on the stage and Enter submits it', async ({ page }) => {
    await startGame(page);
    const word = (await letterAt(page, 2, 0)) + (await letterAt(page, 2, 1)) + (await letterAt(page, 2, 2));
    await page.keyboard.type(word.toLowerCase(), { delay: 60 });
    await expect(page.getByTestId('hunt-live-word')).toHaveText(word, { ignoreCase: true });
    await page.keyboard.press('Enter');
    await expectVerdict(page, /^(good|bad|dupe)$/);
  });

  test('Quit asks for confirmation and Cancel keeps the run going', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /^quit$/i }).first().click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^cancel$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('the effects toggle in the header flips', async ({ page }) => {
    await startGame(page);
    const toggle = page.getByRole('group', { name: /music controls/i }).getByRole('button').first();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('Hebrew renders the board left-to-right inside an RTL page with Hebrew stage copy', async ({ page }) => {
    await startGame(page, 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('grid')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('hunt-stage')).toContainText(/[֐-׿]/);
  });
});

test.describe('Word Hunt board, desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('three columns flank the board: live ranks and loot', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout only');
    await startGame(page);
    await expect(page.locator('[data-game-shell=hunt]')).toBeVisible();
    const left = page.getByTestId('game-shell-left');
    const right = page.getByTestId('game-shell-right');
    await expect(left.getByText(/live ranks/i)).toBeVisible();
    await expect(left.getByTestId('shell-stat-tries')).toBeVisible();
    await expect(right.getByTestId('shell-words')).toBeVisible();
    const [l, board, r] = await Promise.all([left.boundingBox(), page.getByRole('grid').boundingBox(), right.boundingBox()]);
    expect(l!.x + l!.width).toBeLessThanOrEqual(board!.x);
    expect(board!.x + board!.width).toBeLessThanOrEqual(r!.x);
  });

  test('the life bar rides in the header row and the board takes the freed height', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout only');
    await startGame(page);
    await expect(page.getByTestId('survival-header').getByTestId('survival-header-center').getByRole('progressbar')).toBeVisible();
    const board = await page.getByRole('grid').boundingBox();
    expect(board?.width ?? 0).toBeGreaterThanOrEqual(400);
  });

  test('click-building a word shows the double-click submit hint', async ({ page, isMobile }) => {
    test.skip(isMobile, 'needs a hover pointer');
    await startGame(page);
    await page.locator('[role=gridcell][data-row="0"][data-col="0"]').click();
    await page.locator('[role=gridcell][data-row="0"][data-col="1"]').click();
    await expect(page.getByTestId('grid-doubleclick-submit-hint')).toBeVisible();
  });
});

async function boardMetrics(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[role=grid]')!;
    const cells = [...document.querySelectorAll<HTMLElement>('[role=gridcell][data-letter]')];
    const glyph = document.querySelector('[role=grid] [aria-hidden] span span');
    const tile = cells[0].getBoundingClientRect();
    const box = grid.getBoundingClientRect();
    return {
      tile: tile.width,
      font: glyph ? parseFloat(getComputedStyle(glyph).fontSize) : 0,
      bottom: box.bottom,
      viewport: window.innerHeight,
      touchAction: getComputedStyle(grid).touchAction,
    };
  });
}

async function touchSwipe(page: Page, cells: Array<[number, number]>) {
  const cdp = await page.context().newCDPSession(page);
  const pts = [];
  for (const [r, c] of cells) pts.push(await centreOf(page, r, c));
  const touch = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1, radiusX: 10, radiusY: 10, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(pts[0]) });
  for (let i = 1; i < pts.length; i++) {
    for (let s = 1; s <= 5; s++) {
      const p = { x: pts[i - 1].x + ((pts[i].x - pts[i - 1].x) * s) / 5, y: pts[i - 1].y + ((pts[i].y - pts[i - 1].y) * s) / 5 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(p) });
    }
  }
  return {
    selected: () => page.$$eval(`${CELLS}[data-state="sel"]`, (els) => els.map((e) => `${(e as HTMLElement).dataset.row},${(e as HTMLElement).dataset.col}`).sort()),
    release: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

for (const phone of [
  { name: 'phone', width: 390, height: 844, minTile: 55 },
  { name: 'short phone', width: 375, height: 667, minTile: 44 },
]) {
  test.describe(`Word Hunt board, ${phone.name} ${phone.width}x${phone.height}`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    test('tiles are finger-sized, letters scale with them, and the whole board is on screen', async ({ page }) => {
      await startGame(page);
      const m = await boardMetrics(page);
      expect(m.tile).toBeGreaterThanOrEqual(phone.minTile);
      expect(m.font / m.tile).toBeGreaterThanOrEqual(0.5);
      expect(m.bottom).toBeLessThanOrEqual(m.viewport);
      expect(m.touchAction).toBe('none');
    });

    test('a touch swipe selects exactly the tiles under a diagonal path, never pans, and submits once on release', async ({ page }) => {
      await startGame(page);
      await page.evaluate(() => {
        const w = window as unknown as { __pending: number };
        w.__pending = 0;
        const stage = document.querySelector('[data-testid="hunt-stage"]')!;
        let last = stage.getAttribute('data-phase');
        new MutationObserver(() => {
          const p = stage.getAttribute('data-phase');
          if (p === 'pending' && last !== 'pending') w.__pending++;
          last = p;
        }).observe(stage, { attributes: true, attributeFilter: ['data-phase'] });
      });
      const scrollBefore = await page.evaluate(() => [window.scrollY, document.querySelector('.overflow-y-auto')?.scrollTop ?? 0]);
      const swipe = await touchSwipe(page, [[0, 0], [1, 1], [2, 2], [2, 3]]);
      expect(await swipe.selected()).toEqual(['0,0', '1,1', '2,2', '2,3']);
      await swipe.release();
      await expectVerdict(page, /^(good|bad|dupe)$/);
      expect(await page.evaluate(() => (window as unknown as { __pending: number }).__pending)).toBe(1);
      expect(await page.evaluate(() => [window.scrollY, document.querySelector('.overflow-y-auto')?.scrollTop ?? 0])).toEqual(scrollBefore);
      await expect(page.locator(`${CELLS}[data-state="sel"]`)).toHaveCount(0);
    });
  });
}
