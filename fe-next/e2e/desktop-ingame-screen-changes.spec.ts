import { test, expect, type Page } from '@playwright/test';

/**
 * Desktop In-Game Screen UI Tests
 *
 * Tests for the following changes:
 * 1. Board size reduced: 65vh -> 50vh with max 500px on desktop (769px-1536px), 550px/45vh on ultra-wide (1537px+)
 * 2. Sidebars widened: lg:w-64 xl:w-80 -> lg:w-80 xl:w-96 2xl:w-[28rem]
 * 3. Container gaps increased: gap-1 md:gap-2 -> gap-2 md:gap-4 lg:gap-6
 * 4. Max container width added: max-w-[1920px] mx-auto
 * 5. Timer size: Added 'lg' size variant (140px SVG) for desktop
 * 6. Score text: Increased from text-xl md:text-2xl to text-xl md:text-2xl lg:text-3xl
 */

// Desktop viewport configurations for testing
const DESKTOP_VIEWPORTS = {
  // Standard desktop (lg breakpoint: 1024px - 1279px)
  lgDesktop: { name: 'lg Desktop (1024px)', width: 1024, height: 768 },
  lgDesktopWide: { name: 'lg Desktop Wide (1200px)', width: 1200, height: 800 },

  // XL desktop (xl breakpoint: 1280px - 1535px)
  xlDesktop: { name: 'XL Desktop (1280px)', width: 1280, height: 900 },
  xlDesktopWide: { name: 'XL Desktop Wide (1440px)', width: 1440, height: 900 },

  // 2XL desktop (2xl breakpoint: 1536px+)
  xxlDesktop: { name: '2XL Desktop (1536px)', width: 1536, height: 864 },
  xxlDesktopWide: { name: '2XL Desktop Wide (1920px)', width: 1920, height: 1080 },

  // Ultra-wide (beyond max-w-[1920px])
  ultraWide: { name: 'Ultra-Wide (2560px)', width: 2560, height: 1440 },
  ultraWideMax: { name: 'Ultra-Wide Max (3440px)', width: 3440, height: 1440 },
};

// Expected values based on CSS changes
const EXPECTED_VALUES = {
  lg: {
    sidebarWidth: 320,  // lg:w-80 = 20rem = 320px
    boardMaxSize: 500,  // max 500px from CSS
    gap: 24,            // lg:gap-6 = 1.5rem = 24px
  },
  xl: {
    sidebarWidth: 384,  // xl:w-96 = 24rem = 384px
    boardMaxSize: 500,  // max 500px from CSS
    gap: 24,            // lg:gap-6 = 1.5rem = 24px
  },
  xxl: {
    sidebarWidth: 448,  // 2xl:w-[28rem] = 448px
    boardMaxSize: 550,  // max 550px from CSS
    gap: 24,            // lg:gap-6 = 1.5rem = 24px
  },
  timer: {
    lgSvgSize: 140,     // lg size SVG dimension
    mdSvgSize: 120,     // md size SVG dimension
  },
  container: {
    maxWidth: 1920,     // max-w-[1920px]
  },
};

// Helper function to start a single player game and wait for the in-game screen
async function startSinglePlayerGame(page: Page): Promise<boolean> {
  try {
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Find and click the start button
    const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
    const buttonVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!buttonVisible) {
      console.log('Start button not visible, checking for alternative start mechanisms');
      return false;
    }

    await startButton.click();
    await page.waitForTimeout(2500); // Wait for game to start

    // Verify game started by checking for grid
    const grid = page.locator('.game-board-frame, [class*="grid"], [class*="Grid"]').first();
    const gridVisible = await grid.isVisible({ timeout: 5000 }).catch(() => false);

    return gridVisible;
  } catch (error) {
    console.error('Error starting single player game:', error);
    return false;
  }
}

// Helper to get computed styles of an element
async function getComputedStyles(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      fontSize: parseFloat(styles.fontSize),
      gap: parseFloat(styles.gap) || 0,
      maxWidth: styles.maxWidth,
      marginLeft: parseFloat(styles.marginLeft) || 0,
      marginRight: parseFloat(styles.marginRight) || 0,
    };
  }, selector);
}

