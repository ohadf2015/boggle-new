import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive Landscape Mode UI Testing Suite
 *
 * Priority Focus Areas:
 * 1. LANDSCAPE MODE - Test ALL screens in landscape orientation
 * 2. Button Visibility - Check for buttons hiding other buttons
 * 3. Element Positioning - Verify no misplaced elements
 * 4. Scrolling Issues - Elements that should scroll but don't, or scroll when they shouldn't
 * 5. Overflow Problems - Content overflowing containers
 * 6. Z-index Issues - Elements stacking incorrectly
 * 7. Responsive Breakpoints - Test exact breakpoint transitions
 */

// Screen sizes to test
const LANDSCAPE_VIEWPORTS = {
  // Mobile landscape
  mobileLandscape667x375: { width: 667, height: 375, name: 'iPhone SE Landscape' },
  mobileLandscape812x375: { width: 812, height: 375, name: 'iPhone X Landscape' },
  mobileLandscape844x390: { width: 844, height: 390, name: 'iPhone 12 Landscape' },
  mobileLandscape926x428: { width: 926, height: 428, name: 'iPhone 12 Pro Max Landscape' },
  // Tablet landscape
  tabletLandscape1024x768: { width: 1024, height: 768, name: 'iPad Landscape' },
  tabletLandscape1180x820: { width: 1180, height: 820, name: 'iPad Air Landscape' },
  tabletLandscape1366x1024: { width: 1366, height: 1024, name: 'iPad Pro Landscape' },
  // Desktop
  desktop1280x720: { width: 1280, height: 720, name: 'Desktop HD' },
  desktop1920x1080: { width: 1920, height: 1080, name: 'Desktop Full HD' },
};

// Create screenshots directory
const screenshotDir = '/tmp/landscape-ui-test-screenshots';

interface UIIssue {
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  screen: string;
  viewport: string;
  description: string;
  element?: string;
  suggestion?: string;
  screenshotPath?: string;
}

const issues: UIIssue[] = [];

// Helper to capture and log issues
function logIssue(issue: UIIssue) {
  issues.push(issue);
  console.log(`[${issue.severity.toUpperCase()}] ${issue.screen} (${issue.viewport}): ${issue.description}`);
}

// Helper to ensure screenshot directory exists
async function ensureScreenshotDir() {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
}

// Helper to take screenshot with timestamp
async function captureScreenshot(page: Page, name: string): Promise<string> {
  await ensureScreenshotDir();
  const timestamp = Date.now();
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

// Helper to check if element is within viewport
async function isElementFullyVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  if (!(await element.isVisible().catch(() => false))) {
    return false;
  }
  const box = await element.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) return false;

  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  );
}

// Helper to check for element overlap
async function checkElementOverlap(page: Page, selector1: string, selector2: string): Promise<boolean> {
  const el1 = page.locator(selector1).first();
  const el2 = page.locator(selector2).first();

  if (!(await el1.isVisible().catch(() => false)) || !(await el2.isVisible().catch(() => false))) {
    return false;
  }

  const box1 = await el1.boundingBox();
  const box2 = await el2.boundingBox();

  if (!box1 || !box2) return false;

  // Check if boxes overlap
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

// Helper to check for content overflow
async function checkOverflow(page: Page, selector: string): Promise<{ hasOverflowX: boolean; hasOverflowY: boolean }> {
  const result = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { hasOverflowX: false, hasOverflowY: false };
    return {
      hasOverflowX: el.scrollWidth > el.clientWidth,
      hasOverflowY: el.scrollHeight > el.clientHeight,
    };
  }, selector);
  return result;
}

