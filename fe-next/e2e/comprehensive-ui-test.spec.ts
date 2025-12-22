import { test, expect, type Page } from '@playwright/test';

/**
 * Comprehensive UI Testing Suite for Boggle Game
 * Tests screen sizes, landscape mode, element visibility, touch targets,
 * scrolling, contrast, focus states, loading states, and edge cases
 */

// Test configurations for different screen sizes
const SCREEN_SIZES = {
  mobile: [
    { name: 'iPhone SE', width: 320, height: 568 },
    { name: 'iPhone 12', width: 375, height: 667 },
    { name: 'iPhone 12 Pro Max', width: 414, height: 896 },
  ],
  tablet: [
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
  ],
  desktop: [
    { name: 'Desktop HD', width: 1280, height: 720 },
    { name: 'Desktop Full HD', width: 1920, height: 1080 },
  ],
};

// Flatten all screen sizes for testing
const ALL_SCREEN_SIZES = [
  ...SCREEN_SIZES.mobile,
  ...SCREEN_SIZES.tablet,
  ...SCREEN_SIZES.desktop,
];

// Minimum touch target size per WCAG
const MIN_TOUCH_TARGET_SIZE = 44;

// Helper function to check if element is visible in viewport
async function isElementInViewport(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

// Helper function to check element dimensions
async function getElementDimensions(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    };
  }, selector);
}

// Helper function to check for element overflow
async function checkForOverflow(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    return {
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      hasHorizontalOverflow: element.scrollWidth > element.clientWidth,
      hasVerticalOverflow: element.scrollHeight > element.clientHeight,
    };
  }, selector);
}

// Helper function to check contrast ratio
async function getContrastRatio(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;

    const style = window.getComputedStyle(element);
    const color = style.color;
    const backgroundColor = style.backgroundColor;

    return { color, backgroundColor };
  }, selector);
}

