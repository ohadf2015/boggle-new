const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots-manual');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  measurements: {}
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshot(page, name, viewport) {
  const filename = `${name}_${viewport.width}x${viewport.height}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot: ${filename}`);
  return filepath;
}

async function testHostPreGameView(browser, viewportConfig) {
  const { width, height, name } = viewportConfig;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${name} (${width}x${height})`);
  console.log('='.repeat(70));

  const context = await browser.newContext({
    viewport: { width, height }
  });

  const page = await context.newPage();

  try {
    // Navigate and create room
    console.log('1. Navigating to multiplayer page...');
    await page.goto(`${BASE_URL}/en/multiplayer`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1000);

    // Fill in room details and click create
    console.log('2. Creating a room...');
    const createRoomBtn = page.locator('button').filter({ hasText: 'CREATE ROOM' }).last();
    await createRoomBtn.click();
    await sleep(4000);

    // Wait for navigation to host view
    console.log('3. Waiting for host view to load...');
    await page.waitForURL(/.*\/host\/.*/, { timeout: 15000 });
    await sleep(2000);

    await captureScreenshot(page, '01_host_pregame_initial', viewportConfig);

    // Test 1: Room Code Card Measurements
    console.log('\n[TEST 1] Room Code Card');
    const roomCodeCard = page.locator('text="ROOM CODE:"').locator('..').locator('..').first();
    if (await roomCodeCard.isVisible()) {
      const padding = await roomCodeCard.evaluate(el => window.getComputedStyle(el).padding);
      const gap = await page.locator('.flex.flex-col').first().evaluate(el => window.getComputedStyle(el).gap);
      console.log(`  ✓ Room code card padding: ${padding}`);
      console.log(`  ✓ Main container gap: ${gap}`);
      testResults.measurements[`${name}_room_card_padding`] = padding;
      testResults.measurements[`${name}_main_gap`] = gap;
      testResults.passed.push(`${name}: Room code card rendered`);
    }

    // Test 2: Room Code Text Size
    console.log('\n[TEST 2] Room Code Typography');
    const roomCodeH2 = page.locator('h2').filter({ hasText: /[A-Z0-9]{6}/ }).first();
    if (await roomCodeH2.isVisible().catch(() => false)) {
      const fontSize = await roomCodeH2.evaluate(el => window.getComputedStyle(el).fontSize);
      const box = await roomCodeH2.boundingBox();
      console.log(`  ✓ Room code font-size: ${fontSize}`);
      console.log(`  ✓ Room code dimensions: ${box?.width.toFixed(0)}x${box?.height.toFixed(0)}px`);
      testResults.measurements[`${name}_roomcode_fontsize`] = fontSize;
      testResults.passed.push(`${name}: Room code text size ${fontSize}`);
    }

    // Test 3: Timer Button Sizes
    console.log('\n[TEST 3] Timer Button Tap Targets');
    const timerButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    const count = await timerButtons.count();

    if (count >= 2) {
      const minusBtn = timerButtons.first();
      const plusBtn = timerButtons.nth(1);

      const minusBox = await minusBtn.boundingBox();
      const plusBox = await plusBtn.boundingBox();

      if (minusBox && plusBox) {
        console.log(`  ✓ Minus button: ${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px`);
        console.log(`  ✓ Plus button: ${plusBox.width.toFixed(0)}x${plusBox.height.toFixed(0)}px`);

        const minusAdequate = minusBox.width >= 36 && minusBox.height >= 36;
        const plusAdequate = plusBox.width >= 36 && plusBox.height >= 36;

        if (minusAdequate && plusAdequate) {
          testResults.passed.push(`${name}: Timer buttons meet 36px tap target (${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px)`);
        } else {
          testResults.failed.push(`${name}: Timer buttons too small (${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px)`);
        }
      }
    }

    // Test 4: Timer Display Size
    console.log('\n[TEST 4] Timer Display');
    const timerValue = page.locator('.text-2xl, .text-3xl').filter({ hasText: /^\d+$/ }).first();
    if (await timerValue.isVisible().catch(() => false)) {
      const fontSize = await timerValue.evaluate(el => window.getComputedStyle(el).fontSize);
      const height = await timerValue.evaluate(el => window.getComputedStyle(el).height);
      console.log(`  ✓ Timer display font-size: ${fontSize}`);
      console.log(`  ✓ Timer display height: ${height}`);
      testResults.measurements[`${name}_timer_fontsize`] = fontSize;
      testResults.passed.push(`${name}: Timer display ${fontSize}`);
    }

    // Test 5: Settings Card Padding
    console.log('\n[TEST 5] Game Settings Card');
    const settingsCard = page.locator('text="GAME SETTINGS"').locator('..').locator('..').first();
    if (await settingsCard.isVisible()) {
      const padding = await settingsCard.evaluate(el => window.getComputedStyle(el).padding);
      const spaceY = await page.locator('.space-y-2, .space-y-3, .space-y-4').first().evaluate(el => {
        return window.getComputedStyle(el).getPropertyValue('--space-y-reverse') || 'check gap';
      }).catch(() => 'N/A');
      console.log(`  ✓ Settings card padding: ${padding}`);
      testResults.measurements[`${name}_settings_padding`] = padding;
      testResults.passed.push(`${name}: Settings card padding ${padding}`);
    }

    // Test 6: Advanced Settings Toggle
    console.log('\n[TEST 6] Advanced Settings Toggle');
    const advancedToggle = page.locator('button').filter({ hasText: /ADVANCED SETTINGS/i }).first();

    if (await advancedToggle.isVisible()) {
      // Check initial state
      const difficultyInitial = await page.locator('text=/^Difficulty$/i, text=/DIFFICULTY/i').isVisible().catch(() => false);
      console.log(`  - Initially ${difficultyInitial ? 'visible' : 'hidden'}`);

      // Click toggle
      await advancedToggle.click();
      await sleep(600);
      await captureScreenshot(page, '02_advanced_settings_toggled', viewportConfig);

      const difficultyAfter = await page.locator('text=/^Difficulty$/i, text=/DIFFICULTY/i').isVisible().catch(() => false);
      console.log(`  - After toggle: ${difficultyAfter ? 'visible' : 'hidden'}`);

      if (difficultyAfter !== difficultyInitial) {
        testResults.passed.push(`${name}: Advanced settings toggle works`);
        console.log(`  ✓ Toggle animation successful`);
      } else {
        testResults.warnings.push(`${name}: Advanced settings toggle state unchanged`);
      }

      // Test 7: Difficulty Buttons (if visible)
      if (difficultyAfter) {
        console.log('\n[TEST 7] Difficulty Buttons');
        const diffButtons = page.locator('button').filter({ hasText: /easy|normal|medium|hard|extreme/i });
        const diffCount = await diffButtons.count();
        console.log(`  - Found ${diffCount} difficulty buttons`);

        if (diffCount > 0) {
          const firstDiff = diffButtons.first();
          const box = await firstDiff.boundingBox();
          const padding = await firstDiff.evaluate(el => window.getComputedStyle(el).padding);
          console.log(`  ✓ Button size: ${box?.width.toFixed(0)}x${box?.height.toFixed(0)}px`);
          console.log(`  ✓ Button padding: ${padding}`);
          testResults.measurements[`${name}_diff_button_padding`] = padding;
          testResults.passed.push(`${name}: Difficulty buttons rendered (padding: ${padding})`);
        }
      }
    }

    // Test 8: Share Buttons
    console.log('\n[TEST 8] Share Buttons');
    const shareButtons = page.locator('button').filter({ hasText: /Copy Link|Share|QR Code/i });
    const shareCount = await shareButtons.count();
    console.log(`  - Found ${shareCount} share buttons`);

    if (shareCount > 0) {
      const firstShare = shareButtons.first();
      const box = await firstShare.boundingBox();
      if (box) {
        console.log(`  ✓ Share button: ${box.width.toFixed(0)}x${box.height.toFixed(0)}px`);
        if (box.height >= 36) {
          testResults.passed.push(`${name}: Share buttons adequate tap target (${box.height.toFixed(0)}px)`);
        } else {
          testResults.warnings.push(`${name}: Share button height ${box.height.toFixed(0)}px < 36px`);
        }
      }
    }

    // Test 9: Players List Card
    console.log('\n[TEST 9] Players List Card');
    const playersCard = page.locator('text=/PLAYERS JOINED/i').locator('..').locator('..').first();
    if (await playersCard.isVisible()) {
      const width = await playersCard.evaluate(el => window.getComputedStyle(el).width);
      const padding = await playersCard.evaluate(el => window.getComputedStyle(el).padding);
      console.log(`  ✓ Players card width: ${width}`);
      console.log(`  ✓ Players card padding: ${padding}`);
      testResults.measurements[`${name}_players_width`] = width;
      testResults.measurements[`${name}_players_padding`] = padding;
      testResults.passed.push(`${name}: Players list card width ${width}`);
    }

    // Test 10: Chat Section
    console.log('\n[TEST 10] Chat Section');
    const chatSection = page.locator('[class*="chat"], [class*="Chat"], .min-h-\\[280px\\], .min-h-\\[400px\\]').first();
    const chatVisible = await chatSection.isVisible().catch(() => false);

    if (chatVisible) {
      const minHeight = await chatSection.evaluate(el => window.getComputedStyle(el).minHeight);
      const box = await chatSection.boundingBox();
      console.log(`  ✓ Chat min-height: ${minHeight}`);
      console.log(`  ✓ Chat actual height: ${box?.height.toFixed(0)}px`);
      testResults.measurements[`${name}_chat_minheight`] = minHeight;
      testResults.passed.push(`${name}: Chat section visible (min-height: ${minHeight})`);
    } else {
      testResults.warnings.push(`${name}: Chat section not visible`);
    }

    // Test 11: Overall Layout
    console.log('\n[TEST 11] Overall Layout & Spacing');
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = height;
    const hasScroll = bodyHeight > viewportHeight;

    console.log(`  ✓ Page height: ${bodyHeight}px`);
    console.log(`  ✓ Viewport: ${viewportHeight}px`);
    console.log(`  ✓ Scrollable: ${hasScroll ? 'Yes' : 'No'}`);

    testResults.measurements[`${name}_page_height`] = `${bodyHeight}px`;
    testResults.passed.push(`${name}: Layout rendered (${bodyHeight}px)`);

    await captureScreenshot(page, '03_final_state', viewportConfig);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    testResults.failed.push(`${name}: ${error.message}`);
    await captureScreenshot(page, 'error', viewportConfig);
  } finally {
    await context.close();
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('HOST PRE-GAME VIEW - COMPACT UI VALIDATION');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { width: 375, height: 667, name: 'Mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1024, height: 768, name: 'Desktop-SM' },
    { width: 1440, height: 900, name: 'Desktop-LG' }
  ];

  for (const viewport of viewports) {
    await testHostPreGameView(browser, viewport);
    await sleep(500);
  }

  await browser.close();

  // Print summary
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));

  console.log(`\n✅ PASSED: ${testResults.passed.length}`);
  testResults.passed.forEach(t => console.log(`   ✓ ${t}`));

  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${testResults.warnings.length}`);
    testResults.warnings.forEach(w => console.log(`   ⚠ ${w}`));
  }

  if (testResults.failed.length > 0) {
    console.log(`\n❌ FAILED: ${testResults.failed.length}`);
    testResults.failed.forEach(f => console.log(`   ✗ ${f}`));
  }

  console.log(`\n📐 MEASUREMENTS:`);
  Object.entries(testResults.measurements).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log(`\n📸 Screenshots: ${SCREENSHOTS_DIR}`);

  // Save JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Report: ${reportPath}\n`);

  console.log('='.repeat(70) + '\n');

  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