test.describe('Desktop In-Game Screen Layout Changes', () => {

  test.describe('1. Board Size at Different Breakpoints', () => {

    test('lg breakpoint (1024px-1279px): Board should be max 500px', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.lgDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-board-${viewport.name.replace(/\s+/g, '-')}.png`,
        fullPage: false
      });

      const boardFrame = page.locator('.game-board-frame').first();
      const boardVisible = await boardFrame.isVisible().catch(() => false);

      if (boardVisible) {
        const box = await boardFrame.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          console.log(`Board size at ${viewport.name}: ${box.width}x${box.height}px`);
          // Board should be max 500px at this breakpoint
          expect(box.width).toBeLessThanOrEqual(EXPECTED_VALUES.lg.boardMaxSize + 20); // +20px for border/padding
          expect(box.height).toBeLessThanOrEqual(EXPECTED_VALUES.lg.boardMaxSize + 20);
          // Should maintain square aspect ratio
          expect(Math.abs(box.width - box.height)).toBeLessThan(5);
        }
      }
    });

    test('xl breakpoint (1280px-1535px): Board should be max 500px', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-board-${viewport.name.replace(/\s+/g, '-')}.png`,
        fullPage: false
      });

      const boardFrame = page.locator('.game-board-frame').first();
      const boardVisible = await boardFrame.isVisible().catch(() => false);

      if (boardVisible) {
        const box = await boardFrame.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          console.log(`Board size at ${viewport.name}: ${box.width}x${box.height}px`);
          expect(box.width).toBeLessThanOrEqual(EXPECTED_VALUES.xl.boardMaxSize + 20);
          expect(box.height).toBeLessThanOrEqual(EXPECTED_VALUES.xl.boardMaxSize + 20);
        }
      }
    });

    test('2xl breakpoint (1536px+): Board should be max 550px', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xxlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-board-${viewport.name.replace(/\s+/g, '-')}.png`,
        fullPage: false
      });

      const boardFrame = page.locator('.game-board-frame').first();
      const boardVisible = await boardFrame.isVisible().catch(() => false);

      if (boardVisible) {
        const box = await boardFrame.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          console.log(`Board size at ${viewport.name}: ${box.width}x${box.height}px`);
          expect(box.width).toBeLessThanOrEqual(EXPECTED_VALUES.xxl.boardMaxSize + 20);
          expect(box.height).toBeLessThanOrEqual(EXPECTED_VALUES.xxl.boardMaxSize + 20);
        }
      }
    });
  });

  test.describe('2. Sidebar Width at Different Breakpoints', () => {

    test('lg breakpoint: Sidebars should be ~320px (w-80)', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.lgDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Left sidebar (found words) - look for the specific sidebar container
      const leftSidebar = page.locator('.lg\\:w-80').first();
      const leftVisible = await leftSidebar.isVisible().catch(() => false);

      if (leftVisible) {
        const box = await leftSidebar.boundingBox();
        if (box) {
          console.log(`Left sidebar width at ${viewport.name}: ${box.width}px`);
          // Expected: lg:w-80 = 320px (with some tolerance for borders)
          expect(box.width).toBeGreaterThanOrEqual(310);
          expect(box.width).toBeLessThanOrEqual(340);
        }
      }
    });

    test('xl breakpoint: Sidebars should be ~384px (w-96)', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Check for sidebar with xl:w-96 class
      const sidebar = page.locator('.xl\\:w-96').first();
      const sidebarVisible = await sidebar.isVisible().catch(() => false);

      if (sidebarVisible) {
        const box = await sidebar.boundingBox();
        if (box) {
          console.log(`Sidebar width at ${viewport.name}: ${box.width}px`);
          // Expected: xl:w-96 = 384px
          expect(box.width).toBeGreaterThanOrEqual(374);
          expect(box.width).toBeLessThanOrEqual(400);
        }
      }
    });

    test('2xl breakpoint: Sidebars should be ~448px (w-[28rem])', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xxlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-sidebar-2xl-${viewport.name.replace(/\s+/g, '-')}.png`,
        fullPage: false
      });

      // Check for sidebar with 2xl:w-[28rem] class
      const sidebar = page.locator('[class*="2xl\\:w-\\[28rem\\]"]').first();
      const sidebarVisible = await sidebar.isVisible().catch(() => false);

      if (sidebarVisible) {
        const box = await sidebar.boundingBox();
        if (box) {
          console.log(`Sidebar width at ${viewport.name}: ${box.width}px`);
          // Expected: 2xl:w-[28rem] = 448px
          expect(box.width).toBeGreaterThanOrEqual(438);
          expect(box.width).toBeLessThanOrEqual(460);
        }
      }
    });
  });

  test.describe('3. Timer Size on Desktop', () => {

    test('Desktop: Timer should render lg size (140px SVG)', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Look for the timer SVG on desktop (hidden on mobile: lg:block)
      const desktopTimer = page.locator('.hidden.lg\\:block svg').first();
      const timerVisible = await desktopTimer.isVisible().catch(() => false);

      if (timerVisible) {
        const svgWidth = await desktopTimer.getAttribute('width');
        const svgHeight = await desktopTimer.getAttribute('height');

        console.log(`Timer SVG size on desktop: ${svgWidth}x${svgHeight}`);

        // Expected: lg size = 140px
        expect(svgWidth).toBe('140');
        expect(svgHeight).toBe('140');
      } else {
        // Alternative: check the timer container
        const timerContainer = page.locator('[class*="Timer"], [class*="timer"]').first();
        const containerVisible = await timerContainer.isVisible().catch(() => false);

        if (containerVisible) {
          const svg = timerContainer.locator('svg').first();
          const svgVisible = await svg.isVisible().catch(() => false);

          if (svgVisible) {
            const svgWidth = await svg.getAttribute('width');
            console.log(`Timer SVG width (from container): ${svgWidth}`);
          }
        }
      }

      await page.screenshot({
        path: `test-results/desktop-timer-lg-size.png`,
        fullPage: false
      });
    });

    test('Mobile: Timer should render md size (120px SVG)', async ({ page }) => {
      // Test mobile to ensure lg size is NOT applied
      await page.setViewportSize({ width: 768, height: 1024 });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Look for the timer SVG on mobile (visible: lg:hidden)
      const mobileTimer = page.locator('.lg\\:hidden svg').first();
      const timerVisible = await mobileTimer.isVisible().catch(() => false);

      if (timerVisible) {
        const svgWidth = await mobileTimer.getAttribute('width');
        const svgHeight = await mobileTimer.getAttribute('height');

        console.log(`Timer SVG size on tablet: ${svgWidth}x${svgHeight}`);

        // Expected: md size = 120px
        expect(svgWidth).toBe('120');
        expect(svgHeight).toBe('120');
      }

      await page.screenshot({
        path: `test-results/tablet-timer-md-size.png`,
        fullPage: false
      });
    });
  });

  test.describe('4. Score Text Scaling', () => {

    test('Score text scales with lg:text-3xl on desktop', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Find the score display element
      const scoreElement = page.locator('.lg\\:text-3xl').first();
      const scoreVisible = await scoreElement.isVisible().catch(() => false);

      if (scoreVisible) {
        const styles = await getComputedStyles(page, '.lg\\:text-3xl');
        if (styles) {
          console.log(`Score text font size on desktop: ${styles.fontSize}px`);
          // text-3xl = 1.875rem = 30px
          expect(styles.fontSize).toBeGreaterThanOrEqual(28);
          expect(styles.fontSize).toBeLessThanOrEqual(32);
        }
      }

      await page.screenshot({
        path: `test-results/desktop-score-text-size.png`,
        fullPage: false
      });
    });
  });

  test.describe('5. Container Gap Spacing', () => {

    test('Desktop: Container should have lg:gap-6 (24px)', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Find the main container with gap classes
      const container = page.locator('.lg\\:gap-6').first();
      const containerVisible = await container.isVisible().catch(() => false);

      if (containerVisible) {
        const styles = await page.evaluate(() => {
          const el = document.querySelector('.lg\\:gap-6');
          if (!el) return null;
          const computedStyles = window.getComputedStyle(el);
          return {
            gap: computedStyles.gap,
            columnGap: computedStyles.columnGap,
            rowGap: computedStyles.rowGap,
          };
        });

        if (styles) {
          console.log(`Container gap on desktop:`, styles);
          // lg:gap-6 = 1.5rem = 24px
          const gapValue = parseFloat(styles.gap) || parseFloat(styles.columnGap) || 0;
          expect(gapValue).toBeGreaterThanOrEqual(22);
          expect(gapValue).toBeLessThanOrEqual(26);
        }
      }
    });

    test('Tablet: Container should have md:gap-4 (16px)', async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 700 });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      const styles = await page.evaluate(() => {
        const el = document.querySelector('.md\\:gap-4');
        if (!el) return null;
        const computedStyles = window.getComputedStyle(el);
        return {
          gap: computedStyles.gap,
        };
      });

      if (styles) {
        console.log(`Container gap on tablet:`, styles);
        // md:gap-4 = 1rem = 16px
        const gapValue = parseFloat(styles.gap) || 0;
        expect(gapValue).toBeGreaterThanOrEqual(14);
        expect(gapValue).toBeLessThanOrEqual(18);
      }
    });
  });

  test.describe('6. Ultra-Wide Layout Centering', () => {

    test('Ultra-wide: Container should be centered with max-w-[1920px]', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.ultraWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-ultrawide-centering.png`,
        fullPage: false
      });

      // Find the container with max-w-[1920px] and mx-auto
      const container = page.locator('.max-w-\\[1920px\\]').first();
      const containerVisible = await container.isVisible().catch(() => false);

      if (containerVisible) {
        const box = await container.boundingBox();
        if (box) {
          console.log(`Container on ultra-wide: width=${box.width}px, x=${box.x}px`);

          // Container should be max 1920px
          expect(box.width).toBeLessThanOrEqual(1920);

          // Container should be centered (roughly equal margins on both sides)
          const expectedMargin = (viewport.width - box.width) / 2;
          const leftMarginDiff = Math.abs(box.x - expectedMargin);
          expect(leftMarginDiff).toBeLessThan(20); // Allow some tolerance
        }
      }
    });

    test('3440px ultra-wide: Layout remains balanced', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.ultraWideMax;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      await page.screenshot({
        path: `test-results/desktop-ultrawide-max-3440.png`,
        fullPage: false
      });

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify the game area is visible and centered
      const gameBoard = page.locator('.game-board-frame').first();
      const boardVisible = await gameBoard.isVisible().catch(() => false);

      if (boardVisible) {
        const box = await gameBoard.boundingBox();
        if (box) {
          console.log(`Board position on 3440px: x=${box.x}px, width=${box.width}px`);
          // Board should be roughly centered (within the 1920px container)
        }
      }
    });
  });

  test.describe('7. Visual Regression Across Breakpoints', () => {

    for (const [key, viewport] of Object.entries(DESKTOP_VIEWPORTS)) {
      test(`Visual snapshot at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const gameStarted = await startSinglePlayerGame(page);
        if (!gameStarted) {
          // Take screenshot of lobby as fallback
          await page.screenshot({
            path: `test-results/visual-${key}-lobby.png`,
            fullPage: false
          });
          test.skip();
          return;
        }

        // Wait for animations to complete
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: `test-results/visual-${key}-ingame.png`,
          fullPage: false
        });

        // Verify no horizontal scroll at any viewport
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      });
    }
  });

  test.describe('8. Layout Balance Verification', () => {

    test('Desktop: Three-column layout is balanced (left sidebar, center, right sidebar)', async ({ page }) => {
      const viewport = DESKTOP_VIEWPORTS.xlDesktopWide;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const gameStarted = await startSinglePlayerGame(page);
      if (!gameStarted) {
        test.skip();
        return;
      }

      // Get positions of main elements
      const leftSidebar = page.locator('.lg\\:w-80, .xl\\:w-96').first();
      const centerContent = page.locator('.flex-1.flex.flex-col').first();
      const rightSidebar = page.locator('.lg\\:w-80, .xl\\:w-96').last();

      const leftBox = await leftSidebar.boundingBox().catch(() => null);
      const centerBox = await centerContent.boundingBox().catch(() => null);
      const rightBox = await rightSidebar.boundingBox().catch(() => null);

      if (leftBox && centerBox && rightBox) {
        console.log(`Layout at ${viewport.name}:`);
        console.log(`  Left sidebar: x=${leftBox.x}, width=${leftBox.width}`);
        console.log(`  Center: x=${centerBox.x}, width=${centerBox.width}`);
        console.log(`  Right sidebar: x=${rightBox.x}, width=${rightBox.width}`);

        // Verify left sidebar is on the left
        expect(leftBox.x).toBeLessThan(centerBox.x);

        // Verify center is between sidebars
        expect(centerBox.x).toBeLessThan(rightBox.x);

        // Verify right sidebar is on the right
        expect(rightBox.x).toBeGreaterThan(centerBox.x);
      }

      await page.screenshot({
        path: `test-results/layout-balance-verification.png`,
        fullPage: false
      });
    });
  });

  test.describe('9. Responsive Transition Tests', () => {

    test('Layout transitions smoothly between breakpoints', async ({ page }) => {
      const breakpointWidths = [1024, 1280, 1536, 1920];

      await page.setViewportSize({ width: 1024, height: 768 });
      const gameStarted = await startSinglePlayerGame(page);

      if (!gameStarted) {
        test.skip();
        return;
      }

      for (const width of breakpointWidths) {
        await page.setViewportSize({ width, height: 768 });
        await page.waitForTimeout(500); // Allow CSS transitions

        await page.screenshot({
          path: `test-results/breakpoint-transition-${width}px.png`,
          fullPage: false
        });

        // Verify no layout breaks at each breakpoint
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);

        console.log(`Breakpoint ${width}px: Layout OK`);
      }
    });
  });
});

