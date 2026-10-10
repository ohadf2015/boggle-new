import { test, expect, type Page } from '@playwright/test';
import { readGrid, solveGrid, toGridArray, findWordPath, type GridCellInfo } from './helpers/grid-solver';

const TILE = '[role="grid"] [data-tile]';

async function openSolo(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'accepted');
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

  test('Blast keeps its own tiles and still draws the trail over them', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/en/blast', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('play-button').click({ timeout: 30_000 });
    const board = page.locator('[data-board][data-ghost]');
    await expect(board).toBeAttached({ timeout: 20_000 });
    const dismiss = page.getByRole('button', { name: /^(skip|got it|next|ok|let'?s go)$/i });
    for (let i = 0; i < 8; i++) {
      const b = dismiss.first();
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
      else if (i > 3) break;
      await page.waitForTimeout(400);
    }
    const cells = await readGrid(page);
    const row = cells.filter((c) => c.row === cells[0].row).slice(0, 3);
    await dragThrough(page, row);
    await expect(board).toHaveAttribute('data-mode', 'drag');
    await expect(page.locator('[data-board][data-ghost] [data-trail="core"]')).toHaveAttribute('points', /\d/);
    await page.mouse.up();
  });
});
