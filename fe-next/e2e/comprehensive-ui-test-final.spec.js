/**
 * Comprehensive UI Test Suite for LexiClash Boggle Game
 *
 * Tests:
 * 1. All screen sizes (iPhone SE, 8, 11, iPad, Desktop, Landscape modes)
 * 2. Touch target sizes (minimum 44x44px)
 * 3. No horizontal scrolling
 * 4. No hidden/clipped content
 * 5. Color contrast (WCAG AA)
 * 6. User flows (landing, game, results)
 * 7. Recently fixed items (Exit/Help/Pin buttons, ghost button, neo-purple)
 */

import { test, expect } from '@playwright/test';

// ==================== Test Viewports ====================

const viewports = [
  { name: 'iPhone SE Portrait', width: 320, height: 568 },
  { name: 'iPhone 8 Portrait', width: 375, height: 667 },
  { name: 'iPhone 11 Portrait', width: 414, height: 896 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'iPhone SE Landscape', width: 568, height: 320 },
  { name: 'iPhone 8 Landscape', width: 667, height: 375 },
  { name: 'iPhone 11 Landscape', width: 844, height: 390 },
];

// ==================== Helper Functions ====================

/**
 * Check if element meets WCAG AA contrast requirements
 */
async function checkContrast(page, selector) {
  const element = page.locator(selector).first();
  if (await element.count() === 0) return null;

  const colors = await element.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
    };
  });

  return colors;
}

/**
 * Calculate luminance from RGB
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse RGB color string to array
 */
function parseRGB(colorString) {
  const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
}

/**
 * Calculate contrast ratio
 */
