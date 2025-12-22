import { test, expect, type Page } from '@playwright/test';

/**
 * UI Buttons, Scrolling, and Layout Test
 * Tests button hover/click states, scrolling issues, and layout optimization
 * Tests both portrait and landscape modes
 */

const VIEWPORTS = {
  portrait: [
    { name: 'iPhone SE Portrait', width: 375, height: 667 },
    { name: 'iPhone 12 Portrait', width: 390, height: 844 },
    { name: 'iPad Portrait', width: 768, height: 1024 },
  ],
  landscape: [
    { name: 'iPhone SE Landscape', width: 667, height: 375 },
    { name: 'iPhone 12 Landscape', width: 844, height: 390 },
    { name: 'iPad Landscape', width: 1024, height: 768 },
  ],
};

async function checkScrolling(page: Page, viewportWidth: number, viewportHeight: number) {
  const scrollInfo = await page.evaluate(({ vw, vh }) => {
    const html = document.documentElement;
    const body = document.body;
    return {
      hasHorizontalScroll: html.scrollWidth > vw || body.scrollWidth > vw,
      hasVerticalScroll: html.scrollHeight > vh || body.scrollHeight > vh,
      scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(html.scrollHeight, body.scrollHeight),
      clientWidth: vw,
      clientHeight: vh,
    };
  }, { vw: viewportWidth, vh: viewportHeight });
  return scrollInfo;
}

async function testButtonStates(page: Page, buttonSelector: string, buttonName: string) {
  const button = page.locator(buttonSelector).first();
  const isVisible = await button.isVisible().catch(() => false);
  if (!isVisible) return null;

  const box = await button.boundingBox();
  if (!box) return null;

  // Test hover state
  await button.hover();
  await page.waitForTimeout(300);
  const hoverBox = await button.boundingBox();
  const hoverStyles = await button.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      transform: styles.transform,
      boxShadow: styles.boxShadow,
      backgroundColor: styles.backgroundColor,
    };
  });

  // Test click/active state
  await button.click({ force: true });
  await page.waitForTimeout(200);
  const activeStyles = await button.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      transform: styles.transform,
      boxShadow: styles.boxShadow,
      backgroundColor: styles.backgroundColor,
    };
  });

  // Release click
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);

  return {
    name: buttonName,
    size: { width: box.width, height: box.height },
    position: { x: box.x, y: box.y },
    hoverTransform: hoverStyles.transform,
    hoverShadow: hoverStyles.boxShadow,
    activeTransform: activeStyles.transform,
    activeShadow: activeStyles.boxShadow,
    minSizeOk: box.width >= 44 && box.height >= 44,
  };
}

