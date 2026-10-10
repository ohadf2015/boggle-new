import { test, expect, type Page } from '@playwright/test';
import { goto } from './helpers/test-utils';

const ONBOARDED_KEY = 'lexiclash_onboarding_completed';

// The consent sheet reserves bottom space while it is up; the screen is judged without it.
async function dismissCookieSheet(page: Page) {
  const decide = page.getByRole('button', { name: /decline all|accept all/i }).first();
  if (await decide.isVisible({ timeout: 5000 }).catch(() => false)) {
    await decide.click();
    await expect(page.locator('html')).not.toHaveClass(/has-cookie-consent/);
  }
}

const VIEWPORTS = [
  { name: 'phone 390x844', width: 390, height: 844 },
  { name: 'desktop 1440x900', width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`returning home on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((key) => localStorage.setItem(key, 'true'), ONBOARDED_KEY);
    });

    test('fits one screen with the top bar, daily hero and modes visible', async ({ page }) => {
      test.setTimeout(120_000);
      await goto(page, '/');
      await page.waitForLoadState('load');
      await expect(page.locator('html')).toHaveAttribute('data-home', 'returning');
      await expect(page.getByTestId('home-daily-hero').first()).toBeVisible({ timeout: 60_000 });
      await dismissCookieSheet(page);

      const size = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(size.scrollHeight).toBeLessThanOrEqual(size.innerHeight);
      expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth);

      await expect(page.getByTestId('mode-cube-anchor').first()).toBeVisible();
      await expect(page.getByTestId('landing-cubes-more')).toBeVisible();
    });
  });
}

test('fresh visitors still get the explainer with its SEO copy', async ({ page }) => {
  test.setTimeout(120_000);
  await goto(page, '/');
  await page.waitForLoadState('load');
  await expect(page.locator('html')).toHaveAttribute('data-home', 'fresh');
  await expect(page.getByRole('link', { name: /^play now$/i }).first()).toBeVisible({ timeout: 60_000 });

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => window.innerHeight);
  expect(scrollHeight).toBeGreaterThan(innerHeight * 2);
  await expect(page.locator('h2').first()).toBeAttached();
});
