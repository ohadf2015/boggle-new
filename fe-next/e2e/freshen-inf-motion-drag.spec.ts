import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('multiplayer how-to-play: swiping the step card moves to the next step', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/en/multiplayer', { waitUntil: 'load' });
  await page.getByRole('button', { name: /how to play/i }).first().click();

  const sheet = page.getByTestId('entry-help-sheet');
  const card = sheet.getByTestId('step-content');
  await expect(card).toBeVisible({ timeout: 30_000 });
  const counter = sheet.getByTestId('progress-section');
  await expect(counter).toContainText(/1 \/ \d+/);

  const box = (await card.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * (0.8 - i * 0.06), y);
  await page.mouse.up();

  await expect(counter).toContainText(/2 \/ \d+/);
  expect(errors.filter((m) => !/ResizeObserver|Non-Error/.test(m))).toEqual([]);
});
