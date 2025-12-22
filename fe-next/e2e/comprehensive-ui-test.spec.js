const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = path.join(__dirname, 'test-results', 'comprehensive-ui-tests');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Viewport configurations
const viewports = {
  desktop: { width: 1280, height: 800 },
  mobilePortrait: { width: 390, height: 844 },
  mobileLandscape: { width: 844, height: 390 }
};

// Helper function to take screenshots
async function captureScreenshot(page, name) {
  const timestamp = Date.now();
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: true
  });
  return filename;
}

// Helper function to wait for page load
async function waitForPageLoad(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    console.log('Network not idle, continuing anyway');
  });
  await page.waitForTimeout(1000); // Additional buffer for animations
}

test.describe('LexiClash Comprehensive UI Tests', () => {

  // Test 1: Landing Page
  test.describe('1. Landing Page Tests', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Landing Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        // Navigate to landing page
        await page.goto(`${BASE_URL}/en`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `landing-${viewportName}`);

        // Check page title
        await expect(page).toHaveTitle(/LexiClash/i);

        // Check header elements
        const header = page.locator('header, [role="banner"], nav').first();
        await expect(header).toBeVisible();

        // Check for logo
        const logo = page.locator('img[alt*="logo" i], img[alt*="LexiClash" i], h1, [aria-label*="logo" i]').first();
        if (await logo.isVisible()) {
          console.log(`✓ Logo found on ${viewportName}`);
        }

        // Check for Single Player button
        const singlePlayerBtn = page.locator('text=/single player/i, a[href*="singleplayer"], button:has-text("Single Player")').first();
        await expect(singlePlayerBtn).toBeVisible({ timeout: 5000 });
        console.log(`✓ Single Player button visible on ${viewportName}`);

        // Check for Multiplayer button
        const multiplayerBtn = page.locator('text=/multiplayer/i, a[href*="multiplayer"], button:has-text("Multiplayer")').first();
        await expect(multiplayerBtn).toBeVisible({ timeout: 5000 });
        console.log(`✓ Multiplayer button visible on ${viewportName}`);

        // Check for Neo-Brutalist design elements (bold borders, shadows)
        const bodyStyles = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const hasBoldBorders = buttons.some(btn => {
            const style = window.getComputedStyle(btn);
            return parseInt(style.borderWidth) >= 2;
          });
          return { hasBoldBorders };
        });
        console.log(`Neo-Brutalist elements check: ${JSON.stringify(bodyStyles)}`);

        // Check for language selector
        const langSelector = page.locator('[aria-label*="language" i], select, button:has-text("EN"), button:has-text("HE")').first();
        if (await langSelector.isVisible().catch(() => false)) {
          console.log(`✓ Language selector found on ${viewportName}`);
        }

        // Check responsive behavior
        const isMobile = viewportName.includes('mobile');
        console.log(`Viewport: ${viewportName}, Is Mobile: ${isMobile}`);
      });
    }

    test('Landing Page - Navigation functionality', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      // Test Single Player navigation
      const singlePlayerBtn = page.locator('text=/single player/i, a[href*="singleplayer"]').first();
      await singlePlayerBtn.click();
      await waitForPageLoad(page);
      await expect(page).toHaveURL(/singleplayer/);
      console.log('✓ Single Player navigation works');

      // Go back
      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      // Test Multiplayer navigation
      const multiplayerBtn = page.locator('text=/multiplayer/i, a[href*="multiplayer"]').first();
      await multiplayerBtn.click();
      await waitForPageLoad(page);
      await expect(page).toHaveURL(/multiplayer/);
      console.log('✓ Multiplayer navigation works');
    });
  });

  // Test 2: Single Player Setup Page
  test.describe('2. Single Player Setup Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Single Player Setup - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/singleplayer`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `singleplayer-${viewportName}`);

        // Check for mode selection options
        const modes = ['Solo vs Bots', 'Practice', 'Challenge'];
        for (const mode of modes) {
          const modeBtn = page.locator(`text=/.*${mode}.*/i, button:has-text("${mode}"), [aria-label*="${mode}" i]`).first();
          if (await modeBtn.isVisible().catch(() => false)) {
            console.log(`✓ Mode "${mode}" found on ${viewportName}`);
          } else {
            console.log(`⚠ Mode "${mode}" not visible on ${viewportName}`);
          }
        }

        // Check for difficulty settings
        const difficulties = ['Easy', 'Medium', 'Hard'];
        for (const difficulty of difficulties) {
          const diffBtn = page.locator(`text=/.*${difficulty}.*/i, button:has-text("${difficulty}"), [role="radio"]:has-text("${difficulty}")`).first();
          if (await diffBtn.isVisible().catch(() => false)) {
            console.log(`✓ Difficulty "${difficulty}" found on ${viewportName}`);
          }
        }

        // Check for timer options
        const timerOptions = ['2', '3', '5'];
        for (const timer of timerOptions) {
          const timerBtn = page.locator(`text=/.*${timer}.*min.*/i, button:has-text("${timer}"), [aria-label*="${timer} min" i]`).first();
          if (await timerBtn.isVisible().catch(() => false)) {
            console.log(`✓ Timer option "${timer} min" found on ${viewportName}`);
          }
        }

        // Check for Start Game button
        const startBtn = page.locator('text=/start.*game/i, button:has-text("Start"), button:has-text("Play")').first();
        if (await startBtn.isVisible().catch(() => false)) {
          console.log(`✓ Start game button found on ${viewportName}`);

          // Check if button is clickable
          const isEnabled = await startBtn.isEnabled();
          console.log(`  Button enabled: ${isEnabled}`);
        }

        // Check for language selection
        const langSelect = page.locator('select, [aria-label*="language" i], button:has-text("English"), button:has-text("Hebrew")').first();
        if (await langSelect.isVisible().catch(() => false)) {
          console.log(`✓ Language selector found on ${viewportName}`);
        }
      });
    }
  });

  // Test 3: Multiplayer Page
  test.describe('3. Multiplayer Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Multiplayer Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/multiplayer`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `multiplayer-${viewportName}`);

        // Check for Create Room / Join Room tabs
        const createRoomTab = page.locator('text=/create.*room/i, button:has-text("Create"), [role="tab"]:has-text("Create")').first();
        const joinRoomTab = page.locator('text=/join.*room/i, button:has-text("Join"), [role="tab"]:has-text("Join")').first();

        if (await createRoomTab.isVisible().catch(() => false)) {
          console.log(`✓ Create Room tab found on ${viewportName}`);
        }

        if (await joinRoomTab.isVisible().catch(() => false)) {
          console.log(`✓ Join Room tab found on ${viewportName}`);
        }

        // Check for room name input
        const roomNameInput = page.locator('input[type="text"], input[placeholder*="room" i], input[aria-label*="room" i]').first();
        if (await roomNameInput.isVisible().catch(() => false)) {
          console.log(`✓ Room name input found on ${viewportName}`);
        }

        // Check for language selection
        const langSelect = page.locator('select, [aria-label*="language" i]').first();
        if (await langSelect.isVisible().catch(() => false)) {
          console.log(`✓ Language selector found on ${viewportName}`);
        }

        // Check for available rooms list or create room button
        const createBtn = page.locator('button:has-text("Create"), button:has-text("Host")').first();
        if (await createBtn.isVisible().catch(() => false)) {
          console.log(`✓ Create/Host button found on ${viewportName}`);
        }
      });
    }
  });

  // Test 4: Profile Page
  test.describe('4. Profile Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Profile Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/profile`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `profile-${viewportName}`);

        // Check for AutoHideHeader in landscape mode
        const isLandscape = viewportName === 'mobileLandscape';
        if (isLandscape) {
          console.log('Testing AutoHideHeader behavior in landscape mode...');

          const header = page.locator('header, [role="banner"]').first();
          const isHeaderVisible = await header.isVisible().catch(() => false);
          console.log(`  Header initially visible: ${isHeaderVisible}`);

          // Wait for auto-hide (should hide after 3s)
          await page.waitForTimeout(3500);

          const headerAfterWait = await header.isVisible().catch(() => true);
          console.log(`  Header visible after 3.5s: ${headerAfterWait}`);

          if (!headerAfterWait) {
            console.log('✓ AutoHideHeader working - header auto-hid after 3s');
          }

          // Test if header reappears on interaction
          await page.mouse.move(viewport.width / 2, 10);
          await page.waitForTimeout(500);
          const headerAfterInteraction = await header.isVisible().catch(() => false);
          console.log(`  Header visible after interaction: ${headerAfterInteraction}`);
        }

        // Check for profile avatar
        const avatar = page.locator('img[alt*="avatar" i], img[alt*="profile" i], [aria-label*="avatar" i]').first();
        if (await avatar.isVisible().catch(() => false)) {
          console.log(`✓ Profile avatar found on ${viewportName}`);
        }

        // Check for stats display
        const statsElements = await page.locator('text=/games played/i, text=/wins/i, text=/score/i, text=/rank/i').count();
        console.log(`  Stats elements found: ${statsElements}`);

        // Check for sign in prompt (for unauthenticated users)
        const signInPrompt = page.locator('text=/sign in/i, button:has-text("Sign In"), text=/login/i').first();
        if (await signInPrompt.isVisible().catch(() => false)) {
          console.log(`  Sign in prompt visible (user not authenticated) on ${viewportName}`);
        } else {
          console.log(`  User appears to be authenticated on ${viewportName}`);
        }
      });
    }
  });

  // Test 5: Leaderboard Page
  test.describe('5. Leaderboard Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Leaderboard Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/leaderboard`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `leaderboard-${viewportName}`);

        // Check for AutoHideHeader in landscape mode
        const isLandscape = viewportName === 'mobileLandscape';
        if (isLandscape) {
          console.log('Testing AutoHideHeader behavior in landscape mode...');

          const header = page.locator('header, [role="banner"]').first();
          const isHeaderVisible = await header.isVisible().catch(() => false);
          console.log(`  Header initially visible: ${isHeaderVisible}`);

          // Wait for auto-hide
          await page.waitForTimeout(3500);

          const headerAfterWait = await header.isVisible().catch(() => true);
          console.log(`  Header visible after 3.5s: ${headerAfterWait}`);
        }

        // Check for leaderboard entries
        const leaderboardRows = await page.locator('table tr, [role="row"], li, .leaderboard-entry').count();
        console.log(`  Leaderboard entries found: ${leaderboardRows}`);

        // Check for rank indicators
        const rankElements = await page.locator('text=/rank/i, text=/#1/i, text=/#2/i, th:has-text("Rank")').count();
        console.log(`  Rank indicators found: ${rankElements}`);

        // Check for back button
        const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), [aria-label*="back" i]').first();
        if (await backBtn.isVisible().catch(() => false)) {
          console.log(`✓ Back button found on ${viewportName}`);
        }
      });
    }
  });

  // Test 6: Rules Page
  test.describe('6. Rules Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Rules Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/rules`);
        await waitForPageLoad(page);

        // Capture screenshot
        await captureScreenshot(page, `rules-${viewportName}`);

        // Check for content readability
        const textContent = await page.textContent('body');
        const hasContent = textContent && textContent.length > 100;
        console.log(`  Content length: ${textContent?.length || 0} characters`);
        console.log(`  Has substantial content: ${hasContent}`);

        // Check for navigation back button
        const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), [aria-label*="back" i]').first();
        if (await backBtn.isVisible().catch(() => false)) {
          console.log(`✓ Back button found on ${viewportName}`);
        }

        // Check text contrast and readability
        const contrastInfo = await page.evaluate(() => {
          const body = document.body;
          const style = window.getComputedStyle(body);
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize
          };
        });
        console.log(`  Text styling: ${JSON.stringify(contrastInfo)}`);
      });
    }
  });

  // Accessibility Tests
  test.describe('7. Accessibility Tests', () => {

    test('Accessibility - Touch targets on mobile', async ({ page }) => {
      await page.setViewportSize(viewports.mobilePortrait);

      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      // Check button sizes
      const buttonSizes = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
        return buttons.map(btn => {
          const rect = btn.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            text: btn.textContent?.trim().substring(0, 30)
          };
        });
      });

      console.log('Touch target sizes:');
      buttonSizes.forEach(size => {
        const meetsMinSize = size.width >= 44 && size.height >= 44;
        console.log(`  ${size.text}: ${size.width.toFixed(0)}x${size.height.toFixed(0)} ${meetsMinSize ? '✓' : '⚠ (too small)'}`);
      });
    });

    test('Accessibility - ARIA labels', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);

      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      // Check for ARIA labels
      const ariaElements = await page.evaluate(() => {
        const elements = {
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          ariaDescriptions: document.querySelectorAll('[aria-describedby]').length,
          landmarks: document.querySelectorAll('[role="navigation"], [role="main"], [role="banner"]').length
        };
        return elements;
      });

      console.log('ARIA elements:', ariaElements);
    });
  });

  // Performance Tests
  test.describe('8. Performance Tests', () => {

    test('Performance - Page load times', async ({ page }) => {
      const pages = [
        '/en',
        '/en/singleplayer',
        '/en/multiplayer',
        '/en/profile',
        '/en/leaderboard',
        '/en/rules'
      ];

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pagePath}`);
        await waitForPageLoad(page);
        const loadTime = Date.now() - startTime;

        console.log(`${pagePath}: ${loadTime}ms ${loadTime < 3000 ? '✓' : '⚠ (slow)'}`);
      }
    });
  });
});
