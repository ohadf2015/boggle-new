import zlib from 'node:zlib';
import { test, expect, type Page } from '@playwright/test';
import { readGrid, solveGrid, toGridArray, findWordPath, type GridCellInfo } from './helpers/grid-solver';

const TILE = '[role="grid"] [data-tile]';

async function openSolo(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'accepted');
      localStorage.setItem('lexiclash.lesson.classic.v1', 'skipped');
    } catch {
      /* storage blocked */
    }
  });
  await page.goto('/en/singleplayer', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^start$/i }).first().click({ timeout: 30_000 });
  await expect(page.locator(TILE).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-board]')).toHaveAttribute('data-mode', 'idle');
}

async function centres(page: Page, path: GridCellInfo[]) {
  return Promise.all(
    path.map(async (c) => {
      const box = await page.locator(`${TILE}[data-row="${c.row}"][data-col="${c.col}"]`).boundingBox();
      if (!box) throw new Error(`tile ${c.row},${c.col} has no box`);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }),
  );
}

async function dragThrough(page: Page, path: GridCellInfo[]) {
  const pts = await centres(page, path);
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
}

const selectedOrder = (page: Page) =>
  page.locator(`${TILE}[data-sel]`).evaluateAll((els) =>
    els
      .map((el) => ({ k: `${(el as HTMLElement).dataset.row}-${(el as HTMLElement).dataset.col}`, i: Number((el as HTMLElement).style.getPropertyValue('--sel-i')) }))
      .sort((a, b) => a.i - b.i)
      .map((e) => e.k),
  );

async function realWordPath(page: Page, baseURL: string) {
  const cells = await readGrid(page);
  const words = await solveGrid(baseURL, toGridArray(cells), 'en');
  const all = new Set([...words.hard, ...words.medium, ...words.easy].map((w) => w.toLowerCase()));
  const path = [...all]
    .filter((w) => w.length >= 3 && w.length <= 6)
    .map((w) => findWordPath(cells, w))
    .find((p): p is GridCellInfo[] => p !== null);
  return { cells, all, path };
}