test.describe('Comprehensive UI Testing', () => {

  test.describe('1. Landing Page - Portrait Mode', () => {
    for (const size of ALL_SCREEN_SIZES) {
      test(`Landing page at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: size.width, height: size.height });

        // Navigate to landing page
        await page.goto('/en');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Take screenshot
        await page.screenshot({
          path: `test-results/landing-${size.name}-${size.width}x${size.height}.png`,
          fullPage: true
        });

        // Check header is visible
        const header = page.locator('header').first();
        await expect(header).toBeVisible();

        // Check mode cards are visible
        const modeCards = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
        await expect(modeCards.first()).toBeVisible();

        // Check "How to Play" button
        const howToPlay = page.locator('a[href*="rules"]');
        await expect(howToPlay.first()).toBeVisible();

        // Check for horizontal overflow
        const bodyOverflow = await checkForOverflow(page, 'body');
        if (bodyOverflow?.hasHorizontalOverflow) {
          console.warn(`⚠️  Horizontal overflow detected at ${size.name}`);
        }

        // Check title text is not cut off
        const title = page.locator('h1').first();
        if (await title.count() > 0) {
          const titleDims = await getElementDimensions(page, 'h1');
          if (titleDims && titleDims.right > size.width) {
            console.error(`❌ Title extends beyond viewport at ${size.name}`);
          }
        }
      });
    }
  });

  test.describe('2. Landing Page - Landscape Mode (CRITICAL)', () => {
    for (const size of ALL_SCREEN_SIZES) {
      test(`Landing page LANDSCAPE at ${size.name} (${size.height}x${size.width})`, async ({ page }) => {
        // Set viewport to landscape (swap width/height)
        await page.setViewportSize({ width: size.height, height: size.width });

        // Navigate to landing page
        await page.goto('/en');
        await page.waitForLoadState('networkidle');

        // Take screenshot
        await page.screenshot({
          path: `test-results/landing-landscape-${size.name}-${size.height}x${size.width}.png`,
          fullPage: true
        });

        // Check if landscape layout is activated
        const landscapeContainer = page.locator('main[role="main"]');
        const isLandscape = await landscapeContainer.count() > 0;

        if (isLandscape) {
          console.log(`✓ Landscape mode detected at ${size.name}`);

          // Check mode cards are side-by-side
          const cards = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
          await expect(cards.first()).toBeVisible();

          // Check how to play button in corner
          const howToPlay = page.locator('a[href*="rules"]');
          await expect(howToPlay.first()).toBeVisible();
        }

        // Check for any elements cut off at bottom or sides
        const allLinks = await page.locator('a').all();
        for (const link of allLinks) {
          const isVisible = await link.isVisible();
          if (isVisible) {
            const box = await link.boundingBox();
            if (box) {
              if (box.y + box.height > size.width) {
                console.warn(`⚠️  Link extends below viewport in landscape: ${await link.textContent()}`);
              }
              if (box.x + box.width > size.height) {
                console.warn(`⚠️  Link extends beyond right edge in landscape: ${await link.textContent()}`);
              }
            }
          }
        }
      });
    }
  });

  test.describe('3. Touch Target Size Validation', () => {
    test('Landing page - Check all interactive elements meet 44x44px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      const issues: string[] = [];

      // Check all buttons
      const buttons = await page.locator('button, a[href]').all();

      for (const button of buttons) {
        const isVisible = await button.isVisible();
        if (!isVisible) continue;

        const box = await button.boundingBox();
        if (!box) continue;

        const text = (await button.textContent())?.trim() || 'Unknown';

        if (box.width < MIN_TOUCH_TARGET_SIZE || box.height < MIN_TOUCH_TARGET_SIZE) {
          issues.push(
            `Touch target too small: "${text}" - ${Math.round(box.width)}x${Math.round(box.height)}px`
          );
        }
      }

      if (issues.length > 0) {
        console.error('❌ Touch target size violations:');
        issues.forEach(issue => console.error(`   ${issue}`));
      }

      // Take screenshot with annotations
      await page.screenshot({
        path: 'test-results/touch-targets-landing.png',
        fullPage: true
      });

      expect(issues.length).toBe(0);
    });
  });

  test.describe('4. Scrolling and Overflow Issues', () => {
    test('Check for unexpected scroll on landing page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        console.error(`❌ Horizontal scroll detected: ${scrollWidth}px content in ${clientWidth}px viewport`);
      }

      expect(hasHorizontalScroll).toBe(false);
    });

    test('Check content overflow in landscape', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 }); // Landscape
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Check main container
      const mainOverflow = await checkForOverflow(page, 'main');

      if (mainOverflow?.hasHorizontalOverflow) {
        console.error('❌ Main container has horizontal overflow in landscape');
      }
      if (mainOverflow?.hasVerticalOverflow) {
        console.warn('⚠️  Main container has vertical overflow in landscape');
      }

      await page.screenshot({
        path: 'test-results/overflow-landscape.png',
        fullPage: true
      });
    });
  });

  test.describe('5. Focus States and Keyboard Navigation', () => {
    test('Tab navigation through landing page', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      const focusableElements: string[] = [];

      // Tab through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            text: el?.textContent?.trim().substring(0, 30),
            hasOutline: window.getComputedStyle(el as Element).outline !== 'none',
          };
        });

        focusableElements.push(
          `${focusedElement.tag}: ${focusedElement.text} (outline: ${focusedElement.hasOutline})`
        );

        // Take screenshot of focused state
        await page.screenshot({
          path: `test-results/focus-state-${i}.png`
        });
      }

      console.log('Focus order:', focusableElements);
    });
  });

  test.describe('6. Element Visibility - No Partially Hidden Elements', () => {
    test('Check all visible elements are fully in viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      const issues: string[] = [];

      // Get all visible elements
      const allElements = await page.locator('body *').all();

      for (const element of allElements) {
        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        const box = await element.boundingBox();
        if (!box) continue;

        // Check if partially cut off
        if (box.y < 0 || box.x < 0 || box.y + box.height > 667 || box.x + box.width > 375) {
          const tag = await element.evaluate(el => el.tagName);
          const text = (await element.textContent())?.trim().substring(0, 30) || '';

          issues.push(`${tag}: ${text} - Position: ${Math.round(box.x)},${Math.round(box.y)}`);
        }
      }

      if (issues.length > 0) {
        console.warn('⚠️  Elements partially outside viewport:');
        issues.slice(0, 10).forEach(issue => console.warn(`   ${issue}`));
      }
    });
  });

  test.describe('7. Landscape Mode - InGameScreen (Critical)', () => {
    test('InGameScreen in landscape - Elements positioning', async ({ page }) => {
      // Set to landscape mobile size
      await page.setViewportSize({ width: 667, height: 375 });

      // Navigate to single player (easier to test without multiplayer setup)
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: 'test-results/ingame-landscape-initial.png',
        fullPage: true
      });

      // Wait a bit for any animations
      await page.waitForTimeout(2000);

      // Check if landscape layout is active
      const landscapeContainer = page.locator('.landscape-full-height');
      const hasLandscapeLayout = await landscapeContainer.count() > 0;

      console.log(`Landscape layout active: ${hasLandscapeLayout}`);

      if (hasLandscapeLayout) {
        // Check timer is visible on left
        const timer = page.locator('[class*="CircularTimer"]').first();
        if (await timer.count() > 0) {
          const timerBox = await timer.boundingBox();
          console.log(`Timer position: ${timerBox?.x}, ${timerBox?.y}`);
        }

        // Check score is visible on right
        const scoreElements = page.locator('text=/score/i').first();
        if (await scoreElements.count() > 0) {
          const scoreBox = await scoreElements.boundingBox();
          console.log(`Score position: ${scoreBox?.x}, ${scoreBox?.y}`);
        }

        // Check grid is centered
        const grid = page.locator('[class*="grid"]').first();
        if (await grid.count() > 0) {
          const gridBox = await grid.boundingBox();
          console.log(`Grid position: ${gridBox?.x}, ${gridBox?.y}, size: ${gridBox?.width}x${gridBox?.height}`);
        }

        // Take final screenshot
        await page.screenshot({
          path: 'test-results/ingame-landscape-final.png',
          fullPage: true
        });
      }
    });

    test('InGameScreen landscape - Auto-hide controls', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');

      // Wait for initial render
      await page.waitForTimeout(1000);

      // Check if exit button is visible initially
      const exitButton = page.locator('button:has-text("Exit"), button[aria-label*="Exit"]').first();
      const initiallyVisible = await exitButton.isVisible().catch(() => false);

      console.log(`Exit button initially visible: ${initiallyVisible}`);

      // Move mouse to trigger show
      await page.mouse.move(100, 100);
      await page.waitForTimeout(500);

      const visibleAfterMove = await exitButton.isVisible().catch(() => false);
      console.log(`Exit button visible after mouse move: ${visibleAfterMove}`);

      await page.screenshot({
        path: 'test-results/ingame-landscape-controls-visible.png'
      });

      // Wait for auto-hide
      await page.waitForTimeout(4000);

      const visibleAfterTimeout = await exitButton.isVisible().catch(() => false);
      console.log(`Exit button visible after timeout: ${visibleAfterTimeout}`);

      await page.screenshot({
        path: 'test-results/ingame-landscape-controls-hidden.png'
      });
    });
  });

  test.describe('8. AutoHideHeader Behavior', () => {
    test('Header auto-hide in landscape mode', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Take initial screenshot
      await page.screenshot({
        path: 'test-results/header-landscape-initial.png'
      });

      // Move mouse to show header
      await page.mouse.move(100, 50);
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/header-landscape-shown.png'
      });

      // Wait for auto-hide
      await page.waitForTimeout(4000);

      await page.screenshot({
        path: 'test-results/header-landscape-hidden.png'
      });
    });

    test('Header pin functionality', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Show header
      await page.mouse.move(100, 50);
      await page.waitForTimeout(500);

      // Press Ctrl+H to pin
      await page.keyboard.press('Control+h');
      await page.waitForTimeout(500);

      // Check for pin indicator
      const pinIndicator = page.locator('[aria-label*="Unpin"], button:has-text("📌")');
      const isPinned = await pinIndicator.isVisible().catch(() => false);

      console.log(`Header pinned: ${isPinned}`);

      await page.screenshot({
        path: 'test-results/header-pinned.png'
      });

      // Wait to ensure it doesn't auto-hide
      await page.waitForTimeout(4000);

      await page.screenshot({
        path: 'test-results/header-pinned-after-timeout.png'
      });
    });
  });

  test.describe('9. Loading States', () => {
    test('Check loading indicators', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate and capture loading state
      const responsePromise = page.goto('/en/singleplayer');

      // Try to capture loading state
      await page.waitForTimeout(100);
      await page.screenshot({
        path: 'test-results/loading-state.png'
      });

      await responsePromise;
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/loaded-state.png'
      });
    });
  });

  test.describe('10. Edge Cases', () => {
    test('Long text handling in mode cards', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // Smallest mobile
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Check if any text overflows its container
      const textOverflow = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const issues: string[] = [];

        elements.forEach(el => {
          if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
            const text = el.textContent?.trim().substring(0, 30);
            issues.push(`${el.tagName}: ${text}`);
          }
        });

        return issues;
      });

      if (textOverflow.length > 0) {
        console.warn('⚠️  Text overflow detected:');
        textOverflow.slice(0, 5).forEach(issue => console.warn(`   ${issue}`));
      }

      await page.screenshot({
        path: 'test-results/long-text-mobile.png',
        fullPage: true
      });
    });

    test('Tablet breakpoint transitions', async ({ page }) => {
      // Test the transition at tablet breakpoint
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'test-results/tablet-portrait.png',
        fullPage: true
      });

      // Rotate to landscape
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: 'test-results/tablet-landscape.png',
        fullPage: true
      });
    });
  });

  test.describe('11. RTL Support (Hebrew)', () => {
    test('Hebrew language RTL layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/he'); // Hebrew locale
      await page.waitForLoadState('networkidle');

      // Check if RTL is applied
      const dir = await page.evaluate(() => document.documentElement.dir);
      console.log(`Document direction: ${dir}`);

      await page.screenshot({
        path: 'test-results/rtl-hebrew.png',
        fullPage: true
      });

      expect(dir).toBe('rtl');
    });
  });

  test.describe('12. Multiple Viewport Transitions', () => {
    test('Responsive behavior during viewport changes', async ({ page }) => {
      await page.goto('/en');

      const sizes = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1280, height: 720 },
        { width: 414, height: 896 },
        { width: 1024, height: 768 },
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `test-results/transition-${size.width}x${size.height}.png`
        });

        // Check for layout issues
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalScroll) {
          console.warn(`⚠️  Horizontal scroll at ${size.width}x${size.height}`);
        }
      }
    });
  });
});
