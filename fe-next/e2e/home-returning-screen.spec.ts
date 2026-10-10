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
      expect(size.scrollHeight).toBeLessThanOrEqual(size.innerHeight + 1);
      expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth);

      await expect(page.getByTestId('home-streak-chip')).toBeVisible();
      await expect(page.getByTestId('mode-cube-anchor').first()).toBeInViewport();
      await expect(page.getByTestId('landing-cubes-more')).toBeInViewport();
    });

    test('the rest of the modes open in a sheet one tap away', async ({ page }) => {
      test.setTimeout(120_000);
      await openHome(page);
      await page.getByTestId('landing-cubes-more').click();
      const sheet = page.getByTestId('home-more-sheet');
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('[data-cube-key]').first()).toBeVisible();
    });

    test("tapping today's daily launches into the Word Wheel with the card's own art", async ({ page }) => {
      test.setTimeout(120_000);
      await openHome(page);
      const hero = page.getByTestId('home-daily-hero');
      const cardArt = await hero.locator('img').first().evaluate((img) => (img as HTMLImageElement).currentSrc);
      await hero.click();
      const curtain = page.getByTestId('home-launch');
      await expect(curtain).toBeVisible();
      await expect(curtain.locator('img')).toHaveAttribute('src', cardArt);
      await expect(page).toHaveURL(/\/en\/daily\/word-wheel/, { timeout: 60_000 });
    });
  });
}

test('fresh visitors still get the explainer with its SEO copy', async ({ page }) => {
  test.setTimeout(120_000);
  await seedDecidedVisitor(page, false);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-home', 'fresh');
  await expect(page.getByRole('link', { name: /^play now$/i }).first()).toBeVisible({ timeout: 60_000 });

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);
  expect(scrollHeight).toBeGreaterThan(innerHeight * 2);
  await expect(page.locator('h2').first()).toBeAttached();
});
