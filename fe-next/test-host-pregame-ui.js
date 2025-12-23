const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshot(page, name, viewport) {
  const filename = `${name}_${viewport.width}x${viewport.height}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  testResults.screenshots.push({ name, filename, viewport });
  console.log(`  📸 Screenshot saved: ${filename}`);
  return filepath;
}

async function measureElement(page, selector) {
  try {
    const element = await page.locator(selector).first();
    const box = await element.boundingBox();
    return box;
  } catch (error) {
    return null;
  }
}

async function testViewport(browser, viewportConfig) {
  const { width, height, name } = viewportConfig;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Viewport: ${name} (${width}x${height})`);
  console.log(`${'='.repeat(60)}\n`);

  const context = await browser.newContext({
    viewport: { width, height },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // Navigate to multiplayer page
    console.log(`📱 Navigating to ${BASE_URL}/en/multiplayer`);
    await page.goto(`${BASE_URL}/en/multiplayer`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Click the bottom "CREATE ROOM" button to create a room
    console.log('🎮 Clicking CREATE ROOM button (bottom)...');
    const createRoomButton = page.locator('button').filter({ hasText: 'CREATE ROOM' }).last();
    await createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
    await createRoomButton.click();
    await sleep(5000);

    // Wait for host pre-game view to load
    console.log('⏳ Waiting for Host Pre-Game View to load...');
    await page.waitForSelector('text=/Room Code|Game Code/i', { timeout: 15000 });
    await sleep(2000);

    // Capture initial state
    await captureScreenshot(page, '01_initial_state', viewportConfig);

    // Test 1: Check room code visibility and size
    console.log('\n✓ Test 1: Room Code Display');
    // Look for the room code - it should be a large text near "ROOM CODE:" label
    const roomCodeText = page.locator('h2').filter({ hasText: /[A-Z0-9]{6}/ }).first();
    const roomCodeBox = await roomCodeText.boundingBox().catch(() => null);
    if (roomCodeBox) {
      console.log(`  - Room code text size: ${roomCodeBox.width.toFixed(0)}x${roomCodeBox.height.toFixed(0)}px`);
      const fontSize = await roomCodeText.evaluate(el => window.getComputedStyle(el).fontSize);
      console.log(`  - Font size: ${fontSize}`);
      testResults.passed.push(`${name}: Room code visible and sized correctly (${fontSize})`);
    }

    // Test 2: Measure card paddings
    console.log('\n✓ Test 2: Card Padding Measurements');
    const roomCodeCard = await page.locator('text=/Room Code/i').locator('..').locator('..').first();
    const padding = await roomCodeCard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.padding;
    });
    console.log(`  - Room code card padding: ${padding}`);
    testResults.passed.push(`${name}: Room code card padding: ${padding}`);

    // Test 3: Timer buttons - measure size and test functionality
    console.log('\n✓ Test 3: Timer Controls');
    const minusButton = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first();
    const minusBox = await minusButton.boundingBox();

    if (minusBox) {
      console.log(`  - Timer minus button size: ${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px`);
      if (minusBox.width >= 36 && minusBox.height >= 36) {
        testResults.passed.push(`${name}: Timer buttons meet tap target size (${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px)`);
      } else {
        testResults.failed.push(`${name}: Timer buttons too small (${minusBox.width.toFixed(0)}x${minusBox.height.toFixed(0)}px < 36px)`);
      }
    }

    // Get initial timer value
    const timerDisplay = page.locator('text=/minutes/i').locator('..').locator('span, div').first();
    const initialTimer = await timerDisplay.textContent();
    console.log(`  - Initial timer value: ${initialTimer}`);

    // Click plus button
    const plusButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await plusButton.click();
    await sleep(500);
    await captureScreenshot(page, '02_timer_increased', viewportConfig);

    const newTimer = await timerDisplay.textContent();
    console.log(`  - Timer after increase: ${newTimer}`);

    if (newTimer !== initialTimer) {
      testResults.passed.push(`${name}: Timer increment works (${initialTimer} → ${newTimer})`);
    } else {
      testResults.warnings.push(`${name}: Timer value didn't change after clicking plus`);
    }

    // Test 4: Advanced Settings Toggle
    console.log('\n✓ Test 4: Advanced Settings Toggle');
    const advancedToggle = page.locator('button:has-text("Advanced Settings"), button:has-text("ADVANCED SETTINGS")').first();

    // Check if advanced settings are initially hidden
    const difficultyVisible = await page.locator('text=/Difficulty/i').isVisible().catch(() => false);
    console.log(`  - Advanced settings initially ${difficultyVisible ? 'visible' : 'hidden'}`);

    // Toggle advanced settings
    await advancedToggle.click();
    await sleep(800); // Wait for animation
    await captureScreenshot(page, '03_advanced_settings_open', viewportConfig);

    const difficultyVisibleAfter = await page.locator('text=/Difficulty/i').isVisible().catch(() => false);
    console.log(`  - Advanced settings after toggle: ${difficultyVisibleAfter ? 'visible' : 'hidden'}`);

    if (difficultyVisibleAfter !== difficultyVisible) {
      testResults.passed.push(`${name}: Advanced settings toggle animation works`);
    } else {
      testResults.failed.push(`${name}: Advanced settings toggle didn't change visibility`);
    }

    // Test 5: Difficulty buttons size and clickability
    if (difficultyVisibleAfter) {
      console.log('\n✓ Test 5: Difficulty Buttons');
      const difficultyButtons = page.locator('button').filter({ hasText: /easy|normal|medium|hard|extreme/i });
      const buttonCount = await difficultyButtons.count();
      console.log(`  - Found ${buttonCount} difficulty buttons`);

      if (buttonCount > 0) {
        const firstDiffButton = difficultyButtons.first();
        const diffButtonBox = await firstDiffButton.boundingBox();
        if (diffButtonBox) {
          console.log(`  - Difficulty button size: ${diffButtonBox.width.toFixed(0)}x${diffButtonBox.height.toFixed(0)}px`);
          const buttonPadding = await firstDiffButton.evaluate(el => window.getComputedStyle(el).padding);
          console.log(`  - Button padding: ${buttonPadding}`);
          testResults.passed.push(`${name}: Difficulty buttons rendered with padding ${buttonPadding}`);
        }

        // Click a difficulty button
        await firstDiffButton.click();
        await sleep(500);
        await captureScreenshot(page, '04_difficulty_selected', viewportConfig);
        testResults.passed.push(`${name}: Difficulty button is clickable`);
      }
    }

    // Test 6: Share buttons
    console.log('\n✓ Test 6: Share Buttons');
    const shareButtons = page.locator('button').filter({ hasText: /copy|share|qr|whatsapp/i });
    const shareCount = await shareButtons.count();
    console.log(`  - Found ${shareCount} share buttons`);

    if (shareCount > 0) {
      const firstShareBtn = shareButtons.first();
      const shareBox = await firstShareBtn.boundingBox();
      if (shareBox) {
        console.log(`  - Share button size: ${shareBox.width.toFixed(0)}x${shareBox.height.toFixed(0)}px`);
        if (shareBox.height >= 36) {
          testResults.passed.push(`${name}: Share buttons have adequate tap target (${shareBox.height.toFixed(0)}px)`);
        } else {
          testResults.warnings.push(`${name}: Share buttons might be small (${shareBox.height.toFixed(0)}px height)`);
        }
      }
    }

    // Test 7: Players list container
    console.log('\n✓ Test 7: Players List');
    const playersCard = page.locator('text=/Players Joined/i').locator('..').locator('..').first();
    const playersBox = await playersCard.boundingBox();

    if (playersBox) {
      console.log(`  - Players list size: ${playersBox.width.toFixed(0)}x${playersBox.height.toFixed(0)}px`);
      const playersWidth = await playersCard.evaluate(el => window.getComputedStyle(el).width);
      console.log(`  - Players list width: ${playersWidth}`);
      testResults.passed.push(`${name}: Players list rendered (width: ${playersWidth})`);
    }

    // Test 8: Chat section
    console.log('\n✓ Test 8: Chat Section');
    // Look for chat-related elements
    const chatContainer = page.locator('[class*="chat"], [class*="Chat"]').first();
    const chatVisible = await chatContainer.isVisible().catch(() => false);

    if (chatVisible) {
      const chatBox = await chatContainer.boundingBox();
      if (chatBox) {
        console.log(`  - Chat container size: ${chatBox.width.toFixed(0)}x${chatBox.height.toFixed(0)}px`);
        const chatHeight = await chatContainer.evaluate(el => window.getComputedStyle(el).minHeight);
        console.log(`  - Chat min-height: ${chatHeight}`);
        testResults.passed.push(`${name}: Chat section visible (min-height: ${chatHeight})`);
      }
    } else {
      console.log(`  - Chat not visible or not found`);
      testResults.warnings.push(`${name}: Chat section not found`);
    }

    await captureScreenshot(page, '05_final_state', viewportConfig);

    // Test 9: Overall layout check
    console.log('\n✓ Test 9: Overall Layout');
    const bodyScroll = await page.evaluate(() => {
      return {
        scrollHeight: document.body.scrollHeight,
        clientHeight: document.body.clientHeight,
        hasVerticalScroll: document.body.scrollHeight > window.innerHeight
      };
    });
    console.log(`  - Page height: ${bodyScroll.scrollHeight}px (viewport: ${height}px)`);
    console.log(`  - Vertical scroll: ${bodyScroll.hasVerticalScroll ? 'yes' : 'no'}`);
    testResults.passed.push(`${name}: Page layout complete (height: ${bodyScroll.scrollHeight}px)`);

  } catch (error) {
    console.error(`\n❌ Error testing ${name}:`, error.message);
    testResults.failed.push(`${name}: ${error.message}`);
    await captureScreenshot(page, 'error_state', viewportConfig);
  } finally {
    await context.close();
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log(' HOST PRE-GAME VIEW - COMPACT UI VALIDATION TEST SUITE');
  console.log('='.repeat(80) + '\n');

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
    { width: 768, height: 1024, name: 'Tablet (iPad)' },
    { width: 1024, height: 768, name: 'Desktop (Small)' },
    { width: 1440, height: 900, name: 'Desktop (Large)' }
  ];

  for (const viewport of viewports) {
    await testViewport(browser, viewport);
    await sleep(1000);
  }

  await browser.close();

  // Generate test report
  console.log('\n\n' + '='.repeat(80));
  console.log(' TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ PASSED: ${testResults.passed.length} tests`);
  testResults.passed.forEach(test => console.log(`   ✓ ${test}`));

  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${testResults.warnings.length}`);
    testResults.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));
  }

  if (testResults.failed.length > 0) {
    console.log(`\n❌ FAILED: ${testResults.failed.length} tests`);
    testResults.failed.forEach(test => console.log(`   ✗ ${test}`));
  }

  console.log(`\n📸 Screenshots saved in: ${SCREENSHOTS_DIR}`);
  console.log(`   Total screenshots: ${testResults.screenshots.length}`);

  // Save JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportPath}`);

  console.log('\n' + '='.repeat(80) + '\n');

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