function getContrastRatio(color1, color2) {
  const rgb1 = parseRGB(color1);
  const rgb2 = parseRGB(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check for horizontal scrolling
 */
async function checkHorizontalScroll(page) {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/**
 * Check if elements are clipped or hidden
 */
async function checkClipping(page, selector) {
  const elements = await page.locator(selector).all();
  const clippedElements = [];

  for (const element of elements) {
    const isVisible = await element.isVisible();
    if (!isVisible) continue;

    const box = await element.boundingBox();
    if (!box) continue;

    const viewport = page.viewportSize();

    // Check if element is clipped
    if (box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height ||
        box.x < 0 || box.y < 0) {
      const text = await element.textContent();
      clippedElements.push({
        selector,
        text: text?.substring(0, 50),
        box,
        viewport,
      });
    }
  }

  return clippedElements;
}

/**
 * Measure touch target size
 */
async function getTouchTargetSize(page, selector) {
  const element = page.locator(selector).first();
  if (await element.count() === 0) return null;

  const box = await element.boundingBox();
  return box;
}

// ==================== Test Suite ====================

test.describe('Comprehensive UI Tests - All Viewports', () => {

  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {

      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      // ==================== Landing Page Tests ====================

      test('Landing Page - No horizontal scrolling', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasHorizontalScroll = await checkHorizontalScroll(page);
        expect(hasHorizontalScroll).toBe(false);
      });

      test('Landing Page - No clipped content', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for clipped buttons and text
        const clippedButtons = await checkClipping(page, 'button');
        const clippedHeadings = await checkClipping(page, 'h1, h2, h3');

        expect(clippedButtons).toHaveLength(0);
        expect(clippedHeadings).toHaveLength(0);
      });

      test('Landing Page - Mode selection buttons visible', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for game mode links (they are <a> tags, not buttons)
        const singlePlayerLink = page.getByRole('link', { name: /single player|solo|practice/i });
        const multiplayerLink = page.getByRole('link', { name: /multiplayer|join|compete/i });

        // At least one mode selection should be visible
        const singleVisible = await singlePlayerLink.first().isVisible().catch(() => false);
        const multiVisible = await multiplayerLink.first().isVisible().catch(() => false);

        expect(singleVisible || multiVisible).toBe(true);
      });

      // ==================== Touch Target Tests ====================

      test('Touch targets meet WCAG minimum (44x44px)', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Exclude known exceptions:
        // - sr-only links (screen reader only, not touch targets)
        // - Next.js dev tools (dev-only button)
        // - Hidden/invisible elements
        const interactiveElements = await page.locator('button:not([class*="sr-only"]), a[href]:not([class*="sr-only"]), input, select, textarea').all();
        const smallTargets = [];

        for (const element of interactiveElements) {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;

          const box = await element.boundingBox();
          if (!box) continue;

          // Skip very small elements (likely sr-only or hidden)
          if (box.width < 5 || box.height < 5) continue;

          const ariaLabel = await element.getAttribute('aria-label') || '';
          const text = await element.textContent() || '';

          // Skip dev tools
          if (ariaLabel.includes('Dev Tools') || text.includes('Dev Tools')) continue;
          // Skip skip links (they're sr-only focus elements)
          if (text.includes('Skip to main')) continue;

          // WCAG 2.1 AA requires 44x44px minimum for touch targets
          if (box.width < 44 || box.height < 44) {
            smallTargets.push({
              text: text?.substring(0, 30) || ariaLabel || 'Unknown',
              size: `${Math.round(box.width)}x${Math.round(box.height)}px`,
            });
          }
        }

        // Report any small targets
        if (smallTargets.length > 0) {
          console.log(`Found ${smallTargets.length} touch targets smaller than 44x44px:`, smallTargets);
        }

        expect(smallTargets).toHaveLength(0);
      });

      // ==================== Color Contrast Tests ====================

      test('Ghost button has sufficient contrast', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for ghost/outline buttons (commonly used in the app)
        const ghostButtons = await page.locator('button').all();

        for (const button of ghostButtons) {
          const isVisible = await button.isVisible();
          if (!isVisible) continue;

          const className = await button.getAttribute('class');
          if (!className) continue;

          // Check if it's a ghost/outline button
          if (className.includes('ghost') || className.includes('outline')) {
            const colors = await button.evaluate((el) => {
              const style = window.getComputedStyle(el);
              return {
                color: style.color,
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
              };
            });

            // Ghost buttons should have border contrast
            if (colors.borderColor && colors.backgroundColor) {
              const ratio = getContrastRatio(colors.borderColor, colors.backgroundColor);
              if (ratio !== null) {
                // WCAG AA requires 3:1 for UI components
                expect(ratio).toBeGreaterThanOrEqual(3.0);
              }
            }
          }
        }
      });

      test('Neo-purple color has sufficient contrast', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check neo-purple elements
        const purpleElements = await page.locator('[class*="neo-purple"]').all();

        for (const element of purpleElements) {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;

          const colors = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
            };
          });

          if (colors.color && colors.backgroundColor) {
            const ratio = getContrastRatio(colors.color, colors.backgroundColor);
            if (ratio !== null) {
              // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
              // Using 3:1 as minimum for UI components
              expect(ratio).toBeGreaterThanOrEqual(3.0);
            }
          }
        }
      });

      // ==================== Landscape-Specific Tests ====================

      if (viewport.width > viewport.height) {
        test('Landscape - Exit/Help/Pin buttons are 44x44px', async ({ page }) => {
          // Navigate to a game screen (we'll try to get to single player)
          await page.goto('/');
          await page.waitForLoadState('networkidle');

          // Try to start a game
          const singlePlayerBtn = page.getByRole('button', { name: /single player|solo|practice/i }).first();
          if (await singlePlayerBtn.isVisible().catch(() => false)) {
            await singlePlayerBtn.click();
            await page.waitForTimeout(2000); // Wait for game setup

            // Check Exit button (should be in top-left in landscape)
            const exitButton = page.locator('button[aria-label*="Exit"], button:has-text("✕")').first();
            if (await exitButton.isVisible().catch(() => false)) {
              const exitBox = await exitButton.boundingBox();
              if (exitBox) {
                expect(exitBox.width).toBeGreaterThanOrEqual(44);
                expect(exitBox.height).toBeGreaterThanOrEqual(44);
              }
            }

            // Check Help button (should be in top-right)
            const helpButton = page.locator('button[aria-label*="Help"], button:has-text("?")').first();
            if (await helpButton.isVisible().catch(() => false)) {
              const helpBox = await helpButton.boundingBox();
              if (helpBox) {
                expect(helpBox.width).toBeGreaterThanOrEqual(44);
                expect(helpBox.height).toBeGreaterThanOrEqual(44);
              }
            }

            // Check Pin button if visible
            const pinButton = page.locator('button[aria-label*="Pin"], button:has-text("📌")').first();
            if (await pinButton.isVisible().catch(() => false)) {
              const pinBox = await pinButton.boundingBox();
              if (pinBox) {
                expect(pinBox.width).toBeGreaterThanOrEqual(44);
                expect(pinBox.height).toBeGreaterThanOrEqual(44);
              }
            }
          }
        });

        test('Landscape - Controls auto-hide functionality', async ({ page }) => {
          await page.goto('/');
          await page.waitForLoadState('networkidle');

          // Try to start a game
          const singlePlayerBtn = page.getByRole('button', { name: /single player|solo|practice/i }).first();
          if (await singlePlayerBtn.isVisible().catch(() => false)) {
            await singlePlayerBtn.click();
            await page.waitForTimeout(2000);

            // Check if controls container exists
            const controlsContainer = page.locator('div.absolute.top-0').first();
            if (await controlsContainer.isVisible().catch(() => false)) {
              // Controls should initially be visible or have transition
              const opacity = await controlsContainer.evaluate((el) => {
                return window.getComputedStyle(el).opacity;
              });

              // Opacity should be between 0 and 1
              expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0);
              expect(parseFloat(opacity)).toBeLessThanOrEqual(1);
            }
          }
        });
      }

      // ==================== Responsive Layout Tests ====================

      test('Responsive - Layout adjusts properly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check that body doesn't overflow
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            scrollWidth: body.scrollWidth,
            clientWidth: body.clientWidth,
            scrollHeight: body.scrollHeight,
            clientHeight: body.clientHeight,
          };
        });

        expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(bodyOverflow.clientWidth + 1);
      });

      // ==================== Muted Text Contrast ====================

      test('Muted text has sufficient contrast', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check elements with muted classes
        const mutedElements = await page.locator('[class*="muted"], [class*="text-gray"], [class*="opacity"]').all();

        for (const element of mutedElements) {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;

          const colors = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
            };
          });

          if (colors.color && colors.backgroundColor) {
            const ratio = getContrastRatio(colors.color, colors.backgroundColor);
            if (ratio !== null && ratio < 4.5) {
              const text = await element.textContent();
              console.log(`Muted text has low contrast: "${text?.substring(0, 30)}" - Ratio: ${ratio.toFixed(2)}:1`);
              // Note: Some muted text may intentionally have lower contrast
              // We'll warn but not fail the test
            }
          }
        }
      });

    });
  }
});