async function openBlast(page: Page) {
  await page.goto('/en/blast', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('play-button').click({ timeout: 30_000 });
  const board = page.locator('[data-board][data-ghost]');
  await expect(board).toBeAttached({ timeout: 45_000 });
  await expect(page.getByTestId('blast-level-intro')).toHaveCount(0, { timeout: 10_000 });
  const dismiss = page.getByRole('button', { name: /^(skip|got it|next|ok|let'?s go)$/i });
  for (let i = 0; i < 8; i++) {
    const b = dismiss.first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
    else if (i > 3) break;
    await page.waitForTimeout(400);
  }
  return board;
}

async function shippedWords(baseURL: string): Promise<Set<string>> {
  const res = await fetch(`${baseURL}/dicts/en.dict.gz`);
  expect(res.ok, 'the shipped dictionary is served').toBeTruthy();
  const buf = Buffer.from(await res.arrayBuffer());
  let text: string;
  try { text = zlib.gunzipSync(buf).toString('utf8'); } catch { text = buf.toString('utf8'); }
  const words = new Set(text.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
  expect(words.size, 'a real word list, not an error page').toBeGreaterThan(10_000);
  return words;
}

// The gate runs these on a saturated shared machine; a load-induced error boundary on first paint is retried.
test.describe.configure({ retries: 2 });

test.describe('shared letter board', () => {
  test('a drag lights the tiles in order, draws the trail and previews the word live', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await openSolo(page);
    const { path } = await realWordPath(page, baseURL!);
    expect(path, 'the solver should find a word the board can spell').toBeTruthy();
    const word = path!.map((c) => c.letter).join('').toUpperCase();

    await dragThrough(page, path!);

    await expect.poll(() => selectedOrder(page)).toEqual(path!.map((c) => `${c.row}-${c.col}`));
    await expect(page.locator('[data-board]')).toHaveAttribute('data-len', String(path!.length));
    const trail = (await page.locator('[data-trail="core"]').getAttribute('points'))!.trim().split(/\s+/);
    expect(trail).toHaveLength(path!.length);
    await expect(page.locator('[data-board-fly-target]')).toContainText(word);

    await page.mouse.up();
    await expect(page.locator(`${TILE}[data-sel]`)).toHaveCount(0);
    await expect(page.locator(`${TILE}[data-fx="ok"]`).first()).toBeAttached({ timeout: 5_000 });
    await expect(page.locator('[data-board]')).toHaveAttribute('data-verdict', 'ok');
  });

  test('a path that is not a word gets a gentle shake, not a celebration', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await openSolo(page);
    const { cells, all } = await realWordPath(page, baseURL!);
    const at = (r: number, c: number) => cells.find((x) => x.row === r && x.col === c)!;
    const rows = Math.max(...cells.map((c) => c.row)) + 1;
    let junk: GridCellInfo[] | null = null;
    for (let r = 0; r < rows && !junk; r++) {
      const cand = [at(r, 0), at(r, 1), at(r, 2), at(r, 3)];
      if (!all.has(cand.map((c) => c.letter).join('').toLowerCase())) junk = cand;
    }
    expect(junk).toBeTruthy();

    await dragThrough(page, junk!);
    await page.mouse.up();
    await expect(page.locator(`${TILE}[data-fx="bad"]`).first()).toBeAttached({ timeout: 5_000 });
    await expect(page.locator(`${TILE}[data-fx="ok"]`)).toHaveCount(0);
  });

  test('Blast keeps its own tiles, draws the trail over them and lifts the released word', async ({ page }) => {
    test.setTimeout(90_000);
    const board = await openBlast(page);
    const cells = await readGrid(page);
    const row = cells.filter((c) => c.row === cells[0].row).slice(0, 3);
    await dragThrough(page, row);
    await expect(board).toHaveAttribute('data-mode', 'drag');
    await expect(page.locator('[data-board][data-ghost] [data-trail="core"]')).toHaveAttribute('points', /\d/);
    const word = row.map((c) => c.letter).join('').toUpperCase();
    await page.mouse.up();
    const lift = page.locator('[data-board-overlay] [data-lift]');
    await expect(lift).toHaveText(new RegExp(`^${word}$`, 'i'), { timeout: 2_000 });
    const liftBox = await lift.boundingBox();
    const gridBox = await page.locator('[data-board][data-ghost] [role="grid"]').boundingBox();
    expect(liftBox!.y + liftBox!.height / 2).toBeLessThan(gridBox!.y);
    await expect(board).toHaveAttribute('data-verdict', /ok|bad|dupe/, { timeout: 8_000 });

    await expect(lift).toHaveCount(0, { timeout: 8_000 });
    await expect(page.locator('[data-board][data-ghost] [role="grid"]')).toHaveAttribute('tabindex', '0', { timeout: 15_000 });
    const again = (await readGrid(page)).filter((c) => c.letter);
    await dragThrough(page, [again[0], again[1]]);
    await expect(board).toHaveAttribute('data-mode', 'drag');
    await page.mouse.up();
  });

  test('Blast turns a non-word red and drops its letters the moment it is released', async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    const words = await shippedWords(baseURL!);
    const board = await openBlast(page);
    const cells = (await readGrid(page)).filter((c) => c.letter);
    const rows = [...new Set(cells.map((c) => c.row))];
    let junk: GridCellInfo[] | null = null;
    for (const r of rows) {
      const run = cells.filter((c) => c.row === r).sort((a, b) => a.col - b.col);
      for (let i = 0; i + 4 <= run.length && !junk; i++) {
        const cand = run.slice(i, i + 4);
        const contiguous = cand.every((c, j) => j === 0 || c.col === cand[j - 1].col + 1);
        if (contiguous && !words.has(cand.map((c) => c.letter).join('').toLowerCase())) junk = cand;
      }
      if (junk) break;
    }
    expect(junk, 'a 4-tile row run that is not a word').toBeTruthy();

    await dragThrough(page, junk!);
    await page.waitForTimeout(400);
    await page.mouse.up();
    const lift = page.locator('[data-board-overlay] [data-lift]');
    await expect(lift).toHaveAttribute('data-verdict', 'bad', { timeout: 5_000 });
    await expect(lift).toHaveCSS('background-color', 'rgb(255, 51, 102)');
    await expect(board).toHaveAttribute('data-verdict', 'bad');
  });

  test('pass-and-play party turns use the same board', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/en/party', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /start party/i }).click({ timeout: 30_000 });
    await page.getByRole('button', { name: /i'm ready/i }).click({ timeout: 10_000 });
    const board = page.locator('[data-board]');
    await expect(board.locator(TILE).first()).toBeVisible({ timeout: 10_000 });
    const cells = await readGrid(page);
    const row = cells.filter((c) => c.row === 0).slice(0, 3);
    await dragThrough(page, row);
    await expect(board).toHaveAttribute('data-len', '3');
    await page.mouse.up();
    await expect(board).toHaveAttribute('data-verdict', /ok|bad|dupe/, { timeout: 5_000 });
  });
});
