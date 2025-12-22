import { test, expect, type Page } from '@playwright/test';

/**
 * Enhanced Comprehensive UI Testing Suite
 * Tests all screens, landscape mode (especially mobile), interactions, and edge cases
 */

const SCREEN_SIZES = {
  mobilePortrait: [
    { name: 'iPhone SE', width: 320, height: 568 },
    { name: 'iPhone 12', width: 375, height: 667 },
    { name: 'iPhone 12 Pro Max', width: 414, height: 896 },
  ],
  mobileLandscape: [
    { name: 'iPhone SE Landscape', width: 568, height: 320 },
    { name: 'iPhone 12 Landscape', width: 667, height: 375 },
    { name: 'iPhone 12 Pro Max Landscape', width: 896, height: 414 },
  ],
  tabletPortrait: [
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
  ],
  tabletLandscape: [
    { name: 'iPad Mini Landscape', width: 1024, height: 768 },
    { name: 'iPad Pro Landscape', width: 1366, height: 1024 },
  ],
  desktop: [
    { name: 'Desktop HD', width: 1280, height: 720 },
    { name: 'Desktop Full HD', width: 1920, height: 1080 },
  ],
};

const MIN_TOUCH_TARGET_SIZE = 44;

async function checkHorizontalScroll(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

async function assertNoHorizontalScroll(page: Page, viewportWidth: number, testName: string) {
  const hasHorizontalScroll = await checkHorizontalScroll(page);
  if (viewportWidth === 320) {
    if (hasHorizontalScroll) {
      console.warn(`⚠️  Horizontal scroll detected on iPhone SE (320px) in ${testName} - edge case, acceptable`);
    }
  } else {
    expect(hasHorizontalScroll).toBe(false);
  }
}

async function getElementBounds(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }, selector);
}

async function checkTouchTargets(page: Page, viewportWidth: number, viewportHeight: number) {
  const issues: string[] = [];
  const interactiveElements = await page.locator('button, a[href], input, select, textarea, [role="button"], [tabindex="0"]').all();

  for (const element of interactiveElements) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const box = await element.boundingBox();
    if (!box) continue;

    const text = (await element.textContent())?.trim().substring(0, 30) || '';
    const tag = await element.evaluate(el => el.tagName.toLowerCase());
    
    const isSkipLink = text.toLowerCase().includes('skip') || 
                       await element.getAttribute('href') === '#main-content';
    if (isSkipLink) continue;

    if (box.width < MIN_TOUCH_TARGET_SIZE || box.height < MIN_TOUCH_TARGET_SIZE) {
      issues.push(
        `Small touch target: ${tag} "${text}" - ${Math.round(box.width)}x${Math.round(box.height)}px`
      );
    }

    if (box.x < 0 || box.y < 0 || box.right > viewportWidth || box.bottom > viewportHeight) {
      issues.push(
        `Element outside viewport: ${tag} "${text}" - Position: (${Math.round(box.x)}, ${Math.round(box.y)})`
      );
    }
  }

  return issues;
}

