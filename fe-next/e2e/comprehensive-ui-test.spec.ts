import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Comprehensive UI Testing for LexiClash Word Game
 * Tests across all screen sizes and game modes
 */

// Viewport configurations
const VIEWPORTS = {
  // Mobile Portrait
  mobileSmall: { width: 320, height: 568, name: 'Mobile Small (320x568)' },
  mobileMedium: { width: 375, height: 667, name: 'Mobile Medium (375x667)' },
  mobileLarge: { width: 414, height: 896, name: 'Mobile Large (414x896)' },
  // Mobile Landscape
  mobileLandscapeMedium: { width: 667, height: 375, name: 'Mobile Landscape Medium (667x375)' },
  mobileLandscapeLarge: { width: 896, height: 414, name: 'Mobile Landscape Large (896x414)' },
  // Tablet
  tabletPortrait: { width: 768, height: 1024, name: 'Tablet Portrait (768x1024)' },
  tabletLandscape: { width: 1024, height: 768, name: 'Tablet Landscape (1024x768)' },
  // Desktop
  desktopSmall: { width: 1280, height: 720, name: 'Desktop Small (1280x720)' },
  desktopLarge: { width: 1920, height: 1080, name: 'Desktop Large (1920x1080)' },
};

// Helper functions
interface UIIssue {
  viewport: string;
  page: string;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  element?: string;
  details?: string;
  screenshot?: string;
}

const issues: UIIssue[] = [];

async function checkElementVisibility(page: Page, selector: string, name: string, viewportName: string, pageName: string) {
  const element = page.locator(selector).first();

  try {
    const isVisible = await element.isVisible({ timeout: 3000 });
    if (!isVisible) {
      issues.push({
        viewport: viewportName,
        page: pageName,
        issue: `Element not visible: ${name}`,
        severity: 'High',
        element: selector,
      });
      return false;
    }

    // Check if element is within viewport
    const box = await element.boundingBox();
    if (box) {
      const viewport = page.viewportSize();
      if (viewport) {
        if (box.x < 0 || box.x + box.width > viewport.width) {
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: `Element extends beyond horizontal viewport: ${name}`,
            severity: 'High',
            element: selector,
            details: `Element at x=${box.x}, width=${box.width}, viewport width=${viewport.width}`,
          });
        }
        if (box.y < 0 || box.y + box.height > viewport.height + 500) {
          // Allow some scroll
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: `Element position issue: ${name}`,
            severity: 'Medium',
            element: selector,
            details: `Element at y=${box.y}, height=${box.height}`,
          });
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function checkButtonTouchTarget(page: Page, selector: string, name: string, viewportName: string, pageName: string) {
  const element = page.locator(selector).first();

  try {
    const box = await element.boundingBox();
    if (box) {
      const minTouchTarget = 44; // iOS/Android minimum touch target
      if (box.width < minTouchTarget || box.height < minTouchTarget) {
        issues.push({
          viewport: viewportName,
          page: pageName,
          issue: `Touch target too small: ${name}`,
          severity: 'High',
          element: selector,
          details: `Size: ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: 44x44px)`,
        });
      }
    }
  } catch (e) {
    // Element not found
  }
}

async function checkForHorizontalScroll(page: Page, viewportName: string, pageName: string) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  if (hasHorizontalScroll) {
    issues.push({
      viewport: viewportName,
      page: pageName,
      issue: 'Horizontal scroll detected on mobile viewport',
      severity: 'High',
      details: 'Content extends beyond viewport width causing horizontal scrollbar',
    });
  }
}

async function checkTextTruncation(page: Page, selector: string, name: string, viewportName: string, pageName: string) {
  const element = page.locator(selector).first();

  try {
    const isTruncated = await element.evaluate((el) => {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    });

    if (isTruncated) {
      issues.push({
        viewport: viewportName,
        page: pageName,
        issue: `Text truncation detected: ${name}`,
        severity: 'Medium',
        element: selector,
      });
    }
  } catch (e) {
    // Element not found
  }
}