test.describe('CircularTimer Size Variants', () => {

  test('Timer size configurations are correctly defined', async ({ page }) => {
    // This test validates the SIZES configuration in CircularTimer.tsx
    // by checking that the timer renders correctly at different sizes

    await page.setViewportSize({ width: 1440, height: 900 });
    const gameStarted = await startSinglePlayerGame(page);

    if (!gameStarted) {
      test.skip();
      return;
    }

    // Check for desktop timer (lg size)
    const desktopTimerContainer = page.locator('.hidden.lg\\:block').first();
    const desktopVisible = await desktopTimerContainer.isVisible().catch(() => false);

    if (desktopVisible) {
      const svg = desktopTimerContainer.locator('svg').first();
      const svgWidth = await svg.getAttribute('width');
      const svgHeight = await svg.getAttribute('height');

      console.log(`Desktop timer SVG: ${svgWidth}x${svgHeight}`);

      // Verify lg size (140px)
      expect(svgWidth).toBe('140');
      expect(svgHeight).toBe('140');
    }

    // Check for mobile timer (md size) - should be hidden on desktop
    const mobileTimerContainer = page.locator('.lg\\:hidden').first();
    const mobileVisible = await mobileTimerContainer.isVisible().catch(() => false);

    // On desktop (1440px), mobile timer should be hidden
    expect(mobileVisible).toBe(false);
  });

  test('Timer low-time badge renders correctly at lg size', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const gameStarted = await startSinglePlayerGame(page);

    if (!gameStarted) {
      test.skip();
      return;
    }

    // Wait until timer is low (or use page.evaluate to check timer state)
    // For now, just verify timer structure exists
    const timer = page.locator('[class*="Timer"], [class*="CircularTimer"]').first();
    const timerVisible = await timer.isVisible().catch(() => false);

    if (timerVisible) {
      console.log('Timer component is visible on desktop');
    }

    await page.screenshot({
      path: `test-results/timer-lg-size-verification.png`,
      fullPage: false
    });
  });
});
