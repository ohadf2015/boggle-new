import { test, expect, type Page } from '@playwright/test';
import { goto, clearDailyState, waitForHydration, type Locale } from './helpers/test-utils';
import { applyStorageFixture, ONBOARDED_USER } from './helpers/storage-fixtures';

const CELLS = '[role=gridcell][data-letter]';

async function startGame(page: Page, locale: Locale = 'en') {
  await goto(page, '/daily/word-hunt', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
  await clearDailyState(page);
  await page.reload();
  await waitForHydration(page);
  await page.getByRole('button', { name: /^play$/i }).first().click();
  await page.locator(CELLS).first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function centreOf(page: Page, row: number, col: number) {
  const box = await page.locator(`[role=gridcell][data-row="${row}"][data-col="${col}"]`).boundingBox();
  if (!box) throw new Error(`no cell ${row},${col}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function letterAt(page: Page, row: number, col: number) {
  return (await page.locator(`[role=gridcell][data-row="${row}"][data-col="${col}"]`).getAttribute('data-letter')) ?? '';
}

test.describe('Word Hunt board', () => {
  test('renders the board as a grid of letter tiles', async ({ page }) => {
    await startGame(page);
    await expect(page.getByRole('grid')).toBeVisible();
    expect(await page.locator(CELLS).count()).toBeGreaterThanOrEqual(9);
  });

  test('drag shows the live word above the board and a trail through the tiles', async ({ page }) => {
    await startGame(page);
    const points = [await centreOf(page, 0, 0), await centreOf(page, 0, 1), await centreOf(page, 0, 2)];
    const expected = (await letterAt(page, 0, 0)) + (await letterAt(page, 0, 1)) + (await letterAt(page, 0, 2));

    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) {
      await page.mouse.move(p.x, p.y, { steps: 6 });
    }

    await expect(page.getByTestId('hunt-live-word')).toHaveText(expected, { ignoreCase: true });
    await expect(page.getByRole('grid').locator('svg path')).toHaveCount(1);

    await page.mouse.up();
  });

  test('the trail clears after release and the live word empties', async ({ page }) => {
    await startGame(page);
    const a = await centreOf(page, 1, 1);
    const b = await centreOf(page, 1, 2);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();

    await expect(page.getByRole('grid').locator('svg path')).toHaveCount(0, { timeout: 3_000 });
    await expect(page.getByTestId('hunt-live-word')).toHaveText('');
  });

  test('Hebrew RTL renders the same board', async ({ page }) => {
    await startGame(page, 'he');
    await expect(page.getByRole('grid')).toBeVisible();
    expect(await page.locator(CELLS).count()).toBeGreaterThanOrEqual(9);
  });
});
