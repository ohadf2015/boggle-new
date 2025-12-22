const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'comprehensive-ui-tests');

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
  await page.waitForTimeout(1000);
}

test.describe('LexiClash Comprehensive UI Tests', () => {

  // Test 1: Landing Page
  test.describe('1. Landing Page Tests', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Landing Page - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en`);
        await waitForPageLoad(page);

        await captureScreenshot(page, `landing-${viewportName}`);

        // Check page title
        const title = await page.title();
        console.log(`Page title: ${title}`);

        // Check header elements
        const header = page.locator('header').first();
        const hasHeader = await header.isVisible().catch(() => false);
        console.log(`Header visible: ${hasHeader}`);

        // Check for logo/brand text
        const logo = page.locator('h1, [class*="logo"]').first();
        const hasLogo = await logo.isVisible().catch(() => false);
        if (hasLogo) {
          const logoText = await logo.textContent();
          console.log(`✓ Logo found on ${viewportName}: ${logoText}`);
        }

        // Check for navigation buttons
        const buttons = await page.locator('button, a[href]').all();
        console.log(`Total interactive elements: ${buttons.length}`);

        // Look for Single Player link/button
        const singlePlayerLink = page.locator('a[href*="singleplayer"]').first();
        const hasSinglePlayer = await singlePlayerLink.isVisible().catch(() => false);
        if (hasSinglePlayer) {
          console.log(`✓ Single Player button visible on ${viewportName}`);
        }

        // Look for Multiplayer link/button
        const multiplayerLink = page.locator('a[href*="multiplayer"]').first();
        const hasMultiplayer = await multiplayerLink.isVisible().catch(() => false);
        if (hasMultiplayer) {
          console.log(`✓ Multiplayer button visible on ${viewportName}`);
        }

        // Check for Neo-Brutalist design elements
        const designInfo = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const shadows = buttons.map(btn => window.getComputedStyle(btn).boxShadow);
          const borders = buttons.map(btn => window.getComputedStyle(btn).borderWidth);

          const hasShadows = shadows.some(s => s !== 'none');
          const hasBorders = borders.some(b => parseInt(b) >= 2);

          return { hasShadows, hasBorders, sampleShadow: shadows[0], sampleBorder: borders[0] };
        });
        console.log(`Design elements: ${JSON.stringify(designInfo)}`);

        // Check for language selector
        const langButtons = await page.locator('button').all();
        for (const btn of langButtons) {
          const text = await btn.textContent().catch(() => '');
          if (text.includes('🇺🇸') || text.includes('🇮🇱') || text.includes('EN') || text.includes('HE')) {
            console.log(`✓ Language selector found on ${viewportName}`);
            break;
          }
        }
      });
    }

    test('Landing Page - Navigation functionality', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      // Test Single Player navigation
      const singlePlayerBtn = page.locator('a[href*="singleplayer"]').first();
      const hasSinglePlayer = await singlePlayerBtn.isVisible().catch(() => false);
      if (hasSinglePlayer) {
        await singlePlayerBtn.click();
        await waitForPageLoad(page);
        const url = page.url();
        console.log(`✓ Single Player navigation works: ${url}`);
        await page.goto(`${BASE_URL}/en`);
        await waitForPageLoad(page);
      }

      // Test Multiplayer navigation
      const multiplayerBtn = page.locator('a[href*="multiplayer"]').first();
      const hasMultiplayer = await multiplayerBtn.isVisible().catch(() => false);
      if (hasMultiplayer) {
        await multiplayerBtn.click();
        await waitForPageLoad(page);
        const url = page.url();
        console.log(`✓ Multiplayer navigation works: ${url}`);
      }
    });
  });

  // Test 2: Single Player Setup Page
  test.describe('2. Single Player Setup Page', () => {

    for (const [viewportName, viewport] of Object.entries(viewports)) {
      test(`Single Player Setup - ${viewportName}`, async ({ page }) => {
        await page.setViewportSize(viewport);

        await page.goto(`${BASE_URL}/en/singleplayer`);
        await waitForPageLoad(page);

        await captureScreenshot(page, `singleplayer-${viewportName}`);

        // Get all text content to check for modes
        const bodyText = await page.textContent('body');

        const modes = ['Solo', 'Bot', 'Practice', 'Challenge'];
        modes.forEach(mode => {
          if (bodyText.toLowerCase().includes(mode.toLowerCase())) {
            console.log(`✓ Mode "${mode}" found in content on ${viewportName}`);
          }
        });

        const difficulties = ['Easy', 'Medium', 'Hard'];
        difficulties.forEach(difficulty => {
          if (bodyText.toLowerCase().includes(difficulty.toLowerCase())) {
            console.log(`✓ Difficulty "${difficulty}" found on ${viewportName}`);
          }
        });

        // Check for interactive elements
        const buttons = await page.locator('button').all();
        console.log(`Total buttons on single player page: ${buttons.length}`);

        // Check for Start/Play button
        for (const btn of buttons) {
          const text = await btn.textContent().catch(() => '');
          if (text.toLowerCase().includes('start') || text.toLowerCase().includes('play')) {
            console.log(`✓ Start game button found on ${viewportName}: "${text}"`);
            break;
          }
        }

        // Check for selects/dropdowns
        const selects = await page.locator('select').count();
        console.log(`Dropdown selects found: ${selects}`);
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

        await captureScreenshot(page, `multiplayer-${viewportName}`);

        const bodyText = await page.textContent('body');

        // Check for Create/Join room functionality
        if (bodyText.toLowerCase().includes('create') || bodyText.toLowerCase().includes('host')) {
          console.log(`✓ Create room option found on ${viewportName}`);
        }

        if (bodyText.toLowerCase().includes('join')) {
          console.log(`✓ Join room option found on ${viewportName}`);
        }

        // Check for inputs
        const inputs = await page.locator('input[type="text"]').count();
        console.log(`Text inputs found: ${inputs}`);

        // Check for buttons
        const buttons = await page.locator('button').count();
        console.log(`Buttons found: ${buttons}`);
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

        await captureScreenshot(page, `profile-${viewportName}`);

        const isLandscape = viewportName === 'mobileLandscape';
        if (isLandscape) {
          console.log('Testing AutoHideHeader behavior in landscape mode...');

          const header = page.locator('header').first();
          const isHeaderVisible = await header.isVisible().catch(() => false);
          console.log(`  Header initially visible: ${isHeaderVisible}`);

          await page.waitForTimeout(3500);

          const headerAfterWait = await header.isVisible().catch(() => true);
          console.log(`  Header visible after 3.5s: ${headerAfterWait}`);

          if (!headerAfterWait) {
            console.log('✓ AutoHideHeader working - header auto-hid after 3s');
          }

          await page.mouse.move(viewport.width / 2, 10);
          await page.waitForTimeout(500);
          const headerAfterInteraction = await header.isVisible().catch(() => false);
          console.log(`  Header visible after interaction: ${headerAfterInteraction}`);
        }

        const bodyText = await page.textContent('body');

        if (bodyText.toLowerCase().includes('sign in') || bodyText.toLowerCase().includes('login')) {
          console.log(`  Sign in prompt visible (user not authenticated) on ${viewportName}`);
        } else {
          console.log(`  User appears to be authenticated on ${viewportName}`);
        }

        // Check for profile elements
        const images = await page.locator('img').count();
        console.log(`  Images on profile page: ${images}`);
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

        await captureScreenshot(page, `leaderboard-${viewportName}`);

        const isLandscape = viewportName === 'mobileLandscape';
        if (isLandscape) {
          console.log('Testing AutoHideHeader behavior in landscape mode...');

          const header = page.locator('header').first();
          const isHeaderVisible = await header.isVisible().catch(() => false);
          console.log(`  Header initially visible: ${isHeaderVisible}`);

          await page.waitForTimeout(3500);

          const headerAfterWait = await header.isVisible().catch(() => true);
          console.log(`  Header visible after 3.5s: ${headerAfterWait}`);
        }

        // Check for leaderboard content
        const tables = await page.locator('table').count();
        const lists = await page.locator('ul, ol').count();
        console.log(`  Tables: ${tables}, Lists: ${lists}`);

        const bodyText = await page.textContent('body');
        if (bodyText.toLowerCase().includes('rank')) {
          console.log(`✓ Rank information found on ${viewportName}`);
        }

        // Check for back button
        const buttons = await page.locator('button').all();
        for (const btn of buttons) {
          const text = await btn.textContent().catch(() => '');
          if (text.toLowerCase().includes('back')) {
            console.log(`✓ Back button found on ${viewportName}`);
            break;
          }
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

        await captureScreenshot(page, `rules-${viewportName}`);

        const textContent = await page.textContent('body');
        const hasContent = textContent && textContent.length > 100;
        console.log(`  Content length: ${textContent?.length || 0} characters`);
        console.log(`  Has substantial content: ${hasContent}`);

        // Check for back button
        const buttons = await page.locator('button').all();
        for (const btn of buttons) {
          const text = await btn.textContent().catch(() => '');
          if (text.toLowerCase().includes('back')) {
            console.log(`✓ Back button found on ${viewportName}`);
            break;
          }
        }

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

      const buttonSizes = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a[href]'));
        return buttons.slice(0, 10).map(btn => {
          const rect = btn.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            text: btn.textContent?.trim().substring(0, 30)
          };
        });
      });

      console.log('Touch target sizes (first 10 elements):');
      buttonSizes.forEach(size => {
        const meetsMinSize = size.width >= 44 && size.height >= 44;
        console.log(`  "${size.text}": ${size.width.toFixed(0)}x${size.height.toFixed(0)} ${meetsMinSize ? '✓' : '⚠ (recommended: 44x44)'}`);
      });
    });

    test('Accessibility - ARIA labels and landmarks', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);

      await page.goto(`${BASE_URL}/en`);
      await waitForPageLoad(page);

      const ariaElements = await page.evaluate(() => {
        return {
          ariaLabels: document.querySelectorAll('[aria-label]').length,
          ariaDescriptions: document.querySelectorAll('[aria-describedby]').length,
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          navElements: document.querySelectorAll('nav').length,
          mainElements: document.querySelectorAll('main').length,
          headerElements: document.querySelectorAll('header').length
        };
      });

      console.log('Accessibility elements:', JSON.stringify(ariaElements, null, 2));
    });
  });

  // Performance Tests
  test.describe('8. Performance Tests', () => {

    test('Performance - Page load times', async ({ page }) => {
      const pages = [
        { path: '/en', name: 'Landing' },
        { path: '/en/singleplayer', name: 'Single Player' },
        { path: '/en/multiplayer', name: 'Multiplayer' },
        { path: '/en/profile', name: 'Profile' },
        { path: '/en/leaderboard', name: 'Leaderboard' },
        { path: '/en/rules', name: 'Rules' }
      ];

      console.log('\nPage Load Performance:');
      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pagePath.path}`);
        await waitForPageLoad(page);
        const loadTime = Date.now() - startTime;

        const status = loadTime < 3000 ? '✓ Fast' : loadTime < 5000 ? '⚠ Moderate' : '✗ Slow';
        console.log(`  ${pagePath.name}: ${loadTime}ms ${status}`);
      }
    });
  });
});
