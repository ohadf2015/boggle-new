import { test, expect, type Page } from '@playwright/test';

/**
 * Classic first round: a hinted word on the real board, drawn by the hand,
 * then steps that unlock as the player plays. Runs on the prod build.
 */

async function freshSolo(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* storage blocked */
    }
  });
  await page.goto('/en/singleplayer');
  await expect(page.locator('[data-testid=solo-slot-board]').first()).toBeVisible({ timeout: 30000 });
  const start = page.getByRole('button', { name: /^start$/i }).first();
  if (await start.isVisible({ timeout: 1500 }).catch(() => false)) await start.click();
}

async function hintCells(page: Page): Promise<Array<[number, number]>> {
  const bar = page.getByTestId('lesson-bar');
  await expect(bar).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await bar.getAttribute('data-lesson-path')) ?? '[]').not.toBe('[]');
  return JSON.parse((await bar.getAttribute('data-lesson-path')) ?? '[]');
}

async function dragCells(page: Page, cells: Array<[number, number]>) {
  const points: Array<{ x: number; y: number }> = [];
  for (const [r, c] of cells) {
    const box = await page.locator(`[data-row="${r}"][data-col="${c}"]`).first().boundingBox();
    if (!box) throw new Error(`cell ${r},${c} not on screen`);
    points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
}

test.describe('Classic first-round lesson', () => {
  test('shows the hinted word and completes the first step when it is traced', async ({ page }) => {
    await freshSolo(page);
    const cells = await hintCells(page);
    expect(cells.length).toBeGreaterThanOrEqual(3);

    const bar = page.getByTestId('lesson-bar');
    await expect(page.getByTestId('lesson-caption')).toContainText('Try:');

    await dragCells(page, cells);
    await expect(bar).toHaveAttribute('data-completed', '1');
    await expect(page.getByTestId('lesson-praise')).toBeVisible();
  });

  test('can be skipped and does not come back on reload', async ({ page }) => {
    await freshSolo(page);
    await hintCells(page);

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('lesson-bar')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-testid=solo-slot-board]').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('lesson-bar')).toHaveCount(0);
  });
});
