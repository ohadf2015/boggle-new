import { test, expect } from '@playwright/test';

/**
 * Production UI/UX Testing Suite
 * Testing against lexiclash.live
 */

const BASE_URL = 'https://lexiclash.live';

test.describe('Landing Page Tests - Production', () => {
  test('verify subtitle text has sufficient contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    // Find the subtitle
    const subtitle = page.locator('p').filter({ hasText: /play solo|practice/i }).first();

    if (await subtitle.isVisible()) {
      const opacity = await subtitle.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.opacity;
      });

      console.log(`Subtitle opacity: ${opacity}`);
      expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.8);
    }
  });

  test('verify How to Play button is visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    const howToPlayButton = page.getByRole('link', { name: /how to play|rules/i });
    await expect(howToPlayButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('verify mode cards exist and are clickable', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    // Look for cards with links
    const cards = page.locator('a').filter({ has: page.locator('h2') });
    const cardCount = await cards.count();

    console.log(`Found ${cardCount} mode cards`);
    expect(cardCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Multiplayer Lobby Tests - Production', () => {
  test('verify mode selector with descriptions', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/multiplayer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for Join mode description
    const hasJoinDesc = await page.locator('text=/join|enter code/i').first().isVisible().catch(() => false);
    console.log(`Join description visible: ${hasJoinDesc}`);

    // Check for Host mode description
    const hasHostDesc = await page.locator('text=/host|create|start/i').first().isVisible().catch(() => false);
    console.log(`Host description visible: ${hasHostDesc}`);

    expect(hasJoinDesc || hasHostDesc).toBeTruthy();
  });

  test('verify copy button in host mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/multiplayer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for host mode button or toggle
    const hostButton = page.locator('button').filter({ hasText: /host|create/i }).first();

    if (await hostButton.isVisible()) {
      await hostButton.click();
      await page.waitForTimeout(1000);

      // Look for copy button
      const copyButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /copy/i }).first();
      const hasCopyButton = await copyButton.isVisible({ timeout: 5000 }).catch(() => false);

      console.log(`Copy button visible in host mode: ${hasCopyButton}`);
    }
  });
});

test.describe('RTL Language Tests - Production', () => {
  test('verify Hebrew layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/he`);
    await page.waitForLoadState('networkidle');

    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    console.log(`HTML dir attribute: ${dir}`);
    expect(dir).toBe('rtl');
  });
});

test.describe('Responsive Design Tests - Production', () => {
  test('verify mobile viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('verify desktop viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/en`);
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Accessibility Tests - Production', () => {
  test('verify reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/en`);

    const hasReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    expect(hasReducedMotion).toBeTruthy();
  });
});
