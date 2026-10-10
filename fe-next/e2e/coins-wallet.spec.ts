import { test, expect, type Page } from '@playwright/test';

const EARN = 'lexiclash:coin-earned';

async function openBlast(page: Page) {
  await page.goto('/en/blast');
  await page.getByTestId('play-button').click({ timeout: 20_000 });
}

async function earn(page: Page, amount: number) {
  await page.evaluate(
    ([evt, amt]) => window.dispatchEvent(new CustomEvent(evt, { detail: { amount: amt } })),
    [EARN, amount] as const,
  );
}

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
] as const) {
  test.describe(`coin wallet in play (${name})`, () => {
    test.use({ viewport: size });

    test('wallet counter is always visible inside the viewport during play', async ({ page }) => {
      await openBlast(page);
      const wallet = page.getByTestId('coin-counter');
      await expect(wallet).toBeVisible();
      await expect(wallet).toHaveAttribute('data-coin-counter', 'true');
      const box = await wallet.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
    });

    test('an earn flies coins into the wallet and pops the reward counter', async ({ page }) => {
      await openBlast(page);
      await expect(page.getByTestId('coin-counter')).toBeVisible();
      await earn(page, 40);
      await expect(page.getByTestId('dom-coin-burst')).toBeAttached({ timeout: 2_000 });
      await expect(page.getByTestId('coin-reward-hud')).toBeVisible();
      await expect(page.getByTestId('coin-hud-delta')).toContainText('40');
    });
  });
}
