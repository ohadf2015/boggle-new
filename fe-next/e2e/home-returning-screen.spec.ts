import { test, expect, type Page } from '@playwright/test';

const ONBOARDED_KEY = 'lexiclash_onboarding_completed';

const VIEWPORTS = [
  { name: 'phone 390x844', width: 390, height: 844, tabBar: true },
  { name: 'desktop 1440x900', width: 1440, height: 900, tabBar: false },
];

// The consent sheet mounts late and reserves bottom space; a decided visitor never sees it.
async function seedDecidedVisitor(page: Page, onboarded: boolean) {
  await page.addInitScript(
    ({ key, onboarded }) => {
      localStorage.setItem('cookie-consent-v2', JSON.stringify({ essential: true, analytics: false, advertising: false, timestamp: Date.now() }));
      if (onboarded) localStorage.setItem(key, 'true');
    },
    { key: ONBOARDED_KEY, onboarded },
  );
}

async function openHome(page: Page) {
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('daily-cta')).toBeVisible({ timeout: 60_000 });
}

for (const vp of VIEWPORTS) {
  test.describe(`returning home on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await seedDecidedVisitor(page, true);
    });

    test('fits one screen with the top bar, daily hero and modes visible', async ({ page }) => {
      test.setTimeout(120_000);
      await openHome(page);
      await expect(page.locator('html')).toHaveAttribute('data-home', 'returning');
      if (vp.tabBar) {
        await expect(page.locator('html')).toHaveClass(/has-global-bottom-nav/, { timeout: 30_000 });
      }

      const size = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      // The page scrolls now (groups below the daily), but never sideways.
      expect(size.scrollHeight).toBeGreaterThan(size.innerHeight);
      expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth);

      await expect(page.getByTestId('home-streak-chip')).toBeVisible();
      await expect(page.getByTestId('mode-cube-anchor').first()).toBeInViewport();
      await expect(page.getByTestId('landing-cubes-more')).toHaveCount(0);
      await expect(page.locator('[data-install-pill]')).toBeHidden();
    });

    test('every mode is on the page in titled groups, no sheet to open', async ({ page }) => {
      test.setTimeout(120_000);
      await openHome(page);
      await expect(page.getByTestId('home-more-sheet')).toHaveCount(0);
      for (const group of ['together', 'solo', 'think']) {
        await expect(page.getByTestId(`home-group-${group}`)).toHaveCount(1);
      }
      await page.getByTestId('home-group-think').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('home-group-think').locator('[data-cube-key]').first()).toBeVisible();
    });

    test("tapping today's daily launches into the Word Wheel with the card's own art", async ({ page }) => {
      test.setTimeout(120_000);
      await openHome(page);
      const hero = page.getByTestId('home-daily-hero');
      const heroImg = hero.locator('img').first();
      await expect
        .poll(() => heroImg.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0), { timeout: 60_000 })
        .toBe(true);
      const cardArt = await heroImg.evaluate((img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src);
      expect(cardArt).not.toBe('');
      await hero.click();
      const curtain = page.getByTestId('home-launch');
      await expect(curtain).toBeVisible();
      await expect(curtain.locator('img')).toHaveAttribute('src', cardArt);
      await expect(page).toHaveURL(/\/en\/daily\/word-wheel/, { timeout: 60_000 });
      await expect(curtain).toBeHidden({ timeout: 30_000 });
      await expect(page.locator('#main-content')).toBeVisible();
    });
  });
}

test('fresh visitors still get the explainer with its SEO copy', async ({ page }) => {
  test.setTimeout(120_000);
  await seedDecidedVisitor(page, false);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-home', 'fresh');
  await expect(page.getByRole('link', { name: /^play now$/i }).first()).toBeVisible({ timeout: 60_000 });

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight), { timeout: 60_000 })
    .toBeGreaterThan(2);
  await expect(page.locator('h2').first()).toBeAttached();
});

test('fresh hero: a traced word cheers on release, then PLAY NOW opens on the launch curtain', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedDecidedVisitor(page, false);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  const grid = page.locator('[data-hero-grid]');
  await expect(grid).toBeVisible({ timeout: 60_000 });

  await page.waitForFunction(
    () => Object.keys(document.querySelector('[data-hero-grid]') ?? {}).some((k) => k.startsWith('__react')),
    undefined,
    { timeout: 60_000 },
  );
  const centre = async (cell: string) => {
    const tile = page.locator(`button[data-cell="${cell}"]`);
    await tile.waitFor({ state: 'visible', timeout: 30_000 });
    const box = await tile.boundingBox();
    if (!box) throw new Error(`no tile ${cell}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const path = [await centre('0-0'), await centre('0-1'), await centre('1-1')];
  await page.mouse.move(path[0].x, path[0].y);
  await page.mouse.down();
  for (const p of path.slice(1)) await page.mouse.move(p.x, p.y, { steps: 4 });
  await expect(grid).toHaveAttribute('data-state', 'play');
  await page.mouse.up();
  await expect(grid).toHaveAttribute('data-state', 'found');
  await expect(page.locator('[data-hero-spark]').first()).toBeAttached();

  await page.getByRole('link', { name: /^play now$/i }).first().click();
  const cover = page.getByTestId('home-quickplay-cover');
  await expect(cover).toBeVisible({ timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/en\/?$/, { timeout: 60_000 });
  await expect(cover).toBeHidden({ timeout: 30_000 });
});
