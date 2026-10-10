import { test, expect, type Page } from '@playwright/test';
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

async function startGame(page: Page, locale: Locale = 'en') {
  await goto(page, '/daily/word-hunt', locale);
  await applyStorageFixture(page, ONBOARDED_USER);
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

    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-verdict', /good|bad|dupe/, { timeout: 5_000 });
    await expect(page.getByRole('grid')).toHaveAttribute('data-verdict', /good|bad|dupe/);
    await expect(page.getByTestId('hunt-trail')).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-phase', 'idle');
  });

  test('typing a word on the keyboard spells it on the stage and Enter submits it', async ({ page }) => {
    await startGame(page);
    const word = (await letterAt(page, 2, 0)) + (await letterAt(page, 2, 1)) + (await letterAt(page, 2, 2));
    await page.keyboard.type(word.toLowerCase(), { delay: 60 });
    await expect(page.getByTestId('hunt-live-word')).toHaveText(word, { ignoreCase: true });
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('hunt-stage')).toHaveAttribute('data-verdict', /good|bad|dupe/, { timeout: 5_000 });
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
    await expect(page.getByTestId('desktop-grid')).toBeVisible();
    await expect(page.getByText(/live ranks/i).first()).toBeVisible();
    await expect(page.getByText(/loot collected/i).first()).toBeVisible();
  });

  test('click-building a word shows the double-click submit hint', async ({ page, isMobile }) => {
    test.skip(isMobile, 'needs a hover pointer');
    await startGame(page);
    await page.locator('[role=gridcell][data-row="0"][data-col="0"]').click();
    await page.locator('[role=gridcell][data-row="0"][data-col="1"]').click();
    await expect(page.getByTestId('grid-doubleclick-submit-hint')).toBeVisible();
  });
});
