import { test, expect } from '@playwright/test';

/**
 * Join and the student home must fit a 390x844 phone with no vertical scroll.
 * jsdom cannot measure layout, so this asserts it in a real browser.
 */
test.use({ viewport: { width: 390, height: 844 } });

for (const path of ['/en/join', '/en/student']) {
  test(`${path} fits 390x844 without vertical scroll`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await page.locator('main, [role="main"], body').first().waitFor();
    await page.waitForTimeout(1000);

    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    }));

    expect(metrics.scrollHeight, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.scrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.innerWidth);
  });
}