test.describe('Comprehensive Landscape Mode UI Testing', () => {
  test.beforeAll(async () => {
    await ensureScreenshotDir();
  });

  test.describe('1. Landing Page - Landscape Mode', () => {
    for (const [key, viewport] of Object.entries(LANDSCAPE_VIEWPORTS)) {
      test(`Landing page at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `landing-${key}`);

        // Check LandscapeIndicator visibility
        if (viewport.height <= 375) {
          const landscapeIndicator = page.locator('text=/rotate.*landscape|landscape.*controls/i');
          // LandscapeIndicator should only show on mobile portrait, not landscape
          const isIndicatorVisible = await landscapeIndicator.isVisible().catch(() => false);
          if (isIndicatorVisible) {
            logIssue({
              severity: 'minor',
              screen: 'Landing',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'LandscapeIndicator visible in landscape mode when it should only appear in portrait',
              element: 'LandscapeIndicator',
              screenshotPath,
            });
          }
        }

        // Check mode cards visibility
        const modeCards = page.locator('a[href*="multiplayer"], a[href*="singleplayer"]');
        const cardCount = await modeCards.count();
        expect(cardCount).toBeGreaterThanOrEqual(2);

        // Check for card overlap
        const multiplayerCard = page.locator('a[href*="multiplayer"]').first();
        const singleplayerCard = page.locator('a[href*="singleplayer"]').first();

        if (await multiplayerCard.isVisible() && await singleplayerCard.isVisible()) {
          const overlap = await checkElementOverlap(page, 'a[href*="multiplayer"]', 'a[href*="singleplayer"]');
          if (overlap) {
            logIssue({
              severity: 'major',
              screen: 'Landing',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Mode cards are overlapping each other',
              element: 'ModeCards',
              screenshotPath,
            });
          }
        }

        // Check Daily Challenge Banner
        const dailyBanner = page.locator('[class*="daily"], text=/daily.*challenge/i').first();
        if (await dailyBanner.isVisible().catch(() => false)) {
          const isFullyVisible = await isElementFullyVisible(page, '[class*="daily"]');
          if (!isFullyVisible) {
            logIssue({
              severity: 'minor',
              screen: 'Landing',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Daily challenge banner is partially cut off',
              element: 'DailyChallengeBanner',
              screenshotPath,
            });
          }
        }

        // Check header visibility
        const header = page.locator('header').first();
        if (await header.isVisible().catch(() => false)) {
          const headerBox = await header.boundingBox();
          if (headerBox && headerBox.height > 80) {
            logIssue({
              severity: 'minor',
              screen: 'Landing',
              viewport: `${viewport.width}x${viewport.height}`,
              description: `Header is too tall (${headerBox.height}px) for landscape mode`,
              element: 'Header',
              suggestion: 'Consider compact header in landscape',
              screenshotPath,
            });
          }
        }

        // Check Tutorial FAB button positioning
        const tutorialFab = page.locator('button[aria-label*="Tutorial"]');
        if (await tutorialFab.isVisible().catch(() => false)) {
          const fabBox = await tutorialFab.boundingBox();
          const viewportSize = page.viewportSize();
          if (fabBox && viewportSize) {
            // FAB should be in bottom-right corner
            if (fabBox.x + fabBox.width > viewportSize.width) {
              logIssue({
                severity: 'major',
                screen: 'Landing',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Tutorial FAB button extends beyond viewport',
                element: 'TutorialFAB',
                screenshotPath,
              });
            }
          }
        }

        // Check for horizontal scrolling (unwanted)
        const bodyOverflow = await checkOverflow(page, 'body');
        if (bodyOverflow.hasOverflowX) {
          logIssue({
            severity: 'major',
            screen: 'Landing',
            viewport: `${viewport.width}x${viewport.height}`,
            description: 'Page has horizontal scroll (unwanted overflow)',
            element: 'body',
            screenshotPath,
          });
        }
      });
    }
  });

  test.describe('2. Single Player Mode - Landscape Mode', () => {
    // Test only representative viewports to save time
    const testViewports = [
      LANDSCAPE_VIEWPORTS.mobileLandscape844x390,
      LANDSCAPE_VIEWPORTS.tabletLandscape1024x768,
      LANDSCAPE_VIEWPORTS.desktop1280x720,
    ];

    for (const viewport of testViewports) {
      test(`Single player setup at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `singleplayer-setup-${viewport.width}x${viewport.height}`);

        // Check mode buttons (Solo, Practice, Challenge, etc.)
        const modeButtons = page.locator('button:has-text("Solo"), button:has-text("Practice"), button:has-text("Challenge"), button:has-text("Bots")');
        const buttonCount = await modeButtons.count();

        // Verify all buttons are visible and don't overlap
        for (let i = 0; i < buttonCount; i++) {
          const button = modeButtons.nth(i);
          if (await button.isVisible().catch(() => false)) {
            const box = await button.boundingBox();
            if (box && box.width < 44) {
              logIssue({
                severity: 'major',
                screen: 'SinglePlayer Setup',
                viewport: `${viewport.width}x${viewport.height}`,
                description: `Button too narrow for touch (${box.width}px < 44px)`,
                element: 'Mode Button',
                screenshotPath,
              });
            }
          }
        }

        // Check form elements
        const formInputs = page.locator('input, select');
        const inputCount = await formInputs.count();
        for (let i = 0; i < inputCount; i++) {
          const input = formInputs.nth(i);
          if (await input.isVisible().catch(() => false)) {
            const box = await input.boundingBox();
            if (box && box.height < 40) {
              logIssue({
                severity: 'minor',
                screen: 'SinglePlayer Setup',
                viewport: `${viewport.width}x${viewport.height}`,
                description: `Form input too small for touch (height: ${box.height}px)`,
                element: 'Form Input',
                screenshotPath,
              });
            }
          }
        }

        // Check Start button visibility
        const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
        if (await startButton.isVisible().catch(() => false)) {
          const isFullyVisible = await isElementFullyVisible(page, 'button:has-text("Start"), button:has-text("Play")');
          if (!isFullyVisible) {
            logIssue({
              severity: 'critical',
              screen: 'SinglePlayer Setup',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Start button is not fully visible without scrolling',
              element: 'Start Button',
              suggestion: 'Ensure CTA buttons are always visible in landscape',
              screenshotPath,
            });
          }
        }
      });

      test(`Single player game at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Clear tutorial flag
        await page.goto('/en');
        await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');

        // Try to start a practice game
        const practiceButton = page.locator('button:has-text("Practice")').first();
        if (await practiceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await practiceButton.click();
          await page.waitForTimeout(500);
        }

        const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
        if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await startButton.click();
        }

        // Wait for game to load
        await page.waitForTimeout(2000);

        const screenshotPath = await captureScreenshot(page, `singleplayer-game-${viewport.width}x${viewport.height}`);

        // Dismiss tutorial if it appears
        const gotItButton = page.locator('button:has-text("Got it!")');
        if (await gotItButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await gotItButton.click();
          await page.waitForTimeout(500);
        }

        // Check grid visibility
        const grid = page.locator('[class*="grid"]').first();
        if (await grid.isVisible().catch(() => false)) {
          const gridBox = await grid.boundingBox();
          const viewportSize = page.viewportSize();

          if (gridBox && viewportSize) {
            // Grid should occupy good portion of screen in landscape
            const gridArea = gridBox.width * gridBox.height;
            const viewportArea = viewportSize.width * viewportSize.height;
            const occupancy = gridArea / viewportArea;

            if (occupancy < 0.2) {
              logIssue({
                severity: 'major',
                screen: 'SinglePlayer Game',
                viewport: `${viewport.width}x${viewport.height}`,
                description: `Grid is too small (${(occupancy * 100).toFixed(1)}% of viewport)`,
                element: 'Grid',
                suggestion: 'Maximize grid size in landscape mode',
                screenshotPath,
              });
            }

            // Check if grid is centered
            const centerX = gridBox.x + gridBox.width / 2;
            const viewportCenterX = viewportSize.width / 2;
            const xOffset = Math.abs(centerX - viewportCenterX);

            // Allow some tolerance for side panels
            if (xOffset > viewportSize.width * 0.15) {
              logIssue({
                severity: 'minor',
                screen: 'SinglePlayer Game',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Grid is not properly centered in landscape',
                element: 'Grid',
                screenshotPath,
              });
            }
          }
        }

        // Check side panels (landscape-specific)
        if (viewport.height <= 600) {
          const leftPanel = page.locator('.landscape-side-panel').first();
          const rightPanel = page.locator('.landscape-side-panel').last();

          if (await leftPanel.isVisible().catch(() => false)) {
            const leftBox = await leftPanel.boundingBox();
            if (leftBox && leftBox.width > 200) {
              logIssue({
                severity: 'minor',
                screen: 'SinglePlayer Game',
                viewport: `${viewport.width}x${viewport.height}`,
                description: `Left panel too wide (${leftBox.width}px)`,
                element: 'LeftPanel',
                screenshotPath,
              });
            }
          }
        }

        // Check control buttons
        const pauseButton = page.locator('button[aria-label*="Pause"], button[aria-label*="Finish"]').first();
        const quitButton = page.locator('button[aria-label*="Quit"]').first();

        if (await pauseButton.isVisible().catch(() => false) && await quitButton.isVisible().catch(() => false)) {
          const overlap = await checkElementOverlap(page, 'button[aria-label*="Pause"], button[aria-label*="Finish"]', 'button[aria-label*="Quit"]');
          if (overlap) {
            logIssue({
              severity: 'critical',
              screen: 'SinglePlayer Game',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Pause and Quit buttons are overlapping',
              element: 'Control Buttons',
              screenshotPath,
            });
          }
        }

        // Check timer visibility
        const timer = page.locator('[class*="timer"], [class*="Timer"]').first();
        if (await timer.isVisible().catch(() => false)) {
          const timerBox = await timer.boundingBox();
          if (timerBox && timerBox.width < 50) {
            logIssue({
              severity: 'minor',
              screen: 'SinglePlayer Game',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Timer is too small to read',
              element: 'Timer',
              screenshotPath,
            });
          }
        }

        // Check score display
        const scoreDisplay = page.locator('text=/score/i').first();
        if (await scoreDisplay.isVisible().catch(() => false)) {
          const isFullyVisible = await isElementFullyVisible(page, 'text=/score/i');
          if (!isFullyVisible) {
            logIssue({
              severity: 'major',
              screen: 'SinglePlayer Game',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Score display is cut off or not fully visible',
              element: 'Score',
              screenshotPath,
            });
          }
        }
      });
    }
  });

  test.describe('3. Multiplayer Flow - Landscape Mode', () => {
    const testViewports = [
      LANDSCAPE_VIEWPORTS.mobileLandscape844x390,
      LANDSCAPE_VIEWPORTS.tabletLandscape1024x768,
    ];

    for (const viewport of testViewports) {
      test(`Multiplayer page at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/multiplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `multiplayer-${viewport.width}x${viewport.height}`);

        // Check Host/Join mode selector
        const modeButtons = page.locator('button:has-text("Host"), button:has-text("Join")');
        const buttonCount = await modeButtons.count();

        for (let i = 0; i < buttonCount; i++) {
          const button = modeButtons.nth(i);
          if (await button.isVisible().catch(() => false)) {
            const box = await button.boundingBox();
            if (box && (box.width < 44 || box.height < 44)) {
              logIssue({
                severity: 'major',
                screen: 'Multiplayer',
                viewport: `${viewport.width}x${viewport.height}`,
                description: `Mode button too small for touch (${box.width}x${box.height}px)`,
                element: 'Mode Button',
                screenshotPath,
              });
            }
          }
        }

        // Check for room code input field
        const roomCodeInput = page.locator('input[placeholder*="code" i], input[name*="code" i]').first();
        if (await roomCodeInput.isVisible().catch(() => false)) {
          const inputBox = await roomCodeInput.boundingBox();
          if (inputBox && inputBox.height < 44) {
            logIssue({
              severity: 'major',
              screen: 'Multiplayer',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Room code input is too small for touch',
              element: 'Room Code Input',
              screenshotPath,
            });
          }
        }

        // Check username input
        const usernameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
        if (await usernameInput.isVisible().catch(() => false)) {
          const isFullyVisible = await isElementFullyVisible(page, 'input[placeholder*="name" i]');
          if (!isFullyVisible) {
            logIssue({
              severity: 'major',
              screen: 'Multiplayer',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Username input is not fully visible',
              element: 'Username Input',
              screenshotPath,
            });
          }
        }

        // Check for horizontal overflow
        const bodyOverflow = await checkOverflow(page, 'body');
        if (bodyOverflow.hasOverflowX) {
          logIssue({
            severity: 'major',
            screen: 'Multiplayer',
            viewport: `${viewport.width}x${viewport.height}`,
            description: 'Page has unwanted horizontal scroll',
            element: 'body',
            screenshotPath,
          });
        }
      });
    }
  });

  test.describe('4. Leaderboard - Landscape Mode', () => {
    const testViewports = [
      LANDSCAPE_VIEWPORTS.mobileLandscape844x390,
      LANDSCAPE_VIEWPORTS.desktop1280x720,
    ];

    for (const viewport of testViewports) {
      test(`Leaderboard at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/leaderboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        const screenshotPath = await captureScreenshot(page, `leaderboard-${viewport.width}x${viewport.height}`);

        // Check leaderboard table/list
        const leaderboardList = page.locator('[class*="leaderboard"], [class*="ranking"], table').first();
        if (await leaderboardList.isVisible().catch(() => false)) {
          // Check for vertical scroll (expected for long lists)
          const overflow = await checkOverflow(page, '[class*="leaderboard"], table');

          // Check that it fits horizontally
          const box = await leaderboardList.boundingBox();
          const viewportSize = page.viewportSize();
          if (box && viewportSize && box.width > viewportSize.width) {
            logIssue({
              severity: 'major',
              screen: 'Leaderboard',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Leaderboard extends beyond viewport width',
              element: 'Leaderboard',
              screenshotPath,
            });
          }
        }

        // Check for truncated usernames
        const usernames = page.locator('[class*="username"], [class*="player-name"]');
        const usernameCount = await usernames.count();
        for (let i = 0; i < Math.min(usernameCount, 5); i++) {
          const username = usernames.nth(i);
          if (await username.isVisible().catch(() => false)) {
            // Check if text is visually truncated (ellipsis)
            const hasEllipsis = await username.evaluate((el) => {
              const styles = window.getComputedStyle(el);
              return styles.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth;
            });
            if (hasEllipsis) {
              logIssue({
                severity: 'cosmetic',
                screen: 'Leaderboard',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Some usernames are truncated',
                element: 'Username',
                screenshotPath,
              });
              break; // Only log once
            }
          }
        }
      });
    }
  });

  test.describe('5. Profile/Settings - Landscape Mode', () => {
    const testViewports = [
      LANDSCAPE_VIEWPORTS.mobileLandscape844x390,
      LANDSCAPE_VIEWPORTS.tabletLandscape1024x768,
    ];

    for (const viewport of testViewports) {
      test(`Profile page at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/profile');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `profile-${viewport.width}x${viewport.height}`);

        // Check profile card/avatar
        const profileSection = page.locator('[class*="profile"], [class*="avatar"]').first();
        if (await profileSection.isVisible().catch(() => false)) {
          const isFullyVisible = await isElementFullyVisible(page, '[class*="profile"], [class*="avatar"]');
          if (!isFullyVisible) {
            logIssue({
              severity: 'minor',
              screen: 'Profile',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Profile section is not fully visible',
              element: 'Profile Section',
              screenshotPath,
            });
          }
        }

        // Check for horizontal overflow
        const bodyOverflow = await checkOverflow(page, 'body');
        if (bodyOverflow.hasOverflowX) {
          logIssue({
            severity: 'major',
            screen: 'Profile',
            viewport: `${viewport.width}x${viewport.height}`,
            description: 'Page has unwanted horizontal scroll',
            element: 'body',
            screenshotPath,
          });
        }
      });

      test(`Settings page at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/settings');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `settings-${viewport.width}x${viewport.height}`);

        // Check settings sections
        const settingsSections = page.locator('[class*="setting"], [class*="option"]');
        const sectionCount = await settingsSections.count();

        // Check each visible section
        for (let i = 0; i < Math.min(sectionCount, 3); i++) {
          const section = settingsSections.nth(i);
          if (await section.isVisible().catch(() => false)) {
            const box = await section.boundingBox();
            const viewportSize = page.viewportSize();
            if (box && viewportSize && box.width > viewportSize.width) {
              logIssue({
                severity: 'major',
                screen: 'Settings',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Settings section extends beyond viewport',
                element: 'Settings Section',
                screenshotPath,
              });
              break;
            }
          }
        }

        // Check toggle switches (common in settings)
        const toggles = page.locator('[role="switch"], input[type="checkbox"]');
        const toggleCount = await toggles.count();
        for (let i = 0; i < Math.min(toggleCount, 3); i++) {
          const toggle = toggles.nth(i);
          if (await toggle.isVisible().catch(() => false)) {
            const box = await toggle.boundingBox();
            if (box && (box.width < 40 || box.height < 20)) {
              logIssue({
                severity: 'minor',
                screen: 'Settings',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Toggle switch too small for touch',
                element: 'Toggle Switch',
                screenshotPath,
              });
              break;
            }
          }
        }
      });
    }
  });

  test.describe('6. Rules/How to Play - Landscape Mode', () => {
    const testViewports = [
      LANDSCAPE_VIEWPORTS.mobileLandscape844x390,
      LANDSCAPE_VIEWPORTS.tabletLandscape1024x768,
    ];

    for (const viewport of testViewports) {
      test(`Rules page at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/en/rules');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `rules-${viewport.width}x${viewport.height}`);

        // Check content sections
        const contentSections = page.locator('section, article, [class*="rule"]');
        const sectionCount = await contentSections.count();

        // Ensure content is scrollable if needed
        const mainContent = page.locator('main, [class*="content"]').first();
        if (await mainContent.isVisible().catch(() => false)) {
          const overflow = await checkOverflow(page, 'main, [class*="content"]');
          // Vertical scroll is expected for long content
          // Horizontal scroll is NOT expected
          if (overflow.hasOverflowX) {
            logIssue({
              severity: 'major',
              screen: 'Rules',
              viewport: `${viewport.width}x${viewport.height}`,
              description: 'Content has unwanted horizontal scroll',
              element: 'Main Content',
              screenshotPath,
            });
          }
        }

        // Check images/illustrations
        const images = page.locator('img, svg');
        const imageCount = await images.count();
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          if (await img.isVisible().catch(() => false)) {
            const box = await img.boundingBox();
            const viewportSize = page.viewportSize();
            if (box && viewportSize && box.width > viewportSize.width - 20) {
              logIssue({
                severity: 'minor',
                screen: 'Rules',
                viewport: `${viewport.width}x${viewport.height}`,
                description: 'Image extends to edge of viewport',
                element: 'Image',
                suggestion: 'Add horizontal padding to images',
                screenshotPath,
              });
              break;
            }
          }
        }
      });
    }
  });

  test.describe('7. Z-Index and Stacking Issues', () => {
    test('Check modal z-index in landscape', async ({ page }) => {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto('/en');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');

      // Start a game
      const practiceButton = page.locator('button:has-text("Practice")').first();
      if (await practiceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await practiceButton.click();
        await page.waitForTimeout(500);
      }

      const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
      if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startButton.click();
      }

      await page.waitForTimeout(2000);

      const screenshotPath = await captureScreenshot(page, 'zindex-test');

      // Try to trigger quit confirmation
      const quitButton = page.locator('button[aria-label*="Quit"]').first();
      if (await quitButton.isVisible().catch(() => false)) {
        // Click to trigger confirmation
        await quitButton.click();
        await page.waitForTimeout(500);

        // Check if modal is properly layered
        const modal = page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]').first();
        if (await modal.isVisible().catch(() => false)) {
          const modalZIndex = await modal.evaluate((el) => {
            return parseInt(window.getComputedStyle(el).zIndex) || 0;
          });

          // Modal should have high z-index
          if (modalZIndex < 40) {
            logIssue({
              severity: 'major',
              screen: 'Z-Index Check',
              viewport: '844x390',
              description: `Modal has low z-index (${modalZIndex}), may be hidden by other elements`,
              element: 'Modal',
              screenshotPath,
            });
          }

          await captureScreenshot(page, 'modal-visible');
        }
      }
    });
  });

  test.describe('8. Breakpoint Transitions', () => {
    test('Test breakpoint transitions from portrait to landscape', async ({ page }) => {
      const transitionSizes = [
        { width: 390, height: 844, name: 'Portrait' },
        { width: 600, height: 400, name: 'Transition' },
        { width: 844, height: 390, name: 'Landscape' },
      ];

      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      for (const size of transitionSizes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.waitForTimeout(1000);

        const screenshotPath = await captureScreenshot(page, `breakpoint-${size.name}`);

        // Check for layout shifts or broken elements
        const mainContent = page.locator('main').first();
        if (await mainContent.isVisible().catch(() => false)) {
          const overflow = await checkOverflow(page, 'main');
          if (overflow.hasOverflowX) {
            logIssue({
              severity: 'major',
              screen: 'Breakpoint Transition',
              viewport: `${size.width}x${size.height}`,
              description: `Layout breaks at ${size.name} breakpoint`,
              element: 'Main Content',
              screenshotPath,
            });
          }
        }
      }
    });

    test('Test CSS breakpoint at 600px height (mobile landscape trigger)', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));
      await page.waitForLoadState('networkidle');

      // Test at exactly 600px height (threshold)
      const testHeights = [599, 600, 601];

      for (const height of testHeights) {
        await page.setViewportSize({ width: 900, height });
        await page.waitForTimeout(500);

        const screenshotPath = await captureScreenshot(page, `height-breakpoint-${height}`);

        // Check if landscape mode is correctly triggered
        const isLandscape = await page.evaluate(() => {
          return window.innerWidth > window.innerHeight && window.innerHeight <= 600;
        });

        // At 599 and 600, should trigger landscape mode
        // At 601, should NOT trigger landscape mode
        if (height <= 600 && !isLandscape) {
          // This is expected behavior based on hook logic
        } else if (height > 600 && isLandscape) {
          logIssue({
            severity: 'minor',
            screen: 'Height Breakpoint',
            viewport: `900x${height}`,
            description: 'Landscape mode incorrectly triggered above 600px height',
            element: 'useMobileLandscape hook',
            screenshotPath,
          });
        }
      }
    });
  });

  test.afterAll(async () => {
    // Generate summary report
    console.log('\n========================================');
    console.log('LANDSCAPE UI TESTING SUMMARY REPORT');
    console.log('========================================\n');

    const critical = issues.filter(i => i.severity === 'critical');
    const major = issues.filter(i => i.severity === 'major');
    const minor = issues.filter(i => i.severity === 'minor');
    const cosmetic = issues.filter(i => i.severity === 'cosmetic');

    console.log(`Total Issues Found: ${issues.length}`);
    console.log(`  - Critical: ${critical.length}`);
    console.log(`  - Major: ${major.length}`);
    console.log(`  - Minor: ${minor.length}`);
    console.log(`  - Cosmetic: ${cosmetic.length}`);
    console.log('');

    if (critical.length > 0) {
      console.log('CRITICAL ISSUES:');
      critical.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.screen}] ${issue.description}`);
        console.log(`     Viewport: ${issue.viewport}`);
        if (issue.element) console.log(`     Element: ${issue.element}`);
        if (issue.suggestion) console.log(`     Suggestion: ${issue.suggestion}`);
      });
      console.log('');
    }

    if (major.length > 0) {
      console.log('MAJOR ISSUES:');
      major.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.screen}] ${issue.description}`);
        console.log(`     Viewport: ${issue.viewport}`);
        if (issue.element) console.log(`     Element: ${issue.element}`);
        if (issue.suggestion) console.log(`     Suggestion: ${issue.suggestion}`);
      });
      console.log('');
    }

    if (minor.length > 0) {
      console.log('MINOR ISSUES:');
      minor.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.screen}] ${issue.description}`);
        console.log(`     Viewport: ${issue.viewport}`);
      });
      console.log('');
    }

    if (cosmetic.length > 0) {
      console.log('COSMETIC ISSUES:');
      cosmetic.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.screen}] ${issue.description}`);
        console.log(`     Viewport: ${issue.viewport}`);
      });
    }

    console.log('\n========================================');
    console.log(`Screenshots saved to: ${screenshotDir}`);
    console.log('========================================\n');

    // Save issues to JSON file
    const reportPath = path.join(screenshotDir, 'ui-issues-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
    console.log(`Full report saved to: ${reportPath}`);
  });
});
