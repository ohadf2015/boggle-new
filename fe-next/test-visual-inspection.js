/**
 * Visual Inspection Test for Top Section UI
 * Captures screenshots of the actual game in progress
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots', 'visual-inspection');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureGameState(page, name) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
  console.log(`✓ Captured: ${name}.png`);
}

async function main() {
  console.log('=== Visual Inspection Test ===\n');
  console.log('This test will capture screenshots of the game UI for manual inspection\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'he-IL',
  });

  const page = await context.newPage();

  try {
    // Navigate to multiplayer
    console.log('Navigating to multiplayer...');
    await page.goto(`${BASE_URL}/he/multiplayer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await captureGameState(page, '01-multiplayer-landing');

    // Create room
    console.log('Creating room...');
    const createBtn = page.locator('button').filter({ hasText: /צור חדר/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);
      await captureGameState(page, '02-lobby');
    }

    // Start game
    console.log('Starting game...');
    const startBtn = page.locator('button').filter({ hasText: /התחל משחק|התחל/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(5000); // Wait for game animation
      await captureGameState(page, '03-game-started');
    }

    // Wait for game to be fully rendered
    await page.waitForTimeout(2000);

    // Capture different viewports
    console.log('\nCapturing desktop view...');
    await captureGameState(page, '04-desktop-full');

    // Capture top section specifically
    const topSection = page.locator('.flex.items-center.justify-center.gap-4').first();
    if (await topSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topSection.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-top-section-detail.png'),
      });
      console.log('✓ Captured: 05-top-section-detail.png');
    }

    // Capture at tablet size
    console.log('\nCapturing tablet view...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await captureGameState(page, '06-tablet-view');

    // Capture at mobile size
    console.log('\nCapturing mobile view...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await captureGameState(page, '07-mobile-portrait');

    // Capture mobile landscape
    console.log('\nCapturing mobile landscape...');
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);
    await captureGameState(page, '08-mobile-landscape');

    console.log('\n=== Manual Inspection Required ===');
    console.log('Please review the screenshots in:', SCREENSHOT_DIR);
    console.log('\nCheck for:');
    console.log('1. Score box on LEFT with cream background (#FFFEF0)');
    console.log('2. Timer on RIGHT with circular progress');
    console.log('3. Combo display HIDDEN (should not appear at start)');
    console.log('4. Proper gaps (16-24px) between elements');
    console.log('5. Hard shadows (no blur) on all elements');
    console.log('6. Consistent shadow-hard-lg class usage');

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '00-error.png'),
      fullPage: true,
    });
  } finally {
    await browser.close();
    console.log('\n✓ Test complete. Screenshots saved to:', SCREENSHOT_DIR);
  }
}

main().catch(console.error);
