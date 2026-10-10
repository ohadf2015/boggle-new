import { test, expect, type Page } from '@playwright/test';

async function freshFirstRound(page: Page, locale = 'en') {
  await page.addInitScript(() => {
    try {
      if (!window.sessionStorage.getItem('e2e-cleared')) {
        window.localStorage.clear();
        window.sessionStorage.setItem('e2e-cleared', '1');
      }
    } catch {
      /* storage blocked */
    }
  });
  await page.goto(`/${locale}/singleplayer?autoStart=coach`);
  await expect(page.locator('[data-testid=solo-slot-board]').first()).toBeVisible({ timeout: 30000 });
  const start = page.getByRole('button', { name: /^start$/i }).first();
  if (await start.isVisible({ timeout: 1500 }).catch(() => false)) await start.click();
}

async function targetPath(page: Page): Promise<Array<[number, number]>> {
  const target = page.getByTestId('lesson-target');
  await expect(target).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => (await target.getAttribute('data-path')) ?? '[]', { timeout: 15000 }).not.toBe('[]');
  return JSON.parse((await target.getAttribute('data-path')) ?? '[]');
}

async function dragCells(page: Page, cells: Array<[number, number]>) {
  const points: Array<{ x: number; y: number }> = [];
  for (const [r, c] of cells) {
    const box = await page.locator(`[data-testid=solo-slot-board] [data-row="${r}"][data-col="${c}"]`).first().boundingBox();
    if (!box) throw new Error(`cell ${r},${c} not on screen`);
    points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.mouse.up();
}

test.describe('First-round lesson', () => {
  test.describe.configure({ timeout: 90_000 });

  test('a new player traces the shown word and the first step lands with praise', async ({ page }) => {
    await freshFirstRound(page);
    const hud = page.getByTestId('lesson-hud');
    await expect(hud).toHaveAttribute('data-completed', '0');
    await expect(page.getByTestId('lesson-hand')).toBeAttached();

    const cells = await targetPath(page);
    expect(cells.length).toBeGreaterThanOrEqual(3);
    await dragCells(page, cells);

    await expect(hud).toHaveAttribute('data-completed', '1', { timeout: 10000 });
    await expect(page.getByTestId('lesson-sheet')).toHaveAttribute('data-kind', 'success');
    await expect(page.getByTestId('lesson-target')).toHaveAttribute('data-step', 'find-any');
  });

  test('can be skipped and stays gone after a reload', async ({ page }) => {
    await freshFirstRound(page);
    await targetPath(page);

    await page.getByRole('button', { name: 'Skip lesson' }).click();
    await expect(page.getByTestId('lesson-hud')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-testid=solo-slot-board]').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('lesson-hud')).toHaveCount(0);
  });

  test('runs right-to-left in Hebrew', async ({ page }) => {
    await freshFirstRound(page, 'he');
    const hud = page.getByTestId('lesson-hud');
    await expect(hud).toBeVisible({ timeout: 20000 });
    await expect(hud).toHaveAttribute('dir', 'rtl');
  });
});
