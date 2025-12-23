const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Screenshot directory
const screenshotDir = '/tmp/boggle-test-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function waitForUser(page, message) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(message);
  console.log('='.repeat(80));
  console.log('\nPress Enter in the terminal when ready to continue...\n');

  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function getElementStyles(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const computed = window.getComputedStyle(element);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      borderWidth: computed.borderWidth,
      borderColor: computed.borderColor,
      borderStyle: computed.borderStyle,
      boxShadow: computed.boxShadow,
      borderRadius: computed.borderRadius,
      height: computed.height,
      minHeight: computed.minHeight,
      width: computed.width,
      display: computed.display,
      position: computed.position
    };
  }, selector);
}

async function getBoundingBox(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right
    };
  }, selector);
}

(async () => {
  console.log('🚀 Starting Manual Boggle Word Forming Area Test\n');
  console.log('This test will require manual interaction to complete authentication and start the game.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11 Pro size (portrait)
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  try {
    console.log('📱 Testing in Portrait Mode (414x896)...\n');

    // Navigate to landing page
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await takeScreenshot(page, '01-landing-page');

    await waitForUser(page, 'STEP 1: Navigate to the single player game and start a game.\nOnce you are IN the game (seeing the Boggle grid), press Enter.');

    console.log('\nProceeding with automated testing...\n');

    // Take initial game screenshot
    let screenshot = await takeScreenshot(page, '02-game-started');

    // ===== TEST 1: Check WordFormingArea exists =====
    console.log('\n--- TEST 1: WordFormingArea Structure ---');

    const wordFormingArea = await page.$('[aria-live="polite"]');
    if (wordFormingArea) {
      console.log('✓ WordFormingArea found');

      const wordFormingStyles = await getElementStyles(page, '[aria-live="polite"]');
      if (wordFormingStyles) {
        console.log(`  - Min Height: ${wordFormingStyles.minHeight}`);
        console.log(`  - Height: ${wordFormingStyles.height}`);
      }
    } else {
      console.log('✗ WordFormingArea NOT found');
    }

    // ===== TEST 2: Check placeholder state =====
    console.log('\n--- TEST 2: Placeholder State ---');

    const placeholderText = await page.textContent('[aria-live="polite"]').catch(() => null);
    console.log(`  - Current text: "${placeholderText}"`);

    screenshot = await takeScreenshot(page, '03-placeholder-state');

    // Check placeholder element styling
    const placeholderDiv = await page.$('[aria-live="polite"] > div > div');
    if (placeholderDiv) {
      const placeholderStyles = await getElementStyles(page, '[aria-live="polite"] > div > div');
      console.log(`  - Background: ${placeholderStyles.backgroundColor}`);
      console.log(`  - Border style: ${placeholderStyles.borderStyle}`);
      console.log(`  - Border width: ${placeholderStyles.borderWidth}`);
    }

    // ===== TEST 3: Check for notification area =====
    console.log('\n--- TEST 3: GameNotificationArea ---');

    // Look for notification area below word forming area
    const allDivs = await page.$$('div.w-full.flex.items-center.justify-center');
    console.log(`  - Found ${allDivs.length} potential notification area elements`);

    // ===== TEST 4: Verify game elements visibility =====
    console.log('\n--- TEST 4: Game Elements Visibility ---');

    // Check for grid
    const gridElement = await page.$('[class*="grid"], [class*="Grid"]');
    console.log(`  - Game grid: ${gridElement ? 'Visible' : 'Not found'}`);

    // Check for timer
    const timerElement = await page.$('[class*="timer"], [class*="Timer"]');
    console.log(`  - Timer: ${timerElement ? 'Visible' : 'Not found'}`);

    // Check for score
    const scoreElement = await page.$('[class*="score"], [class*="Score"]');
    console.log(`  - Score: ${scoreElement ? 'Visible' : 'Not found'}`);

    await waitForUser(page, 'STEP 2: Now SELECT SOME LETTERS to form a word (don\'t submit yet).\nOnce you have selected 2-3 letters, press Enter.');

    screenshot = await takeScreenshot(page, '04-letters-selected');

    console.log('\n--- TEST 5: Word Formation Display ---');

    const wordText = await page.textContent('[aria-live="polite"]').catch(() => '');
    console.log(`  - Word forming area shows: "${wordText}"`);

    // Check styling of word display
    const wordDisplay = await page.$('[aria-live="polite"] > div > div');
    if (wordDisplay) {
      const wordStyles = await getElementStyles(page, '[aria-live="polite"] > div > div');
      console.log(`  - Background: ${wordStyles.backgroundColor}`);
      console.log(`  - Border width: ${wordStyles.borderWidth}`);
      console.log(`  - Border color: ${wordStyles.borderColor}`);
      console.log(`  - Box shadow: ${wordStyles.boxShadow}`);
    }

    // ===== TEST 6: Layout measurements =====
    console.log('\n--- TEST 6: Layout and Spacing ---');

    const wordFormingBox = await getBoundingBox(page, '[aria-live="polite"]');
    const gridBox = await getBoundingBox(page, '[class*="grid"], [class*="Grid"]');

    if (wordFormingBox && gridBox) {
      console.log(`  - WordFormingArea position: top=${wordFormingBox.top.toFixed(2)}, height=${wordFormingBox.height.toFixed(2)}`);
      console.log(`  - Grid position: top=${gridBox.top.toFixed(2)}, height=${gridBox.height.toFixed(2)}`);

      const spacing = gridBox.top - wordFormingBox.bottom;
      console.log(`  - Spacing between WordFormingArea and grid: ${spacing.toFixed(2)}px`);

      if (spacing >= 0) {
        console.log('  ✓ No overlap detected');
      } else {
        console.log(`  ✗ OVERLAP detected: ${Math.abs(spacing).toFixed(2)}px`);
      }
    }

    await waitForUser(page, 'STEP 3: Now SUBMIT the word (release/deselect).\nWait for the notification to appear, then press Enter.');

    screenshot = await takeScreenshot(page, '05-word-submitted-notification');

    console.log('\n--- TEST 7: Notification Display ---');

    // Look for notification elements (green for accepted, red for rejected)
    const acceptedNotif = await page.$('[class*="bg-neo-lime"]');
    const rejectedNotif = await page.$('[class*="bg-neo-red"]');

    if (acceptedNotif) {
      const notifText = await page.textContent('[class*="bg-neo-lime"]').catch(() => '');
      console.log(`  ✓ Accepted notification shown: "${notifText}"`);

      const notifStyles = await getElementStyles(page, '[class*="bg-neo-lime"]');
      console.log(`  - Background: ${notifStyles.backgroundColor}`);
      console.log(`  - Border: ${notifStyles.borderWidth} ${notifStyles.borderColor}`);
    } else if (rejectedNotif) {
      const notifText = await page.textContent('[class*="bg-neo-red"]').catch(() => '');
      console.log(`  ✓ Rejected notification shown: "${notifText}"`);

      const notifStyles = await getElementStyles(page, '[class*="bg-neo-red"]');
      console.log(`  - Background: ${notifStyles.backgroundColor}`);
      console.log(`  - Border: ${notifStyles.borderWidth} ${notifStyles.borderColor}`);
    } else {
      console.log('  ⚠ No notification found (may have disappeared already)');
    }

    // Wait for notification to disappear
    await page.waitForTimeout(2500);

    screenshot = await takeScreenshot(page, '06-after-notification');

    // ===== TEST 8: Landscape Orientation =====
    console.log('\n--- TEST 8: Landscape Orientation ---');

    console.log('  Rotating to landscape...');
    await page.setViewportSize({ width: 896, height: 414 }); // Landscape
    await page.waitForTimeout(1000);

    screenshot = await takeScreenshot(page, '07-landscape-mode');

    // Check compact mode
    const wordFormingStylesLandscape = await getElementStyles(page, '[aria-live="polite"]');
    if (wordFormingStylesLandscape) {
      console.log(`  - Min Height in landscape: ${wordFormingStylesLandscape.minHeight}`);
      console.log(`  - Height in landscape: ${wordFormingStylesLandscape.height}`);
    }

    // Check if all elements still visible
    const gridVisibleLandscape = await page.isVisible('[class*="grid"], [class*="Grid"]');
    console.log(`  - Grid visible in landscape: ${gridVisibleLandscape ? 'Yes' : 'No'}`);

    await waitForUser(page, 'STEP 4: Test complete! Review the game UI in landscape mode.\nPress Enter to finish.');

    screenshot = await takeScreenshot(page, '08-final-state');

    console.log('\n' + '='.repeat(80));
    console.log('MANUAL TEST COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📁 All screenshots saved to: ${screenshotDir}`);
    console.log('\nKey findings:');
    console.log('- Check if WordFormingArea has permanent space above the grid');
    console.log('- Check if notifications appear in the dedicated GameNotificationArea');
    console.log('- Check if Neo-Brutalist styling is applied (cyan background, black borders, hard shadows)');
    console.log('- Check if layout remains stable when words appear/disappear');
    console.log('- Check if all elements are visible in both orientations');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Test execution error:', error);
    await takeScreenshot(page, '99-error-state');
  } finally {
    console.log('\nPress Enter to close the browser...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    await browser.close();
  }
})();