async function checkElementOverlap(page: Page, selector1: string, selector2: string, name1: string, name2: string, viewportName: string, pageName: string) {
  try {
    const el1 = page.locator(selector1).first();
    const el2 = page.locator(selector2).first();

    const box1 = await el1.boundingBox();
    const box2 = await el2.boundingBox();

    if (box1 && box2) {
      const overlap = !(box1.x + box1.width < box2.x ||
                       box2.x + box2.width < box1.x ||
                       box1.y + box1.height < box2.y ||
                       box2.y + box2.height < box1.y);

      if (overlap) {
        issues.push({
          viewport: viewportName,
          page: pageName,
          issue: `Elements overlapping: ${name1} and ${name2}`,
          severity: 'Critical',
          details: `${name1}: (${Math.round(box1.x)},${Math.round(box1.y)}) ${Math.round(box1.width)}x${Math.round(box1.height)}, ${name2}: (${Math.round(box2.x)},${Math.round(box2.y)}) ${Math.round(box2.width)}x${Math.round(box2.height)}`,
        });
      }
    }
  } catch (e) {
    // Elements not found
  }
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${name}-${timestamp}.png`;
  await page.screenshot({ path: `./e2e/screenshots/${fileName}`, fullPage: false });
  return fileName;
}

// Test Suite
test.describe('LexiClash Comprehensive UI Testing', () => {
  test.beforeAll(async () => {
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync('./e2e/screenshots')) {
      fs.mkdirSync('./e2e/screenshots', { recursive: true });
    }
  });

  // Test Landing Page across all viewports
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Landing Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en');
      await page.waitForLoadState('networkidle');

      // Wait for content to load
      await page.waitForTimeout(1000);

      const pageName = 'Landing Page';
      const viewportName = viewport.name;

      // Take screenshot
      await takeScreenshot(page, `landing-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check header visibility
      await checkElementVisibility(page, 'header', 'Header', viewportName, pageName);

      // Check mode selection cards
      await checkElementVisibility(page, '[href*="/singleplayer"]', 'Single Player Card', viewportName, pageName);
      await checkElementVisibility(page, '[href*="/multiplayer"]', 'Multiplayer Card', viewportName, pageName);

      // Check touch targets for mobile
      if (viewport.width <= 768) {
        await checkButtonTouchTarget(page, '[href*="/singleplayer"]', 'Single Player Card', viewportName, pageName);
        await checkButtonTouchTarget(page, '[href*="/multiplayer"]', 'Multiplayer Card', viewportName, pageName);
      }

      // Check Daily Challenge Banner
      await checkElementVisibility(page, '[class*="DailyChallenge"], [href*="/daily"]', 'Daily Challenge Banner', viewportName, pageName);

      // Check Tutorial button (FAB)
      await checkElementVisibility(page, 'button[aria-label*="Tutorial"], button:has-text("Tutorial")', 'Tutorial Button', viewportName, pageName);

      // Check for overlapping elements
      const singlePlayerCard = page.locator('[href*="/singleplayer"]').first();
      const multiplayerCard = page.locator('[href*="/multiplayer"]').first();

      if (await singlePlayerCard.isVisible() && await multiplayerCard.isVisible()) {
        await checkElementOverlap(page, '[href*="/singleplayer"]', '[href*="/multiplayer"]', 'Single Player Card', 'Multiplayer Card', viewportName, pageName);
      }

      // Verify all buttons are clickable
      const allButtons = page.locator('button, a[href]');
      const buttonCount = await allButtons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const btn = allButtons.nth(i);
        if (await btn.isVisible()) {
          await checkButtonTouchTarget(page, `button:nth-of-type(${i + 1})`, `Button ${i + 1}`, viewportName, pageName);
        }
      }
    });
  }

  // Test Single Player Page across all viewports
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Single Player Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Single Player Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `singleplayer-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check configuration elements are visible
      await checkElementVisibility(page, 'button:has-text("Start"), button:has-text("Play"), [class*="ConfigWizard"]', 'Start/Config Area', viewportName, pageName);

      // Check difficulty selector if present
      const difficultyButtons = page.locator('[class*="difficulty"], button:has-text("Easy"), button:has-text("Medium"), button:has-text("Hard")');
      if (await difficultyButtons.first().isVisible()) {
        await checkButtonTouchTarget(page, 'button:has-text("Easy")', 'Easy Button', viewportName, pageName);
      }

      // Check timer/mode selection
      const modeButtons = page.locator('button:has-text("60s"), button:has-text("90s"), button:has-text("120s"), button:has-text("Practice")');
      if (await modeButtons.first().isVisible()) {
        await checkButtonTouchTarget(page, 'button:has-text("60s")', 'Timer Button', viewportName, pageName);
      }

      // Check language selector if present
      await checkElementVisibility(page, '[class*="language"], [role="combobox"]', 'Language Selector', viewportName, pageName);

      // Check back/navigation button
      await checkElementVisibility(page, 'button:has-text("Back"), a[href="/en"], button[aria-label*="back"]', 'Back Button', viewportName, pageName);
    });
  }

  // Test Multiplayer Page across all viewports
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Multiplayer Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/multiplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Multiplayer Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `multiplayer-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check Host/Join buttons
      await checkElementVisibility(page, 'button:has-text("Host"), button:has-text("Create")', 'Host Button', viewportName, pageName);
      await checkElementVisibility(page, 'button:has-text("Join"), [class*="join"]', 'Join Section', viewportName, pageName);

      // Check room code input if visible
      const roomCodeInput = page.locator('input[placeholder*="code"], input[placeholder*="Code"], input[name*="room"], input[name*="code"]');
      if (await roomCodeInput.first().isVisible()) {
        const box = await roomCodeInput.first().boundingBox();
        if (box && box.height < 44) {
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: 'Room code input height too small for comfortable touch',
            severity: 'Medium',
            element: 'Room code input',
            details: `Height: ${Math.round(box.height)}px`,
          });
        }
      }

      // Check username input if visible
      const usernameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"], input[name*="username"]');
      if (await usernameInput.first().isVisible()) {
        await checkButtonTouchTarget(page, 'input[placeholder*="name"]', 'Username Input', viewportName, pageName);
      }

      // Check active rooms list if visible
      await checkElementVisibility(page, '[class*="room"], [class*="Room"], [class*="ActiveRoom"]', 'Active Rooms Section', viewportName, pageName);
    });
  }

  // Test Leaderboard Page across all viewports
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Leaderboard Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/leaderboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Leaderboard Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `leaderboard-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check leaderboard title
      await checkElementVisibility(page, 'h1:has-text("Leaderboard"), h1:has-text("leaderboard")', 'Leaderboard Title', viewportName, pageName);

      // Check leaderboard table/list
      await checkElementVisibility(page, '[class*="leaderboard"], table, [role="table"], [class*="grid"]', 'Leaderboard Table', viewportName, pageName);

      // Check back button
      await checkElementVisibility(page, 'button:has-text("Back"), a[href="/en"]', 'Back Button', viewportName, pageName);

      // Check refresh button
      await checkElementVisibility(page, 'button[title*="Refresh"], button:has-text("Refresh")', 'Refresh Button', viewportName, pageName);
    });
  }

  // Test Profile/Settings Page
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Profile Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Profile Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `profile-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check profile content
      await checkElementVisibility(page, '[class*="profile"], [class*="Profile"], h1, h2', 'Profile Content', viewportName, pageName);
    });
  }

  // Test Rules Page
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Rules Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/rules');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Rules Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `rules-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check rules content
      await checkElementVisibility(page, 'h1, h2, [class*="rule"], article', 'Rules Content', viewportName, pageName);

      // Check back navigation
      await checkElementVisibility(page, 'button:has-text("Back"), a[href="/en"]', 'Back Button', viewportName, pageName);
    });
  }

  // Test Daily Challenge Page
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`Daily Challenge Page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/en/daily');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const pageName = 'Daily Challenge Page';
      const viewportName = viewport.name;

      await takeScreenshot(page, `daily-${key}`);

      // Check for horizontal scroll on mobile
      if (viewport.width <= 768) {
        await checkForHorizontalScroll(page, viewportName, pageName);
      }

      // Check daily challenge content
      await checkElementVisibility(page, 'h1, h2, [class*="daily"], [class*="Daily"]', 'Daily Challenge Content', viewportName, pageName);

      // Check play button
      await checkElementVisibility(page, 'button:has-text("Play"), button:has-text("Start"), button:has-text("Challenge")', 'Play Button', viewportName, pageName);
    });
  }

  // Mobile-specific interaction tests
  test('Mobile Portrait - Touch Interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check that mode cards are clickable
    const singlePlayerCard = page.locator('[href*="/singleplayer"]').first();
    await expect(singlePlayerCard).toBeVisible();

    // Try to click and navigate
    await singlePlayerCard.click();
    await page.waitForTimeout(500);

    // Should navigate to single player page
    expect(page.url()).toContain('/singleplayer');

    await takeScreenshot(page, 'mobile-navigation-test');
  });

  // Landscape mode specific tests
  test('Mobile Landscape - Layout Adaptation', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const viewportName = 'Mobile Landscape (667x375)';
    const pageName = 'Landing Page (Landscape)';

    await takeScreenshot(page, 'mobile-landscape-landing');

    // Check that layout adapts to landscape
    // Mode cards should be side by side in landscape
    const singlePlayerCard = page.locator('[href*="/singleplayer"]').first();
    const multiplayerCard = page.locator('[href*="/multiplayer"]').first();

    if (await singlePlayerCard.isVisible() && await multiplayerCard.isVisible()) {
      const box1 = await singlePlayerCard.boundingBox();
      const box2 = await multiplayerCard.boundingBox();

      if (box1 && box2) {
        // In landscape, cards should ideally be side by side
        const areSideBySide = Math.abs(box1.y - box2.y) < 50;
        if (areSideBySide) {
          // Good - cards are side by side
        } else {
          // Cards are stacked - might need layout adjustment for landscape
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: 'Mode cards are stacked in landscape mode instead of side by side',
            severity: 'Low',
            details: 'Consider horizontal layout for landscape orientation',
          });
        }
      }
    }

    // Navigate to singleplayer to test game layout
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'mobile-landscape-singleplayer');
  });

  // Button overlap and visibility stress test on smallest viewport
  test('Smallest Viewport (320x568) - Stress Test', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    const viewportName = 'Mobile Small (320x568)';

    // Test Landing Page
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'stress-test-landing');

    // Check all buttons fit within viewport
    const allButtons = page.locator('button, a[href]');
    const buttonCount = await allButtons.count();

    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) {
          if (box.x < 0 || box.x + box.width > 320) {
            issues.push({
              viewport: viewportName,
              page: 'Landing Page',
              issue: `Button extends beyond viewport`,
              severity: 'High',
              details: `Position: x=${Math.round(box.x)}, width=${Math.round(box.width)}`,
            });
          }
        }
      }
    }

    // Test Single Player Page
    await page.goto('/en/singleplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'stress-test-singleplayer');

    // Test Multiplayer Page
    await page.goto('/en/multiplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'stress-test-multiplayer');
  });

  // Form input accessibility tests
  test('Form Accessibility - All Viewports', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en/multiplayer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const viewportName = 'Mobile Medium (375x667)';
    const pageName = 'Multiplayer Page';

    // Check input labels/placeholders are visible
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        // Check if input has proper labeling
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        const id = await input.getAttribute('id');

        if (!ariaLabel && !placeholder) {
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: 'Input field lacks accessible label',
            severity: 'Medium',
            element: `input#${id || 'unknown'}`,
          });
        }

        // Check input is large enough for touch
        const box = await input.boundingBox();
        if (box && box.height < 44) {
          issues.push({
            viewport: viewportName,
            page: pageName,
            issue: `Input field too short for comfortable touch input`,
            severity: 'Medium',
            element: `input#${id || 'unknown'}`,
            details: `Height: ${Math.round(box.height)}px (minimum recommended: 44px)`,
          });
        }
      }
    }

    await takeScreenshot(page, 'form-accessibility-test');
  });

  // Modal and overlay tests
  test('Modal and Overlay Tests', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const viewportName = 'Mobile Medium (375x667)';

    // Try to open tutorial modal
    const tutorialBtn = page.locator('button:has-text("Tutorial"), button[aria-label*="Tutorial"]').first();
    if (await tutorialBtn.isVisible()) {
      await tutorialBtn.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'tutorial-modal-open');

      // Check modal is properly centered and visible
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').first();
      if (await modal.isVisible()) {
        const box = await modal.boundingBox();
        if (box) {
          // Check modal fits within viewport
          if (box.width > 375 || box.height > 667) {
            issues.push({
              viewport: viewportName,
              page: 'Tutorial Modal',
              issue: 'Modal exceeds viewport dimensions',
              severity: 'High',
              details: `Modal size: ${Math.round(box.width)}x${Math.round(box.height)}`,
            });
          }
        }

        // Check close button is accessible
        const closeBtn = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Got it"), [role="dialog"] button[aria-label*="close"]').first();
        if (await closeBtn.isVisible()) {
          await checkButtonTouchTarget(page, '[role="dialog"] button', 'Modal Close Button', viewportName, 'Tutorial Modal');
        }
      }
    }
  });

  // After all tests, output the comprehensive report
  test.afterAll(async () => {
    console.log('\n\n========================================');
    console.log('     COMPREHENSIVE UI TEST REPORT');
    console.log('========================================\n');

    if (issues.length === 0) {
      console.log('No issues found across all viewports and pages.');
    } else {
      // Group issues by severity
      const critical = issues.filter(i => i.severity === 'Critical');
      const high = issues.filter(i => i.severity === 'High');
      const medium = issues.filter(i => i.severity === 'Medium');
      const low = issues.filter(i => i.severity === 'Low');

      console.log(`Total Issues Found: ${issues.length}`);
      console.log(`  - Critical: ${critical.length}`);
      console.log(`  - High: ${high.length}`);
      console.log(`  - Medium: ${medium.length}`);
      console.log(`  - Low: ${low.length}\n`);

      // Print issues by severity
      if (critical.length > 0) {
        console.log('\n--- CRITICAL ISSUES ---');
        critical.forEach((issue, idx) => {
          console.log(`\n${idx + 1}. ${issue.issue}`);
          console.log(`   Viewport: ${issue.viewport}`);
          console.log(`   Page: ${issue.page}`);
          if (issue.element) console.log(`   Element: ${issue.element}`);
          if (issue.details) console.log(`   Details: ${issue.details}`);
        });
      }

      if (high.length > 0) {
        console.log('\n--- HIGH PRIORITY ISSUES ---');
        high.forEach((issue, idx) => {
          console.log(`\n${idx + 1}. ${issue.issue}`);
          console.log(`   Viewport: ${issue.viewport}`);
          console.log(`   Page: ${issue.page}`);
          if (issue.element) console.log(`   Element: ${issue.element}`);
          if (issue.details) console.log(`   Details: ${issue.details}`);
        });
      }

      if (medium.length > 0) {
        console.log('\n--- MEDIUM PRIORITY ISSUES ---');
        medium.forEach((issue, idx) => {
          console.log(`\n${idx + 1}. ${issue.issue}`);
          console.log(`   Viewport: ${issue.viewport}`);
          console.log(`   Page: ${issue.page}`);
          if (issue.element) console.log(`   Element: ${issue.element}`);
          if (issue.details) console.log(`   Details: ${issue.details}`);
        });
      }

      if (low.length > 0) {
        console.log('\n--- LOW PRIORITY ISSUES ---');
        low.forEach((issue, idx) => {
          console.log(`\n${idx + 1}. ${issue.issue}`);
          console.log(`   Viewport: ${issue.viewport}`);
          console.log(`   Page: ${issue.page}`);
          if (issue.element) console.log(`   Element: ${issue.element}`);
          if (issue.details) console.log(`   Details: ${issue.details}`);
        });
      }
    }

    console.log('\n========================================');
    console.log('          END OF REPORT');
    console.log('========================================\n');
  });
});
