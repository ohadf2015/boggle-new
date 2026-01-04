/**
 * Standalone Landscape UI Testing Script
 * Run with: npx tsx scripts/landscape-ui-test.ts
 *
 * This script performs comprehensive landscape mode testing
 * without relying on Playwright's webServer config.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/tmp/landscape-ui-test-screenshots';

// Screen sizes to test
const VIEWPORTS = {
  // Mobile landscape (height <= 600px triggers landscape mode in useMobileLandscape hook)
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

function logIssue(issue: UIIssue) {
  issues.push(issue);
  const severityColor = {
    critical: '\x1b[31m', // Red
    major: '\x1b[33m', // Yellow
    minor: '\x1b[36m', // Cyan
    cosmetic: '\x1b[37m', // White
  };
  console.log(`${severityColor[issue.severity]}[${issue.severity.toUpperCase()}]\x1b[0m ${issue.screen} (${issue.viewport}): ${issue.description}`);
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function screenshot(page: Page, name: string): Promise<string> {
  await ensureDir(SCREENSHOT_DIR);
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filepath;
}

async function checkOverflow(page: Page, selector: string): Promise<{ x: boolean; y: boolean }> {
  try {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { x: false, y: false };
      return {
        x: el.scrollWidth > el.clientWidth,
        y: el.scrollHeight > el.clientHeight,
      };
    }, selector);
  } catch {
    return { x: false, y: false };
  }
}

async function checkElementOverlap(page: Page, sel1: string, sel2: string): Promise<boolean> {
  try {
    const box1 = await page.locator(sel1).first().boundingBox();
    const box2 = await page.locator(sel2).first().boundingBox();
    if (!box1 || !box2) return false;

    return !(
      box1.x + box1.width < box2.x ||
      box2.x + box2.width < box1.x ||
      box1.y + box1.height < box2.y ||
      box2.y + box2.height < box1.y
    );
  } catch {
    return false;
  }
}

async function isElementFullyVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const box = await page.locator(selector).first().boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) return false;
    return box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
  } catch {
    return false;
  }
}

// ==================== TEST FUNCTIONS ====================

async function testLandingPage(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Landing Page at ${viewport.name} (${viewport.width}x${viewport.height})...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const screenshotPath = await screenshot(page, `landing-${viewport.width}x${viewport.height}`);

  // Check for horizontal overflow
  const overflow = await checkOverflow(page, 'body');
  if (overflow.x) {
    logIssue({
      severity: 'major',
      screen: 'Landing',
      viewport: `${viewport.width}x${viewport.height}`,
      description: 'Page has horizontal scroll (content overflow)',
      element: 'body',
      screenshotPath,
    });
  }

  // Check mode cards
  const multiplayerCard = page.locator('a[href*="multiplayer"]').first();
  const singleplayerCard = page.locator('a[href*="singleplayer"]').first();

  if (await multiplayerCard.isVisible() && await singleplayerCard.isVisible()) {
    const overlap = await checkElementOverlap(page, 'a[href*="multiplayer"]', 'a[href*="singleplayer"]');
    if (overlap) {
      logIssue({
        severity: 'major',
        screen: 'Landing',
        viewport: `${viewport.width}x${viewport.height}`,
        description: 'Mode cards are overlapping',
        element: 'ModeCards',
        screenshotPath,
      });
    }

    // Check card sizes for touch targets
    const mpBox = await multiplayerCard.boundingBox();
    if (mpBox && (mpBox.width < 100 || mpBox.height < 80)) {
      logIssue({
        severity: 'minor',
        screen: 'Landing',
        viewport: `${viewport.width}x${viewport.height}`,
        description: `Mode card is small (${mpBox.width}x${mpBox.height})`,
        element: 'ModeCard',
        screenshotPath,
      });
    }
  }

  // Check Tutorial FAB position
  const tutorialFab = page.locator('button[aria-label*="Tutorial"]').first();
  if (await tutorialFab.isVisible().catch(() => false)) {
    const fabBox = await tutorialFab.boundingBox();
    if (fabBox && (fabBox.x + fabBox.width > viewport.width || fabBox.y + fabBox.height > viewport.height)) {
      logIssue({
        severity: 'major',
        screen: 'Landing',
        viewport: `${viewport.width}x${viewport.height}`,
        description: 'Tutorial FAB extends beyond viewport',
        element: 'TutorialFAB',
        screenshotPath,
      });
    }
  }

  // Check header height in landscape
  const header = page.locator('header').first();
  if (await header.isVisible().catch(() => false)) {
    const headerBox = await header.boundingBox();
    if (headerBox && headerBox.height > 80 && viewport.height <= 600) {
      logIssue({
        severity: 'minor',
        screen: 'Landing',
        viewport: `${viewport.width}x${viewport.height}`,
        description: `Header too tall for landscape (${headerBox.height}px)`,
        element: 'Header',
        suggestion: 'Use compact header in landscape mode',
        screenshotPath,
      });
    }
  }

  console.log(`    [OK] Landing page tested`);
}

async function testSinglePlayerSetup(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Single Player Setup at ${viewport.name}...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/singleplayer`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const screenshotPath = await screenshot(page, `singleplayer-setup-${viewport.width}x${viewport.height}`);

  // Check for Start button visibility
  const startButton = page.locator('button:has-text("Start"), button:has-text("Play")').first();
  if (await startButton.isVisible().catch(() => false)) {
    const isVisible = await isElementFullyVisible(page, 'button:has-text("Start"), button:has-text("Play")');
    if (!isVisible) {
      logIssue({
        severity: 'critical',
        screen: 'SinglePlayer Setup',
        viewport: `${viewport.width}x${viewport.height}`,
        description: 'Start button not fully visible (may require scroll)',
        element: 'StartButton',
        suggestion: 'Ensure CTA is always visible in landscape',
        screenshotPath,
      });
    }
  }

  // Check form inputs
  const inputs = page.locator('input, select');
  const inputCount = await inputs.count();
  for (let i = 0; i < Math.min(inputCount, 3); i++) {
    const input = inputs.nth(i);
    if (await input.isVisible().catch(() => false)) {
      const box = await input.boundingBox();
      if (box && box.height < 40) {
        logIssue({
          severity: 'minor',
          screen: 'SinglePlayer Setup',
          viewport: `${viewport.width}x${viewport.height}`,
          description: `Form input height ${box.height}px (< 40px)`,
          element: 'FormInput',
          screenshotPath,
        });
        break;
      }
    }
  }

  console.log(`    [OK] Single player setup tested`);
}

async function testSinglePlayerGame(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Single Player Game at ${viewport.name}...`);

  // Clear tutorial flag
  await page.goto(`${BASE_URL}/en`, { timeout: 60000 });
  await page.evaluate(() => localStorage.setItem('landscape-tutorial-seen', 'true'));

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/singleplayer`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');

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

  await page.waitForTimeout(3000);

  const screenshotPath = await screenshot(page, `singleplayer-game-${viewport.width}x${viewport.height}`);

  // Dismiss tutorial if visible
  const gotIt = page.locator('button:has-text("Got it!")');
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(500);
  }

  // Check grid
  const grid = page.locator('[class*="GridComponent"], [class*="grid-container"]').first();
  if (await grid.isVisible().catch(() => false)) {
    const gridBox = await grid.boundingBox();
    if (gridBox) {
      const gridArea = gridBox.width * gridBox.height;
      const viewportArea = viewport.width * viewport.height;
      const occupancy = (gridArea / viewportArea) * 100;

      if (occupancy < 20) {
        logIssue({
          severity: 'major',
          screen: 'SinglePlayer Game',
          viewport: `${viewport.width}x${viewport.height}`,
          description: `Grid too small (${occupancy.toFixed(1)}% of viewport)`,
          element: 'Grid',
          suggestion: 'Maximize grid in landscape',
          screenshotPath,
        });
      }

      console.log(`    Grid occupies ${occupancy.toFixed(1)}% of viewport`);
    }
  }

  // Check control button overlap
  const pauseBtn = page.locator('button[aria-label*="Pause"], button[aria-label*="Finish"]').first();
  const quitBtn = page.locator('button[aria-label*="Quit"]').first();

  if (await pauseBtn.isVisible().catch(() => false) && await quitBtn.isVisible().catch(() => false)) {
    const pauseBox = await pauseBtn.boundingBox();
    const quitBox = await quitBtn.boundingBox();

    if (pauseBox && quitBox) {
      // Check for overlap
      const overlap = !(
        pauseBox.x + pauseBox.width < quitBox.x ||
        quitBox.x + quitBox.width < pauseBox.x ||
        pauseBox.y + pauseBox.height < quitBox.y ||
        quitBox.y + quitBox.height < pauseBox.y
      );

      if (overlap) {
        logIssue({
          severity: 'critical',
          screen: 'SinglePlayer Game',
          viewport: `${viewport.width}x${viewport.height}`,
          description: 'Pause and Quit buttons overlap',
          element: 'ControlButtons',
          screenshotPath,
        });
      }

      // Check button sizes
      if (pauseBox.width < 44 || pauseBox.height < 44) {
        logIssue({
          severity: 'major',
          screen: 'SinglePlayer Game',
          viewport: `${viewport.width}x${viewport.height}`,
          description: `Pause button too small (${pauseBox.width}x${pauseBox.height})`,
          element: 'PauseButton',
          screenshotPath,
        });
      }
    }
  }

  // Check side panels in mobile landscape
  if (viewport.height <= 600) {
    const leftPanel = page.locator('.landscape-side-panel').first();
    const rightPanel = page.locator('.landscape-side-panel').last();

    if (await leftPanel.isVisible().catch(() => false)) {
      const leftBox = await leftPanel.boundingBox();
      const rightBox = await rightPanel.boundingBox();

      if (leftBox && rightBox) {
        // Check if panels are too wide
        const totalPanelWidth = leftBox.width + rightBox.width;
        const panelPercent = (totalPanelWidth / viewport.width) * 100;

        if (panelPercent > 50) {
          logIssue({
            severity: 'major',
            screen: 'SinglePlayer Game',
            viewport: `${viewport.width}x${viewport.height}`,
            description: `Side panels take ${panelPercent.toFixed(1)}% of width`,
            element: 'SidePanels',
            suggestion: 'Reduce panel widths for more grid space',
            screenshotPath,
          });
        }
      }
    }
  }

  console.log(`    [OK] Single player game tested`);
}

async function testMultiplayerPage(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Multiplayer Page at ${viewport.name}...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/multiplayer`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const screenshotPath = await screenshot(page, `multiplayer-${viewport.width}x${viewport.height}`);

  // Check Host/Join buttons
  const hostBtn = page.locator('button:has-text("Host")').first();
  const joinBtn = page.locator('button:has-text("Join")').first();

  if (await hostBtn.isVisible().catch(() => false)) {
    const hostBox = await hostBtn.boundingBox();
    if (hostBox && (hostBox.width < 44 || hostBox.height < 44)) {
      logIssue({
        severity: 'major',
        screen: 'Multiplayer',
        viewport: `${viewport.width}x${viewport.height}`,
        description: `Host button too small (${hostBox.width}x${hostBox.height})`,
        element: 'HostButton',
        screenshotPath,
      });
    }
  }

  // Check room code input
  const codeInput = page.locator('input[placeholder*="code" i], input[name*="room" i]').first();
  if (await codeInput.isVisible().catch(() => false)) {
    const inputBox = await codeInput.boundingBox();
    if (inputBox && inputBox.height < 44) {
      logIssue({
        severity: 'major',
        screen: 'Multiplayer',
        viewport: `${viewport.width}x${viewport.height}`,
        description: `Room code input too small (${inputBox.height}px)`,
        element: 'RoomCodeInput',
        screenshotPath,
      });
    }
  }

  // Check overflow
  const overflow = await checkOverflow(page, 'body');
  if (overflow.x) {
    logIssue({
      severity: 'major',
      screen: 'Multiplayer',
      viewport: `${viewport.width}x${viewport.height}`,
      description: 'Page has horizontal scroll',
      element: 'body',
      screenshotPath,
    });
  }

  console.log(`    [OK] Multiplayer page tested`);
}

async function testLeaderboard(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Leaderboard at ${viewport.name}...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/leaderboard`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const screenshotPath = await screenshot(page, `leaderboard-${viewport.width}x${viewport.height}`);

  // Check for horizontal overflow
  const overflow = await checkOverflow(page, 'body');
  if (overflow.x) {
    logIssue({
      severity: 'major',
      screen: 'Leaderboard',
      viewport: `${viewport.width}x${viewport.height}`,
      description: 'Page has horizontal scroll',
      element: 'body',
      screenshotPath,
    });
  }

  console.log(`    [OK] Leaderboard tested`);
}

async function testRulesPage(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Rules Page at ${viewport.name}...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/rules`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const screenshotPath = await screenshot(page, `rules-${viewport.width}x${viewport.height}`);

  // Check for horizontal overflow
  const overflow = await checkOverflow(page, 'body');
  if (overflow.x) {
    logIssue({
      severity: 'major',
      screen: 'Rules',
      viewport: `${viewport.width}x${viewport.height}`,
      description: 'Page has horizontal scroll',
      element: 'body',
      screenshotPath,
    });
  }

  // Check images
  const images = page.locator('img');
  const imgCount = await images.count();
  for (let i = 0; i < Math.min(imgCount, 3); i++) {
    const img = images.nth(i);
    if (await img.isVisible().catch(() => false)) {
      const box = await img.boundingBox();
      if (box && box.width > viewport.width - 20) {
        logIssue({
          severity: 'minor',
          screen: 'Rules',
          viewport: `${viewport.width}x${viewport.height}`,
          description: 'Image extends to viewport edge',
          element: 'Image',
          suggestion: 'Add horizontal padding',
          screenshotPath,
        });
        break;
      }
    }
  }

  console.log(`    [OK] Rules page tested`);
}

async function testProfilePage(page: Page, viewport: { width: number; height: number; name: string }) {
  console.log(`\n  Testing Profile Page at ${viewport.name}...`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE_URL}/en/profile`, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const screenshotPath = await screenshot(page, `profile-${viewport.width}x${viewport.height}`);

  // Check for horizontal overflow
  const overflow = await checkOverflow(page, 'body');
  if (overflow.x) {
    logIssue({
      severity: 'major',
      screen: 'Profile',
      viewport: `${viewport.width}x${viewport.height}`,
      description: 'Page has horizontal scroll',
      element: 'body',
      screenshotPath,
    });
  }

  console.log(`    [OK] Profile page tested`);
}

async function testLandscapeIndicator(page: Page) {
  console.log(`\n  Testing LandscapeIndicator component...`);

  // Clear any dismissal
  await page.goto(`${BASE_URL}/en`, { timeout: 60000 });
  await page.evaluate(() => localStorage.removeItem('boggle_landscape_dismissed'));

  // Set portrait mode (should show indicator)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload({ timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const screenshotPath = await screenshot(page, 'landscape-indicator-portrait');

  // Look for the indicator
  const indicator = page.locator('text=/rotate.*landscape|rotate for better/i').first();
  const isVisible = await indicator.isVisible().catch(() => false);

  if (isVisible) {
    console.log(`    LandscapeIndicator visible in portrait mode - CORRECT`);

    // Test dismiss functionality
    const dismissBtn = page.locator('button[aria-label*="Dismiss"]').first();
    if (await dismissBtn.isVisible().catch(() => false)) {
      await dismissBtn.click();
      await page.waitForTimeout(500);

      const stillVisible = await indicator.isVisible().catch(() => false);
      if (stillVisible) {
        logIssue({
          severity: 'major',
          screen: 'LandscapeIndicator',
          viewport: '375x667 (Portrait)',
          description: 'Dismiss button does not hide indicator',
          element: 'DismissButton',
          screenshotPath,
        });
      }
    }
  } else {
    // Check if it's because FEATURE_ENABLED is true and isMobile && isPortrait
    console.log(`    LandscapeIndicator not visible (may be disabled or conditions not met)`);
  }

  // Set landscape mode (should NOT show indicator)
  await page.evaluate(() => localStorage.removeItem('boggle_landscape_dismissed'));
  await page.setViewportSize({ width: 667, height: 375 });
  await page.reload({ timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const landscapeScreenshot = await screenshot(page, 'landscape-indicator-landscape');

  const indicatorInLandscape = page.locator('text=/rotate.*landscape|rotate for better/i').first();
  const isVisibleInLandscape = await indicatorInLandscape.isVisible().catch(() => false);

  if (isVisibleInLandscape) {
    logIssue({
      severity: 'major',
      screen: 'LandscapeIndicator',
      viewport: '667x375 (Landscape)',
      description: 'Indicator visible in landscape mode (should only show in portrait)',
      element: 'LandscapeIndicator',
      screenshotPath: landscapeScreenshot,
    });
  } else {
    console.log(`    LandscapeIndicator correctly hidden in landscape mode`);
  }

  console.log(`    [OK] LandscapeIndicator tested`);
}

// ==================== MAIN ====================

async function main() {
  console.log('='.repeat(60));
  console.log('COMPREHENSIVE LANDSCAPE MODE UI TESTING');
  console.log('='.repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Screenshot Directory: ${SCREENSHOT_DIR}\n`);

  await ensureDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test Landing Page across all viewports
    console.log('\n' + '='.repeat(40));
    console.log('1. LANDING PAGE - ALL VIEWPORTS');
    console.log('='.repeat(40));
    for (const viewport of Object.values(VIEWPORTS)) {
      await testLandingPage(page, viewport);
    }

    // Test Single Player (representative viewports)
    console.log('\n' + '='.repeat(40));
    console.log('2. SINGLE PLAYER MODE');
    console.log('='.repeat(40));
    const spViewports = [
      VIEWPORTS.mobileLandscape844x390,
      VIEWPORTS.tabletLandscape1024x768,
      VIEWPORTS.desktop1280x720,
    ];
    for (const viewport of spViewports) {
      await testSinglePlayerSetup(page, viewport);
      await testSinglePlayerGame(page, viewport);
    }

    // Test Multiplayer
    console.log('\n' + '='.repeat(40));
    console.log('3. MULTIPLAYER PAGE');
    console.log('='.repeat(40));
    const mpViewports = [
      VIEWPORTS.mobileLandscape844x390,
      VIEWPORTS.tabletLandscape1024x768,
    ];
    for (const viewport of mpViewports) {
      await testMultiplayerPage(page, viewport);
    }

    // Test Leaderboard
    console.log('\n' + '='.repeat(40));
    console.log('4. LEADERBOARD');
    console.log('='.repeat(40));
    for (const viewport of [VIEWPORTS.mobileLandscape844x390, VIEWPORTS.desktop1280x720]) {
      await testLeaderboard(page, viewport);
    }

    // Test Rules
    console.log('\n' + '='.repeat(40));
    console.log('5. RULES PAGE');
    console.log('='.repeat(40));
    for (const viewport of [VIEWPORTS.mobileLandscape844x390, VIEWPORTS.tabletLandscape1024x768]) {
      await testRulesPage(page, viewport);
    }

    // Test Profile
    console.log('\n' + '='.repeat(40));
    console.log('6. PROFILE PAGE');
    console.log('='.repeat(40));
    for (const viewport of [VIEWPORTS.mobileLandscape844x390, VIEWPORTS.tabletLandscape1024x768]) {
      await testProfilePage(page, viewport);
    }

    // Test LandscapeIndicator
    console.log('\n' + '='.repeat(40));
    console.log('7. LANDSCAPE INDICATOR COMPONENT');
    console.log('='.repeat(40));
    await testLandscapeIndicator(page);

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('UI TESTING SUMMARY REPORT');
  console.log('='.repeat(60));

  const critical = issues.filter(i => i.severity === 'critical');
  const major = issues.filter(i => i.severity === 'major');
  const minor = issues.filter(i => i.severity === 'minor');
  const cosmetic = issues.filter(i => i.severity === 'cosmetic');

  console.log(`\nTotal Issues Found: ${issues.length}`);
  console.log(`  Critical: ${critical.length}`);
  console.log(`  Major: ${major.length}`);
  console.log(`  Minor: ${minor.length}`);
  console.log(`  Cosmetic: ${cosmetic.length}`);

  if (critical.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('CRITICAL ISSUES:');
    console.log('-'.repeat(40));
    critical.forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${issue.description}`);
      console.log(`     Screen: ${issue.screen}`);
      console.log(`     Viewport: ${issue.viewport}`);
      if (issue.element) console.log(`     Element: ${issue.element}`);
      if (issue.suggestion) console.log(`     Suggestion: ${issue.suggestion}`);
    });
  }

  if (major.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('MAJOR ISSUES:');
    console.log('-'.repeat(40));
    major.forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${issue.description}`);
      console.log(`     Screen: ${issue.screen}`);
      console.log(`     Viewport: ${issue.viewport}`);
      if (issue.element) console.log(`     Element: ${issue.element}`);
      if (issue.suggestion) console.log(`     Suggestion: ${issue.suggestion}`);
    });
  }

  if (minor.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('MINOR ISSUES:');
    console.log('-'.repeat(40));
    minor.forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${issue.description}`);
      console.log(`     Screen: ${issue.screen} | Viewport: ${issue.viewport}`);
    });
  }

  if (cosmetic.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('COSMETIC ISSUES:');
    console.log('-'.repeat(40));
    cosmetic.forEach((issue, i) => {
      console.log(`\n  ${i + 1}. ${issue.description}`);
      console.log(`     Screen: ${issue.screen} | Viewport: ${issue.viewport}`);
    });
  }

  // Save report to file
  const reportPath = path.join(SCREENSHOT_DIR, 'ui-issues-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  console.log(`\n\nFull report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(60));

  // Exit with error code if critical issues found
  if (critical.length > 0) {
    process.exit(1);
  }
}

main();
