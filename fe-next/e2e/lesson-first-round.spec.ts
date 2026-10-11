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

  test('deals the friendly lesson board with CAT straight down the middle', async ({ page }) => {
    await freshFirstRound(page);
    const target = page.getByTestId('lesson-target');
    await expect(target).toHaveAttribute('data-word', 'CAT', { timeout: 20000 });
    expect(await targetPath(page)).toEqual([[1, 2], [2, 2], [3, 2]]);
    const topRow = await page
      .locator('[data-testid=solo-slot-board] [data-row="0"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-letter')).join(''));
    expect(topRow).toBe('CLOIS');
  });

  for (const [label, viewport] of [
    ['desktop', { width: 1280, height: 720 }],
    ['phone', { width: 390, height: 844 }],
  ] as const) {
    test(`the win banner sits in its own lane on ${label}: it never covers the found words, and it carries the points`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await freshFirstRound(page);
      await dragCells(page, await targetPath(page));
      const sheet = page.getByTestId('lesson-sheet');
      await expect(sheet).toHaveAttribute('data-kind', 'success', { timeout: 10000 });
      await expect(page.getByTestId('lesson-sheet-points')).toHaveText(/^\+\d+$/);
      const words = page.locator('[data-testid=solo-slot-words]:visible, [data-testid=shell-words]:visible');
      await expect(words).toHaveCount(1);
      const wordsBox = await words.boundingBox();
      const lane = await sheet.boundingBox();
      expect(wordsBox && lane).toBeTruthy();
      expect(wordsBox!.y + wordsBox!.height).toBeLessThanOrEqual(lane!.y + 1);
    });
  }
});