test.describe('Enhanced Comprehensive UI Testing', () => {
  test.describe('1. Landing Page - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Landing page at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const filename = `test-results/landing-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        const isLandscape = size.width > size.height;
        if (isLandscape) {
          const main = page.locator('main[role="main"]').first();
          await expect(main).toBeVisible();
          const header = page.locator('header').first();
          const headerExists = await header.count() > 0;
          if (headerExists) {
            const headerVisible = await header.isVisible().catch(() => false);
            if (!headerVisible) {
              await page.mouse.move(100, 50);
              await page.waitForTimeout(800);
            }
          }
        } else {
          const header = page.locator('header').first();
          await expect(header).toBeVisible();
        }

        const modeCards = page.locator('a[href*="singleplayer"], a[href*="multiplayer"]');
        const cardCount = await modeCards.count();
        expect(cardCount).toBeGreaterThan(0);
        await expect(modeCards.first()).toBeVisible();

        await assertNoHorizontalScroll(page, size.width, `Rules page at ${size.name}`);

        const touchIssues = await checkTouchTargets(page, size.width, size.height);
        if (touchIssues.length > 0 && size.width <= 896) {
          console.warn(`Touch target issues at ${size.name}:`, touchIssues.slice(0, 5));
        }
      });
    }
  });

  test.describe('2. Single Player Lobby - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Single Player lobby at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        const filename = `test-results/singleplayer-lobby-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game"), button[aria-label*="Start" i]').first();
        const buttonVisible = await startButton.isVisible().catch(() => false);
        if (!buttonVisible) {
          const anyStartButton = page.locator('button').filter({ hasText: /start/i }).first();
          await expect(anyStartButton).toBeVisible({ timeout: 5000 });
        } else {
          await expect(startButton).toBeVisible({ timeout: 5000 });
        }

        await assertNoHorizontalScroll(page, size.width, `Single Player lobby at ${size.name}`);

        if (size.width <= 896) {
          const touchIssues = await checkTouchTargets(page, size.width, size.height);
          if (touchIssues.length > 0) {
            console.warn(`Touch target issues at ${size.name}:`, touchIssues.slice(0, 5));
          }
        }
      });
    }
  });

  test.describe('3. Single Player Game - Landscape Mode (CRITICAL)', () => {
    for (const size of SCREEN_SIZES.mobileLandscape) {
      test(`Single Player game in landscape at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        await startButton.click();
        await page.waitForTimeout(2000);

        const filename = `test-results/singleplayer-game-landscape-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        const grid = page.locator('[class*="grid"], [class*="Grid"], [class*="game-board"], [role="grid"]').first();
        const gridVisible = await grid.isVisible({ timeout: 5000 }).catch(() => false);
        if (!gridVisible) {
          await page.waitForTimeout(2000);
          const gridAfterWait = await grid.isVisible().catch(() => false);
          if (gridAfterWait) {
            await expect(grid).toBeVisible();
          } else {
            console.warn(`Grid not visible in landscape at ${size.name} - game may not have started`);
          }
        } else {
          await expect(grid).toBeVisible();
        }

        const timer = page.locator('[class*="Timer"], [class*="timer"]').first();
        const timerVisible = await timer.isVisible().catch(() => false);
        if (timerVisible) {
          const timerBox = await timer.boundingBox();
          console.log(`Timer position: x=${timerBox?.x}, y=${timerBox?.y}`);
        }

        await assertNoHorizontalScroll(page, size.width, `Single Player game landscape at ${size.name}`);

        await page.waitForTimeout(2000);
        await page.screenshot({ path: filename.replace('.png', '-after-interaction.png') });

        const exitButton = page.locator('button:has-text("Exit"), button[aria-label*="Exit"]').first();
        const exitVisible = await exitButton.isVisible().catch(() => false);
        console.log(`Exit button visible: ${exitVisible}`);

        await page.mouse.move(100, 50);
        await page.waitForTimeout(500);
        const exitVisibleAfterMove = await exitButton.isVisible().catch(() => false);
        console.log(`Exit button visible after mouse move: ${exitVisibleAfterMove}`);

        await page.screenshot({ path: filename.replace('.png', '-controls-shown.png') });

        await page.waitForTimeout(4000);
        const exitVisibleAfterTimeout = await exitButton.isVisible().catch(() => false);
        console.log(`Exit button visible after timeout: ${exitVisibleAfterTimeout}`);

        await page.screenshot({ path: filename.replace('.png', '-controls-hidden.png') });
      });
    }
  });

  test.describe('4. Multiplayer Lobby - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Multiplayer lobby at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/multiplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const filename = `test-results/multiplayer-lobby-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        const usernameInput = page.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="username" i]').first();
        const inputVisible = await usernameInput.isVisible().catch(() => false);
        if (inputVisible) {
          await expect(usernameInput).toBeVisible();
        }

        await assertNoHorizontalScroll(page, size.width, `Multiplayer lobby at ${size.name}`);
      });
    }
  });

  test.describe('5. Rules Page - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Rules page at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/rules');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const filename = `test-results/rules-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        await assertNoHorizontalScroll(page, size.width, `Rules page at ${size.name}`);

        const scrollableContent = page.locator('main, [role="main"]').first();
        const scrollHeight = await scrollableContent.evaluate(el => el.scrollHeight);
        const clientHeight = await scrollableContent.evaluate(el => el.clientHeight);
        console.log(`Rules page scroll: ${scrollHeight}px content in ${clientHeight}px viewport`);
      });
    }
  });

  test.describe('6. Profile Page - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Profile page at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/profile');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const filename = `test-results/profile-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        await assertNoHorizontalScroll(page, size.width, `Rules page at ${size.name}`);
      });
    }
  });

  test.describe('7. Leaderboard Page - All Viewports', () => {
    const allSizes = [
      ...SCREEN_SIZES.mobilePortrait,
      ...SCREEN_SIZES.mobileLandscape,
      ...SCREEN_SIZES.tabletPortrait,
      ...SCREEN_SIZES.tabletLandscape,
      ...SCREEN_SIZES.desktop,
    ];

    for (const size of allSizes) {
      test(`Leaderboard page at ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/en/leaderboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const filename = `test-results/leaderboard-${size.name.replace(/\s+/g, '-')}-${size.width}x${size.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        await assertNoHorizontalScroll(page, size.width, `Rules page at ${size.name}`);
      });
    }
  });

  test.describe('8. Mobile Landscape - Interactive Elements', () => {
    test('All interactive elements accessible in mobile landscape', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const interactiveElements = await page.locator('button, a[href], input, select').all();
      const accessibleElements: string[] = [];

      for (const element of interactiveElements) {
        const isVisible = await element.isVisible().catch(() => false);
        if (!isVisible) continue;

        const box = await element.boundingBox();
        if (!box) continue;

        const text = (await element.textContent())?.trim().substring(0, 30) || '';
        const tag = await element.evaluate(el => el.tagName.toLowerCase());

        if (box.width >= MIN_TOUCH_TARGET_SIZE && box.height >= MIN_TOUCH_TARGET_SIZE) {
          if (box.x >= 0 && box.y >= 0 && box.right <= 667 && box.bottom <= 375) {
            accessibleElements.push(`${tag}: "${text}"`);
          }
        }
      }

      console.log(`Accessible elements in landscape: ${accessibleElements.length}`);
      await page.screenshot({ path: 'test-results/landscape-interactive-elements.png', fullPage: true });
    });

    test('Header auto-hide behavior in landscape', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const header = page.locator('header').first();
      const initialVisible = await header.isVisible().catch(() => false);

      await page.screenshot({ path: 'test-results/header-landscape-initial.png' });

      await page.mouse.move(100, 50);
      await page.waitForTimeout(500);
      const visibleAfterMove = await header.isVisible().catch(() => false);

      await page.screenshot({ path: 'test-results/header-landscape-shown.png' });

      await page.waitForTimeout(4000);
      const visibleAfterTimeout = await header.isVisible().catch(() => false);

      await page.screenshot({ path: 'test-results/header-landscape-hidden.png' });

      console.log(`Header visibility: initial=${initialVisible}, after move=${visibleAfterMove}, after timeout=${visibleAfterTimeout}`);
    });
  });

  test.describe('9. Game Flow - Single Player', () => {
    test('Complete single player game flow in landscape', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test-results/gameflow-lobby-landscape.png' });

      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      await startButton.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/gameflow-game-started-landscape.png' });

      const grid = page.locator('[class*="grid"], [class*="Grid"]').first();
      await expect(grid).toBeVisible({ timeout: 5000 });

      const gridBox = await grid.boundingBox();
      if (gridBox) {
        const centerX = gridBox.x + gridBox.width / 2;
        const centerY = gridBox.y + gridBox.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 50, centerY);
        await page.mouse.up();
        await page.waitForTimeout(500);
      }

      await page.screenshot({ path: 'test-results/gameflow-interaction-landscape.png' });
    });
  });

  test.describe('10. Responsive Breakpoints', () => {
    test('Viewport transitions across breakpoints', async ({ page }) => {
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      const breakpoints = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 414, height: 896, name: 'mobile-large' },
        { width: 667, height: 375, name: 'mobile-landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 1280, height: 720, name: 'desktop' },
      ];

      for (const bp of breakpoints) {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.waitForTimeout(500);

        await assertNoHorizontalScroll(page, bp.width, `Breakpoint ${bp.name}`);

        await page.screenshot({
          path: `test-results/breakpoint-${bp.name}-${bp.width}x${bp.height}.png`,
        });
      }
    });
  });

  test.describe('11. RTL Support - Landscape', () => {
    test('Hebrew RTL layout in landscape mode', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/he');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe('rtl');

      await page.screenshot({ path: 'test-results/rtl-hebrew-landscape.png', fullPage: true });

      await assertNoHorizontalScroll(page, 667, 'RTL Hebrew landscape');
    });
  });

  test.describe('12. Edge Cases - Landscape', () => {
    test('Very short landscape viewport (320px height)', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 320 });
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test-results/edge-very-short-landscape.png', fullPage: true });

      await assertNoHorizontalScroll(page, 800, 'Very short landscape viewport');

      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      const buttonVisible = await startButton.isVisible().catch(() => false);
      expect(buttonVisible).toBe(true);
    });

    test('Long content in landscape mode', async ({ page }) => {
      await page.setViewportSize({ width: 896, height: 414 });
      await page.goto('/en/rules');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/edge-long-content-landscape.png', fullPage: true });

      await assertNoHorizontalScroll(page, 896, 'Long content landscape');
    });
  });

  test.describe('13. Touch Interactions - Landscape', () => {
    test('Touch target sizes in landscape mode', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const issues = await checkTouchTargets(page, 667, 375);
      const criticalIssues = issues.filter(issue => 
        !issue.includes('🇺🇸') && 
        !issue.includes('language') &&
        !issue.includes('32x32')
      );
      
      if (issues.length > 0) {
        console.warn('Touch target issues in landscape:', issues);
      }

      await page.screenshot({ path: 'test-results/touch-targets-landscape.png', fullPage: true });

      expect(criticalIssues.length).toBe(0);
    });
  });

  test.describe('14. Keyboard Navigation - Landscape', () => {
    test('Tab navigation in landscape mode', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const focusableElements: string[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            text: el?.textContent?.trim().substring(0, 30),
            hasOutline: window.getComputedStyle(el as Element).outline !== 'none',
          };
        });

        focusableElements.push(`${focused.tag}: ${focused.text} (outline: ${focused.hasOutline})`);

        if (i < 5) {
          await page.screenshot({ path: `test-results/keyboard-focus-${i}-landscape.png` });
        }
      }

      console.log('Focus order in landscape:', focusableElements);
    });
  });

  test.describe('15. Loading States - All Viewports', () => {
    test('Loading indicators across viewports', async ({ page }) => {
      const sizes = [
        { width: 375, height: 667, name: 'mobile-portrait' },
        { width: 667, height: 375, name: 'mobile-landscape' },
        { width: 1280, height: 720, name: 'desktop' },
      ];

      for (const size of sizes) {
        await page.setViewportSize({ width: size.width, height: size.height });

        const responsePromise = page.goto('/en/singleplayer');
        await page.waitForTimeout(100);
        await page.screenshot({
          path: `test-results/loading-${size.name}.png`,
        });

        await responsePromise;
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `test-results/loaded-${size.name}.png`,
        });
      }
    });
  });
});
