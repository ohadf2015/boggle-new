import { test, expect } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';

test.describe('Daily Word Wheel pre-game and play chrome', () => {
  test('pre-game screen keeps PLAY primary and the board behind one tap (phone)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, '/daily/word-wheel?practice=1', 'en');
    await waitForHydration(page);

    await expect(page.getByRole('button', { name: /^play$/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('tap-hint-slot')).toHaveCount(0);

    const toggle = page.getByRole('button', { name: /today's board/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('play screen shows the wheel and the rank slot with no hint line (practice, phone)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, '/daily/word-wheel?practice=1', 'en');
    await waitForHydration(page);

    await page.getByRole('button', { name: /^play$/i }).first().click({ force: true });
    await expect(page.getByTestId('wheel-orbit')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('next-rival-slot')).toBeAttached();
    await expect(page.getByTestId('tap-hint-slot')).toHaveCount(0);
  });
});
