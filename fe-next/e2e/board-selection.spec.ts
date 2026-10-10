import { test, expect, type Page } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';
import { readGrid, solveGrid, toGridArray, findWordPath, type GridCellInfo } from './helpers/grid-solver';

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
  await expect(page.locator('[role="gridcell"]').first()).toBeVisible({ timeout: 20_000 });
}

async function centerOf(page: Page, cell: GridCellInfo) {
  const box = await page
    .locator(`[role="gridcell"][data-row="${cell.row}"][data-col="${cell.col}"]`)
    .boundingBox();
  if (!box) throw new Error(`Cell (${cell.row},${cell.col}) has no bounding box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('shared letter board selection', () => {
  test('a live drag draws the finger trail and clears it on release', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await openSoloBoard(page);

    const cells = await readGrid(page);
    const words = await solveGrid(baseURL!, toGridArray(cells), 'en');
    const candidates = [...words.hard, ...words.medium, ...words.easy];
    const path = candidates
      .map((w) => findWordPath(cells, w))
      .find((p): p is GridCellInfo[] => p !== null && p.length >= 3);
    expect(path, 'solver should return a word the board can spell').toBeTruthy();

    const points = await Promise.all(path!.map((c) => centerOf(page, c)));
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) {
      await page.mouse.move(p.x, p.y, { steps: 5 });
    }

    const last = points[points.length - 1];
    await page.mouse.move(last.x + 30, last.y - 30, { steps: 4 });

    await expect(page.getByTestId('finger-trail')).toBeVisible();
    await expect
      .poll(async () => page.locator('[data-trail-layer="tail"] polyline').first().getAttribute('points'))
      .toMatch(/\d/);

    await page.mouse.up();
    await expect(page.getByTestId('finger-trail')).toHaveCount(0, { timeout: 5_000 });
  });

  test('the committed trail reaches every selected tile centre, not the board origin', async ({ page, baseURL }) => {
    test.setTimeout(60_000);
    await openSoloBoard(page);

    const cells = await readGrid(page);
    const words = await solveGrid(baseURL!, toGridArray(cells), 'en');
    const path = [...words.hard, ...words.medium, ...words.easy]
      .map((w) => findWordPath(cells, w))
      .find((p): p is GridCellInfo[] => p !== null && p.length >= 3);
    expect(path).toBeTruthy();

    const points = await Promise.all(path!.map((c) => centerOf(page, c)));
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) {
      await page.mouse.move(p.x, p.y, { steps: 5 });
    }

    const committed = page.locator('[data-trail-layer="committed"] polyline').nth(2);
    await expect(committed).toHaveAttribute('points', /\d/);
    const pts = (await committed.getAttribute('points'))!.trim().split(/\s+/);
    expect(pts).toHaveLength(path!.length);

    await page.mouse.up();
  });
});