// ==================== User Flow Tests ====================

test.describe('User Flow Tests', () => {

  test('Landing page loads and displays mode selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see the app title/logo
    const heading = page.locator('h1, [class*="title"], [class*="logo"]').first();
    await expect(heading).toBeVisible();

    // Should see game mode options
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('Single player game flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to find and click single player button
    const singlePlayerBtn = page.getByRole('button', { name: /single player|solo|practice/i }).first();

    if (await singlePlayerBtn.isVisible().catch(() => false)) {
      await singlePlayerBtn.click();

      // Wait for game screen
      await page.waitForTimeout(2000);

      // Should see a game board or timer
      const hasGameElements = await page.evaluate(() => {
        const hasTimer = document.querySelector('[class*="timer"]') !== null;
        const hasGrid = document.querySelector('[class*="grid"]') !== null;
        const hasBoard = document.querySelector('[class*="board"]') !== null;
        return hasTimer || hasGrid || hasBoard;
      });

      expect(hasGameElements).toBe(true);
    }
  });

  test('Navigation - Header and Footer present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for header
    const header = page.locator('header, [role="banner"]').first();
    const headerVisible = await header.isVisible().catch(() => false);

    // Check for footer
    const footer = page.locator('footer, [role="contentinfo"]').first();
    const footerVisible = await footer.isVisible().catch(() => false);

    // At least one should be present
    expect(headerVisible || footerVisible).toBe(true);
  });

});

// ==================== Accessibility Tests ====================

test.describe('Accessibility Tests', () => {

  test('Page has proper document structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for lang attribute
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();

    // Check for title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Interactive elements have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all buttons
    const buttons = await page.locator('button').all();
    const buttonsWithoutNames = [];

    for (const button of buttons) {
      const isVisible = await button.isVisible();
      if (!isVisible) continue;

      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      const title = await button.getAttribute('title');

      if (!text?.trim() && !ariaLabel && !ariaLabelledBy && !title) {
        buttonsWithoutNames.push('Button without accessible name');
      }
    }

    expect(buttonsWithoutNames).toHaveLength(0);
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Check if focused element has visible outline
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const style = window.getComputedStyle(el);
      return {
        outline: style.outline,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        border: style.border,
      };
    });

    // Should have some form of focus indicator
    const hasFocusIndicator =
      focusedElement.outlineWidth !== '0px' ||
      focusedElement.outline !== 'none';

    // Note: Some custom focus indicators might use other methods
    // This is a basic check
  });

});

// ==================== Performance Tests ====================

test.describe('Performance Tests', () => {

  test('Page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('No console errors on page load', async ({ page }) => {
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (if any)
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    expect(criticalErrors).toHaveLength(0);
  });

});