test.describe('UI Buttons, Scrolling, and Layout Tests', () => {
  test.describe('1. Landing Page - Portrait & Landscape', () => {
    [...VIEWPORTS.portrait, ...VIEWPORTS.landscape].forEach((viewport) => {
      test(`${viewport.name} - Buttons, Scrolling, Layout`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const filename = `test-results/landing-${viewport.name.replace(/\s+/g, '-')}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        // Check scrolling
        const scrollInfo = await checkScrolling(page, viewport.width, viewport.height);
        console.log(`Scrolling check for ${viewport.name}:`, scrollInfo);
        
        if (viewport.width >= 375) {
          expect(scrollInfo.hasHorizontalScroll).toBe(false);
        }

        // Test main buttons (Single Player, Multiplayer)
        const singlePlayerLink = page.locator('a[href*="singleplayer"]').first();
        const multiplayerLink = page.locator('a[href*="multiplayer"]').first();

        const singlePlayerButton = await testButtonStates(
          page,
          'a[href*="singleplayer"]',
          'Single Player'
        );
        const multiplayerButton = await testButtonStates(
          page,
          'a[href*="multiplayer"]',
          'Multiplayer'
        );

        if (singlePlayerButton) {
          console.log('Single Player button:', singlePlayerButton);
          expect(singlePlayerButton.minSizeOk).toBe(true);
          expect(singlePlayerButton.hoverTransform).not.toBe('none');
        }

        if (multiplayerButton) {
          console.log('Multiplayer button:', multiplayerButton);
          expect(multiplayerButton.minSizeOk).toBe(true);
          expect(multiplayerButton.hoverTransform).not.toBe('none');
        }

        // Check if content fits on screen
        const mainContent = page.locator('main, [role="main"]').first();
        const mainBox = await mainContent.boundingBox();
        if (mainBox) {
          const fitsVertically = mainBox.height <= viewport.height * 1.1; // Allow 10% overflow
          const fitsHorizontally = mainBox.width <= viewport.width;
          console.log(`Content fits: vertical=${fitsVertically}, horizontal=${fitsHorizontally}`);
        }

        await page.screenshot({ path: filename.replace('.png', '-after-hover.png') });
      });
    });
  });

  test.describe('2. Single Player Lobby - Portrait & Landscape', () => {
    [...VIEWPORTS.portrait, ...VIEWPORTS.landscape].forEach((viewport) => {
      test(`${viewport.name} - Buttons, Scrolling, Layout`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const filename = `test-results/singleplayer-lobby-${viewport.name.replace(/\s+/g, '-')}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        // Check scrolling
        const scrollInfo = await checkScrolling(page, viewport.width, viewport.height);
        console.log(`Scrolling check for ${viewport.name}:`, scrollInfo);
        
        if (viewport.width >= 375) {
          expect(scrollInfo.hasHorizontalScroll).toBe(false);
        }

        // Test Start Game button
        const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        const startButtonTest = await testButtonStates(page, 'button:has-text("Start"), button:has-text("Start Game")', 'Start Game');
        
        if (startButtonTest) {
          console.log('Start Game button:', startButtonTest);
          expect(startButtonTest.minSizeOk).toBe(true);
        }

        // Test mode selection buttons
        const modeButtons = page.locator('button').filter({ hasText: /Practice|Challenge|Solo/i });
        const modeCount = await modeButtons.count();
        console.log(`Found ${modeCount} mode buttons`);

        for (let i = 0; i < Math.min(modeCount, 3); i++) {
          const button = modeButtons.nth(i);
          const text = await button.textContent();
          const buttonTest = await testButtonStates(page, `button:has-text("${text}")`, `Mode: ${text}`);
          if (buttonTest) {
            console.log(`Mode button "${text}":`, buttonTest);
          }
        }

        // Test difficulty buttons
        const difficultyButtons = page.locator('button').filter({ hasText: /Easy|Medium|Hard/i });
        const diffCount = await difficultyButtons.count();
        if (diffCount > 0) {
          const firstDiff = difficultyButtons.first();
          const diffText = await firstDiff.textContent();
          const diffTest = await testButtonStates(page, `button:has-text("${diffText}")`, `Difficulty: ${diffText}`);
          if (diffTest) {
            console.log(`Difficulty button "${diffText}":`, diffTest);
          }
        }

        await page.screenshot({ path: filename.replace('.png', '-after-interactions.png') });
      });
    });
  });

  test.describe('3. Multiplayer Lobby - Portrait & Landscape', () => {
    [...VIEWPORTS.portrait, ...VIEWPORTS.landscape].forEach((viewport) => {
      test(`${viewport.name} - Buttons, Scrolling, Layout`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/multiplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const filename = `test-results/multiplayer-lobby-${viewport.name.replace(/\s+/g, '-')}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        // Check scrolling
        const scrollInfo = await checkScrolling(page, viewport.width, viewport.height);
        console.log(`Scrolling check for ${viewport.name}:`, scrollInfo);
        
        if (viewport.width >= 375) {
          expect(scrollInfo.hasHorizontalScroll).toBe(false);
        }

        // Test Join/Host mode buttons
        const modeButtons = page.locator('button').filter({ hasText: /Join|Host|Create|Create Room|Join Room/i });
        const modeCount = await modeButtons.count();
        console.log(`Found ${modeCount} mode/action buttons`);

        for (let i = 0; i < Math.min(modeCount, 2); i++) {
          const button = modeButtons.nth(i);
          const text = await button.textContent();
          if (text) {
            const buttonTest = await testButtonStates(page, `button:has-text("${text}")`, `Action: ${text}`);
            if (buttonTest) {
              console.log(`Action button "${text}":`, buttonTest);
              expect(buttonTest.minSizeOk).toBe(true);
            }
          }
        }

        await page.screenshot({ path: filename.replace('.png', '-after-interactions.png') });
      });
    });
  });

  test.describe('4. Single Player Game - Portrait & Landscape', () => {
    [...VIEWPORTS.portrait, ...VIEWPORTS.landscape].forEach((viewport) => {
      test(`${viewport.name} - Buttons, Scrolling, Layout`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Start game
        const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
        await startButton.click();
        await page.waitForTimeout(3000);

        const filename = `test-results/singleplayer-game-${viewport.name.replace(/\s+/g, '-')}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        // Check scrolling
        const scrollInfo = await checkScrolling(page, viewport.width, viewport.height);
        console.log(`Scrolling check for ${viewport.name}:`, scrollInfo);
        
        if (viewport.width >= 375) {
          expect(scrollInfo.hasHorizontalScroll).toBe(false);
        }

        // Test Exit/Pause buttons
        const exitButton = page.locator('button:has-text("Exit"), button[aria-label*="Exit" i]').first();
        const exitVisible = await exitButton.isVisible().catch(() => false);
        
        if (exitVisible) {
          const exitTest = await testButtonStates(page, 'button:has-text("Exit"), button[aria-label*="Exit" i]', 'Exit');
          if (exitTest) {
            console.log('Exit button:', exitTest);
            expect(exitTest.minSizeOk).toBe(true);
          }
        }

        // Test Pause button if exists
        const pauseButton = page.locator('button:has-text("Pause"), button[aria-label*="Pause" i]').first();
        const pauseVisible = await pauseButton.isVisible().catch(() => false);
        
        if (pauseVisible) {
          const pauseTest = await testButtonStates(page, 'button:has-text("Pause"), button[aria-label*="Pause" i]', 'Pause');
          if (pauseTest) {
            console.log('Pause button:', pauseTest);
          }
        }

        // Check if game grid fits on screen
        const grid = page.locator('[class*="grid"], [class*="Grid"], [class*="game-board"]').first();
        const gridVisible = await grid.isVisible().catch(() => false);
        if (gridVisible) {
          const gridBox = await grid.boundingBox();
          if (gridBox) {
            const gridFits = gridBox.width <= viewport.width && gridBox.height <= viewport.height * 0.8;
            console.log(`Grid fits on screen: ${gridFits}, size: ${gridBox.width}x${gridBox.height}`);
          }
        }

        await page.screenshot({ path: filename.replace('.png', '-after-interactions.png') });
      });
    });
  });

  test.describe('5. Button Hover States - All Pages', () => {
    test('Test button hover states across all pages', async ({ page }) => {
      const viewport = { width: 375, height: 667 }; // iPhone 12 Portrait
      await page.setViewportSize(viewport);

      const pages = [
        { url: '/en', name: 'Landing' },
        { url: '/en/singleplayer', name: 'Single Player Lobby' },
        { url: '/en/multiplayer', name: 'Multiplayer Lobby' },
      ];

      for (const pageInfo of pages) {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const buttons = await page.locator('button, a[href]').all();
        console.log(`\n=== ${pageInfo.name} - Testing ${buttons.length} buttons ===`);

        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
          const button = buttons[i];
          const isVisible = await button.isVisible().catch(() => false);
          if (!isVisible) continue;

          const text = (await button.textContent())?.trim() || '';
          const box = await button.boundingBox();
          if (!box) continue;

          // Test hover
          await button.hover();
          await page.waitForTimeout(200);
          const hoverStyles = await button.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              transform: styles.transform,
              boxShadow: styles.boxShadow,
              backgroundColor: styles.backgroundColor,
            };
          });

          // Test active
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);
          const activeStyles = await button.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              transform: styles.transform,
              boxShadow: styles.boxShadow,
            };
          });
          await page.mouse.up();
          await page.waitForTimeout(100);

          console.log(`Button "${text.substring(0, 30)}":`, {
            size: `${Math.round(box.width)}x${Math.round(box.height)}`,
            hoverTransform: hoverStyles.transform !== 'none' ? hoverStyles.transform : 'none',
            activeTransform: activeStyles.transform !== 'none' ? activeStyles.transform : 'none',
            hasHoverEffect: hoverStyles.transform !== 'none' || hoverStyles.boxShadow !== 'none',
            hasActiveEffect: activeStyles.transform !== 'none',
          });
        }
      }
    });
  });

  test.describe('6. Scrolling Analysis - All Pages', () => {
    [...VIEWPORTS.portrait, ...VIEWPORTS.landscape].forEach((viewport) => {
      test(`${viewport.name} - Scrolling Analysis`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const pages = [
          { url: '/en', name: 'Landing' },
          { url: '/en/singleplayer', name: 'Single Player Lobby' },
          { url: '/en/multiplayer', name: 'Multiplayer Lobby' },
        ];

        for (const pageInfo of pages) {
          await page.goto(pageInfo.url);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1500);

          const scrollInfo = await checkScrolling(page, viewport.width, viewport.height);
          
          console.log(`\n${pageInfo.name} (${viewport.name}):`, {
            horizontalScroll: scrollInfo.hasHorizontalScroll,
            verticalScroll: scrollInfo.hasVerticalScroll,
            scrollWidth: scrollInfo.scrollWidth,
            scrollHeight: scrollInfo.scrollHeight,
            viewportWidth: scrollInfo.clientWidth,
            viewportHeight: scrollInfo.clientHeight,
            overflowX: scrollInfo.scrollWidth - scrollInfo.clientWidth,
            overflowY: scrollInfo.scrollHeight - scrollInfo.clientHeight,
          });

          if (viewport.width >= 375) {
            expect(scrollInfo.hasHorizontalScroll).toBe(false);
          }

          // Check if vertical scrolling is reasonable (not excessive)
          const verticalOverflow = scrollInfo.scrollHeight - scrollInfo.clientHeight;
          const maxReasonableOverflow = viewport.height * 0.5; // Allow 50% overflow max
          
          if (verticalOverflow > maxReasonableOverflow) {
            console.warn(`⚠️  Excessive vertical scrolling on ${pageInfo.name}: ${verticalOverflow}px overflow`);
          }
        }
      });
    });
  });
});

