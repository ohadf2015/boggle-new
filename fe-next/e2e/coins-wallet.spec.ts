import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

const EARN = 'lexiclash:coin-earned';
const SPEND = 'lexiclash:coin-spent';

async function openBlast(page: Page, locale = 'en') {
  await page.goto(`/${locale}/blast`);
  const wallet = page.getByTestId('coin-counter');
  // A click that lands before hydration does nothing; press again until play starts.
  await expect(async () => {
    const play = page.getByTestId('play-button');
    if (await play.isVisible()) await play.click({ timeout: 5_000 });
    await expect(wallet).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
}

async function fire(page: Page, evt: string, detail: Record<string, unknown>) {
  await page.evaluate(([e, d]) => window.dispatchEvent(new CustomEvent(e, { detail: d })), [evt, detail] as const);
}

// The FX layer is a lazy chunk; retry the dispatch until it is listening.
async function fireUntilBurst(page: Page, evt: string, detail: Record<string, unknown>) {
  await expect(async () => {
    await fire(page, evt, detail);
    await expect(page.getByTestId('dom-coin-burst')).toBeAttached({ timeout: 1_500 });
  }).toPass({ timeout: 20_000 });
}

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
] as const) {
  test.describe(`coin wallet in play (${name})`, () => {
    test.use({ viewport: size });

    test('one coin wallet stays on screen during play, even at 0', async ({ page }) => {
      await openBlast(page);
      const wallet = page.getByTestId('coin-counter');
      await expect(wallet).toHaveAttribute('data-coin-counter', 'true');
      await expect(page.getByTestId('coin-counter-value')).toHaveText(/\d/);
      await expect(page.getByLabel(/gems/i)).toHaveCount(0);
      const box = await wallet.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      expect(box!.height).toBeGreaterThanOrEqual(name === 'desktop' ? 44 : 34);
    });

    test('a big word throws a +N stamp and its coins fly around the praise banner', async ({ page }) => {
      await openBlast(page);
      const board = await page.locator('[data-blast-board="true"]').boundingBox();
      const source = { x: board!.x + board!.width * 0.3, y: board!.y + board!.height * 0.12 };
      await page.evaluate(() => {
        const w = window as unknown as { __bigBurst?: { coins: number; stamp: string; avoid: string | null } };
        new MutationObserver(() => {
          const b = document.querySelector('[data-testid="dom-coin-burst"]');
          if (!b || w.__bigBurst) return;
          w.__bigBurst = {
            coins: b.querySelectorAll('[data-testid="flying-coin"]').length,
            stamp: b.querySelector('[data-testid="coin-jackpot"]')?.textContent ?? '',
            avoid: b.getAttribute('data-avoid'),
          };
        }).observe(document.body, { childList: true, subtree: true });
      });
      await fireUntilBurst(page, EARN, { amount: 8, inline: true, coins: 12, big: true, source });
      const seen = await page.evaluate(() => (window as unknown as { __bigBurst?: { coins: number; stamp: string; avoid: string | null } }).__bigBurst);
      expect(seen?.coins).toBe(12);
      expect(seen?.stamp).toContain('+8');
      const avoid = seen?.avoid ?? null;
      expect(avoid).toMatch(/^-?\d+,-?\d+,-?\d+,-?\d+/);
    });

    test('a reward flies coins into the wallet and pops the reward counter', async ({ page }) => {
      await openBlast(page);
      await fireUntilBurst(page, EARN, { amount: 40 });
      await expect(page.getByTestId('flying-coin').first()).toBeAttached();
      await expect(page.getByTestId('coin-reward-hud')).toBeVisible();
      await expect(page.getByTestId('coin-hud-delta')).toContainText('40');
    });

    test('word coins fly from the board into the in-play wallet', async ({ page }) => {
      await openBlast(page);
      const board = await page.locator('[data-blast-board="true"]').boundingBox();
      expect(board).not.toBeNull();
      const source = { x: board!.x + board!.width / 2, y: board!.y + board!.height / 2 };
      await fireUntilBurst(page, EARN, { amount: 3, inline: true, coins: 5, source });
      const burst = page.getByTestId('dom-coin-burst').first();
      await expect(burst).toHaveAttribute('data-from', `${Math.round(source.x)},${Math.round(source.y)}`);
      const wallet = await page.getByTestId('coin-counter').boundingBox();
      const [tx, ty] = ((await burst.getAttribute('data-to')) ?? '0,0').split(',').map(Number);
      expect(tx).toBeGreaterThanOrEqual(wallet!.x - 1);
      expect(tx).toBeLessThanOrEqual(wallet!.x + wallet!.width + 1);
      expect(ty).toBeGreaterThanOrEqual(wallet!.y - 1);
      expect(ty).toBeLessThanOrEqual(wallet!.y + wallet!.height + 1);
    });

    test('a spend flies coins out of the wallet', async ({ page }) => {
      await openBlast(page);
      await fireUntilBurst(page, SPEND, { amount: 25, source: { x: size.width / 2, y: size.height / 2 } });
      const burst = page.getByTestId('dom-coin-burst').first();
      const wallet = await page.getByTestId('coin-counter').boundingBox();
      const [fx] = ((await burst.getAttribute('data-from')) ?? '0,0').split(',').map(Number);
      expect(fx).toBeGreaterThanOrEqual(wallet!.x - 1);
      expect(fx).toBeLessThanOrEqual(wallet!.x + wallet!.width + 1);
    });
  });
}

test.describe('coin wallet in Hebrew (RTL)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the wallet stays inside the phone viewport', async ({ page }) => {
    await openBlast(page, 'he');
    const box = await page.getByTestId('coin-counter').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
