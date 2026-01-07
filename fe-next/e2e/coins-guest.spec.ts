import { test, expect } from '@playwright/test';

const COINS_STORAGE_KEY = 'lexiclash_coins';
const COINS_HISTORY_KEY = 'lexiclash_coins_history';

test.describe('Coins - Guest', () => {
  test('spends coins on paid reveal (after free reveals)', async ({ page }) => {
    const initialCoins = 1000;

    page.on('pageerror', error => {
      throw error;
    });

    page.on('console', message => {
      if (message.type() === 'error') {
        // Fail fast on client-side runtime errors; keeps signal strong for the original "throws an error" report.
        throw new Error(`console.error: ${message.text()}`);
      }
    });

    await page.addInitScript(({ initialCoinsValue }) => {
      const now = new Date().toISOString();
      localStorage.setItem(
        'lexiclash_coins',
        JSON.stringify({ total: initialCoinsValue, earnedFromDaily: 0, spent: 0, lastUpdated: now })
      );
      localStorage.setItem('lexiclash_coins_history', JSON.stringify([]));
    }, { initialCoinsValue: initialCoins });

    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');

    // Start a game quickly (any preset works).
    await page.locator('button').filter({ hasText: '5×5' }).first().click();

    // Wait until the in-game reveal button is ready.
    const revealButton = page.getByRole('button', { name: /reveal/i });
    await expect(revealButton).toBeVisible({ timeout: 30_000 });
    await expect(revealButton).toBeEnabled({ timeout: 30_000 });

    // 2 free reveals.
    await revealButton.click();
    await page.waitForTimeout(500);
    await revealButton.click();
    await page.waitForTimeout(500);

    const beforePaidReveal = await page.evaluate(() => {
      const raw = localStorage.getItem('lexiclash_coins');
      if (!raw) return 0;
      try {
        return (JSON.parse(raw) as { total?: number }).total ?? 0;
      } catch {
        return 0;
      }
    });

    // 3rd reveal should be paid.
    await revealButton.click();

    // Ensure we didn't hit the spend failure toast.
    await expect(page.getByText('Failed to process transaction')).toHaveCount(0);

    // Wait for localStorage update.
    await page.waitForFunction(
      () => {
        const raw = localStorage.getItem('lexiclash_coins');
        if (!raw) return false;
        try {
          const total = (JSON.parse(raw) as { total?: number }).total ?? 0;
          return total < 1000;
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 15_000 }
    );

    const afterPaidReveal = await page.evaluate(() => {
      const raw = localStorage.getItem('lexiclash_coins');
      if (!raw) return 0;
      try {
        return (JSON.parse(raw) as { total?: number }).total ?? 0;
      } catch {
        return 0;
      }
    });

    expect(afterPaidReveal).toBeLessThan(beforePaidReveal);
    expect(afterPaidReveal).toBeLessThan(initialCoins);
  });
});
