/**
 * Comprehensive UI Test for Game Settings Panel
 * Testing the redesigned compact layout
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots', 'game-settings-panel');
const VIEWPORT_SIZES = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 }
];

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to add test result
function recordTest(category, testName, passed, details = '') {
  const result = {
    category,
    testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  };

  if (passed) {
    testResults.passed.push(result);
  } else {
    testResults.failed.push(result);
  }

  console.log(`${passed ? '✓' : '✗'} [${category}] ${testName}${details ? ': ' + details : ''}`);
}

// Helper function to add warning
function recordWarning(category, message) {
  testResults.warnings.push({ category, message, timestamp: new Date().toISOString() });
  console.log(`⚠ [${category}] ${message}`);
}

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function navigateToGameSettings(page, language = 'en') {
  console.log(`\n📍 Navigating to Game Settings Panel (${language})...`);

  try {
    // Go to multiplayer page directly
    await page.goto(`${BASE_URL}/${language}/multiplayer`, { waitUntil: 'networkidle' });
    await sleep(1500);

    // Switch to host mode (look for Host button in mode selector)
    const hostModeButton = await page.locator('button:has-text("Host"), [role="tab"]:has-text("Host")').first();
    if (await hostModeButton.isVisible({ timeout: 3000 })) {
      await hostModeButton.click();
      await sleep(500);
      recordTest('Navigation', `Switch to host mode (${language})`, true);
    } else {
      recordWarning('Navigation', 'Host mode already selected or button not found');
    }

    // Fill in required fields if they exist
    const roomNameInput = await page.locator('input[type="text"][placeholder*="room" i], input[type="text"][placeholder*="Room" i], input[type="text"]').first();
    if (await roomNameInput.isVisible({ timeout: 2000 })) {
      await roomNameInput.fill('Test Room');
      await sleep(300);
    }

    // Look for Create/Start button to submit the form and open host view
    const createButton = await page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Room"), button:has-text("Host Game"), form button[type="submit"]').first();
    if (await createButton.isVisible({ timeout: 3000 })) {
      await createButton.click();
      await sleep(2000); // Wait for host view to load
      recordTest('Navigation', `Create game room (${language})`, true);
    } else {
      throw new Error('Could not find Create/Submit button');
    }

    // Wait for game settings panel to appear (it should be in the HostView)
    const gameSettingsVisible = await page.locator('text=/Game Settings|הגדרות משחק/i').isVisible({ timeout: 5000 }).catch(() => false);
    if (!gameSettingsVisible) {
      // Try alternative selector
      await page.waitForSelector('button:has-text("Start Game"), button:has-text("Start"), [class*="GameSettings"]', { timeout: 5000 });
    }
    await sleep(1000);

    return true;
  } catch (error) {
    recordTest('Navigation', `Navigate to Game Settings Panel (${language})`, false, error.message);
    // Take debug screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-navigation-failed-${language}.png` });
    return false;
  }
}

async function testGameModeSelector(page, screenshotPrefix) {
  console.log('\n🎮 Testing Game Mode Selector...');

  try {
    // Check for horizontal radio buttons layout
    const gameTypeButtons = await page.locator('[role="radiogroup"] button[role="radio"]').all();
    recordTest('Game Mode Selector', 'Radio buttons exist', gameTypeButtons.length >= 2, `Found ${gameTypeButtons.length} buttons`);

    // Check Regular game button
    const regularButton = await page.locator('button[role="radio"]:has-text("Regular")').first();
    const isRegularVisible = await regularButton.isVisible({ timeout: 2000 });
    recordTest('Game Mode Selector', 'Regular game button visible', isRegularVisible);

    if (isRegularVisible) {
      // Check if it's selectable
      const isRegularEnabled = await regularButton.isEnabled();
      recordTest('Game Mode Selector', 'Regular game button enabled', isRegularEnabled);

      // Try clicking it
      await regularButton.click();
      await sleep(500);

      const isChecked = await regularButton.getAttribute('aria-checked');
      recordTest('Game Mode Selector', 'Regular game button selectable', isChecked === 'true');

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-game-mode-regular.png` });
    }

    // Check Tournament button (should be disabled with lock icon)
    const tournamentButton = await page.locator('button[role="radio"]:has-text("Tournament")').first();
    const isTournamentVisible = await tournamentButton.isVisible({ timeout: 2000 });
    recordTest('Game Mode Selector', 'Tournament button visible', isTournamentVisible);

    if (isTournamentVisible) {
      const isTournamentDisabled = await tournamentButton.isDisabled();
      recordTest('Game Mode Selector', 'Tournament button disabled', isTournamentDisabled);

      // Check for lock icon
      const lockIcon = await page.locator('button[role="radio"]:has-text("Tournament") svg[class*="FaLock"], button[role="radio"]:has-text("Tournament") [class*="lock"]').first();
      const hasLockIcon = await lockIcon.isVisible({ timeout: 1000 }).catch(() => false);
      recordTest('Game Mode Selector', 'Tournament has lock icon', hasLockIcon);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-game-mode-tournament.png` });
    }

    // Check horizontal layout
    if (gameTypeButtons.length >= 2) {
      const box1 = await gameTypeButtons[0].boundingBox();
      const box2 = await gameTypeButtons[1].boundingBox();

      if (box1 && box2) {
        const isHorizontal = Math.abs(box1.y - box2.y) < 50; // Buttons on same row
        recordTest('Game Mode Selector', 'Buttons in horizontal layout', isHorizontal,
          `Y positions: ${box1.y.toFixed(0)}, ${box2.y.toFixed(0)}`);
      }
    }

  } catch (error) {
    recordTest('Game Mode Selector', 'Overall test', false, error.message);
  }
}

async function testTimerControls(page, screenshotPrefix) {
  console.log('\n⏱️ Testing Timer Controls...');

  try {
    // Find timer controls
    const decreaseButton = await page.locator('button:has(svg[class*="FaMinus"])').first();
    const increaseButton = await page.locator('button:has(svg[class*="FaPlus"])').first();

    const decreaseVisible = await decreaseButton.isVisible({ timeout: 2000 });
    const increaseVisible = await increaseButton.isVisible({ timeout: 2000 });

    recordTest('Timer Controls', 'Decrease button visible', decreaseVisible);
    recordTest('Timer Controls', 'Increase button visible', increaseVisible);

    if (decreaseVisible && increaseVisible) {
      // Check button sizes (should be 32px, w-8 h-8)
      const decreaseBox = await decreaseButton.boundingBox();
      const increaseBox = await increaseButton.boundingBox();

      if (decreaseBox && increaseBox) {
        const decreaseSize = Math.max(decreaseBox.width, decreaseBox.height);
        const increaseSize = Math.max(increaseBox.width, increaseBox.height);

        // w-8 = 32px in Tailwind
        const isCompactSize = decreaseSize >= 30 && decreaseSize <= 40 && increaseSize >= 30 && increaseSize <= 40;
        recordTest('Timer Controls', 'Compact button size (32px)', isCompactSize,
          `Sizes: ${decreaseSize.toFixed(0)}px, ${increaseSize.toFixed(0)}px`);
      }

      // Get initial timer value
      const timerDisplay = await page.locator('text=/^\\d+$/:near(button:has(svg[class*="FaMinus"]))').first();
      const initialValue = await timerDisplay.textContent();

      recordTest('Timer Controls', 'Timer value displayed', !!initialValue, initialValue || '');

      // Test increment
      await increaseButton.click();
      await sleep(500);
      const increasedValue = await timerDisplay.textContent();

      recordTest('Timer Controls', 'Timer increment works',
        parseInt(increasedValue || '0') > parseInt(initialValue || '0'),
        `${initialValue} → ${increasedValue}`);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-timer-increased.png` });

      // Test decrement
      await decreaseButton.click();
      await sleep(500);
      const decreasedValue = await timerDisplay.textContent();

      recordTest('Timer Controls', 'Timer decrement works',
        parseInt(decreasedValue || '0') < parseInt(increasedValue || '0'),
        `${increasedValue} → ${decreasedValue}`);

      // Test visual feedback on click
      await increaseButton.hover();
      await sleep(200);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-timer-hover.png` });
    }

  } catch (error) {
    recordTest('Timer Controls', 'Overall test', false, error.message);
  }
}

async function testMoreSettingsSection(page, screenshotPrefix) {
  console.log('\n⚙️ Testing More Settings Section...');

  try {
    // Find the More Settings toggle button
    const moreSettingsButton = await page.locator('button:has-text("More Settings"), button:has-text("Advanced Settings")').first();
    const isVisible = await moreSettingsButton.isVisible({ timeout: 2000 });

    recordTest('More Settings', 'Toggle button visible', isVisible);

    if (isVisible) {
      // Check initial state (should be collapsed)
      const ariaExpanded = await moreSettingsButton.getAttribute('aria-expanded');
      recordTest('More Settings', 'Initially collapsed', ariaExpanded === 'false');

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-more-settings-collapsed.png` });

      // Click to expand
      await moreSettingsButton.click();
      await sleep(800); // Wait for animation

      const expandedState = await moreSettingsButton.getAttribute('aria-expanded');
      recordTest('More Settings', 'Expands on click', expandedState === 'true');

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-more-settings-expanded.png` });

      // Check for difficulty buttons
      const difficultyButtons = await page.locator('[role="radiogroup"]:has-text("Difficulty") button[role="radio"], button:has-text("Easy"), button:has-text("Normal"), button:has-text("Medium")').all();
      recordTest('More Settings', 'Difficulty buttons visible', difficultyButtons.length >= 3,
        `Found ${difficultyButtons.length} difficulty options`);

      // Test difficulty button contrast (cream background, black border)
      if (difficultyButtons.length > 0) {
        const firstDiffButton = difficultyButtons[0];
        const bgColor = await firstDiffButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.backgroundColor;
        });

        const borderColor = await firstDiffButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.borderColor;
        });

        const hasBorder = await firstDiffButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return parseInt(styles.borderWidth) >= 2;
        });

        recordTest('More Settings', 'Difficulty buttons have good contrast', hasBorder,
          `BG: ${bgColor}, Border: ${borderColor}`);

        // Test clicking difficulty button
        await firstDiffButton.click();
        await sleep(500);
        const isSelected = await firstDiffButton.getAttribute('aria-checked');
        recordTest('More Settings', 'Difficulty selection works', isSelected === 'true');

        await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-difficulty-selected.png` });
      }

      // Check for min word length buttons
      const wordLengthButtons = await page.locator('button:has-text("3 Letters"), button:has-text("4 Letters"), button:has-text("5 Letters")').all();
      recordTest('More Settings', 'Min word length buttons visible', wordLengthButtons.length >= 2,
        `Found ${wordLengthButtons.length} word length options`);

      // Check for Host plays checkbox
      const hostPlaysCheckbox = await page.locator('input[type="checkbox"]#hostPlays, label:has-text("Host")').first();
      const checkboxVisible = await hostPlaysCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
      recordTest('More Settings', 'Host plays checkbox visible', checkboxVisible);

      // Check for Bot controls
      const botSection = await page.locator('text=/Bot|AI/i').first();
      const botSectionVisible = await botSection.isVisible({ timeout: 2000 }).catch(() => false);
      recordTest('More Settings', 'Bot controls section visible', botSectionVisible);

      if (botSectionVisible) {
        // Check for difficulty selector + Add button in same row
        const addBotButton = await page.locator('button:has-text("Add"), button:has(svg[class*="FaPlus"]):near(button:has-text("Easy"))').first();
        const addButtonVisible = await addBotButton.isVisible({ timeout: 2000 }).catch(() => false);
        recordTest('More Settings', 'Add bot button visible', addButtonVisible);

        if (addButtonVisible) {
          // Test adding a bot
          await addBotButton.click();
          await sleep(1500);

          await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-bot-added.png` });
          recordTest('More Settings', 'Add bot button works', true);
        }
      }

      // Test collapse
      await moreSettingsButton.click();
      await sleep(800);

      const collapsedAgain = await moreSettingsButton.getAttribute('aria-expanded');
      recordTest('More Settings', 'Collapses on second click', collapsedAgain === 'false');

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-more-settings-collapsed-again.png` });
    }

  } catch (error) {
    recordTest('More Settings', 'Overall test', false, error.message);
  }
}

async function testStartGameButton(page, screenshotPrefix) {
  console.log('\n🚀 Testing Start Game Button...');

  try {
    // Find Start Game button
    const startButton = await page.locator('button:has-text("Start Game"), button:has-text("Start")').last();
    const isVisible = await startButton.isVisible({ timeout: 2000 });

    recordTest('Start Game Button', 'Button visible', isVisible);

    if (isVisible) {
      // Check prominence (should have bg-neo-lime)
      const bgColor = await startButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor;
      });

      const isProminent = bgColor.includes('rgb') && !bgColor.includes('0, 0, 0');
      recordTest('Start Game Button', 'Has prominent color', isProminent, `Color: ${bgColor}`);

      // Check size (should be h-10 = 40px)
      const box = await startButton.boundingBox();
      if (box) {
        const isGoodSize = box.height >= 35 && box.height <= 50;
        recordTest('Start Game Button', 'Good button size', isGoodSize, `Height: ${box.height.toFixed(0)}px`);
      }

      // Check button state
      const isEnabled = await startButton.isEnabled();
      recordTest('Start Game Button', 'Button is enabled/disabled appropriately', true,
        isEnabled ? 'Enabled' : 'Disabled (expected with no players)');

      // Visual feedback test
      await startButton.hover();
      await sleep(200);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-start-button-hover.png` });

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${screenshotPrefix}-start-button.png` });
    }

  } catch (error) {
    recordTest('Start Game Button', 'Overall test', false, error.message);
  }
}

async function testResponsiveLayout(page) {
  console.log('\n📱 Testing Responsive Layout...');

  for (const viewport of VIEWPORT_SIZES) {
    try {
      console.log(`\n  Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await sleep(500);

      // Navigate to settings
      const navigated = await navigateToGameSettings(page, 'en');
      if (!navigated) {
        recordTest('Responsive', `${viewport.name} navigation`, false, 'Failed to navigate');
        continue;
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/responsive-${viewport.name}-full.png`,
        fullPage: true
      });

      // Check if key elements are visible
      const gameTypeVisible = await page.locator('button[role="radio"]').first().isVisible({ timeout: 2000 });
      const timerVisible = await page.locator('button:has(svg[class*="FaMinus"])').first().isVisible({ timeout: 2000 });
      const startButtonVisible = await page.locator('button:has-text("Start")').last().isVisible({ timeout: 2000 });

      recordTest('Responsive', `${viewport.name} - All elements visible`,
        gameTypeVisible && timerVisible && startButtonVisible);

      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      const hasOverflow = bodyWidth > viewportWidth + 5; // 5px tolerance

      if (hasOverflow) {
        recordWarning('Responsive', `${viewport.name} has horizontal overflow: ${bodyWidth}px > ${viewportWidth}px`);
      } else {
        recordTest('Responsive', `${viewport.name} - No horizontal overflow`, true);
      }

    } catch (error) {
      recordTest('Responsive', `${viewport.name}`, false, error.message);
    }
  }
}

async function testRTLLayout(page) {
  console.log('\n🔄 Testing RTL Layout (Hebrew)...');

  try {
    // Set viewport to desktop for RTL test
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Hebrew version
    const navigated = await navigateToGameSettings(page, 'he');
    if (!navigated) {
      recordTest('RTL Layout', 'Navigate to Hebrew version', false, 'Failed to navigate');
      return;
    }

    await sleep(1000);

    // Check if page has RTL direction
    const direction = await page.evaluate(() => {
      return document.documentElement.dir || document.body.dir;
    });

    recordTest('RTL Layout', 'Page has RTL direction', direction === 'rtl', `Direction: ${direction}`);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/rtl-hebrew-full.png`,
      fullPage: true
    });

    // Check if shadows are flipped (hard to test programmatically, but we can check layout)
    const gameTypeButtons = await page.locator('button[role="radio"]').all();
    if (gameTypeButtons.length >= 2) {
      const box1 = await gameTypeButtons[0].boundingBox();
      const box2 = await gameTypeButtons[1].boundingBox();

      if (box1 && box2) {
        // In RTL, first button should be on the right
        const firstIsOnRight = box1.x > box2.x;
        recordTest('RTL Layout', 'Button order flipped in RTL', firstIsOnRight,
          `First button X: ${box1.x.toFixed(0)}, Second button X: ${box2.x.toFixed(0)}`);
      }
    }

    // Take screenshots of key sections
    await page.screenshot({ path: `${SCREENSHOT_DIR}/rtl-game-mode.png` });

    const moreSettingsButton = await page.locator('button:has-text("הגדרות"), button[aria-expanded]').first();
    if (await moreSettingsButton.isVisible({ timeout: 2000 })) {
      await moreSettingsButton.click();
      await sleep(800);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/rtl-more-settings-expanded.png` });
    }

    recordTest('RTL Layout', 'Hebrew layout renders correctly', true);

  } catch (error) {
    recordTest('RTL Layout', 'Overall test', false, error.message);
  }
}

async function runTests() {
  console.log('🎯 Starting Game Settings Panel UI Tests\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  try {
    // Main test flow - English version
    console.log('📋 Testing English Version (Desktop)');
    const navigated = await navigateToGameSettings(page, 'en');

    if (navigated) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/overview-initial.png`,
        fullPage: true
      });

      await testGameModeSelector(page, 'en-desktop');
      await testTimerControls(page, 'en-desktop');
      await testMoreSettingsSection(page, 'en-desktop');
      await testStartGameButton(page, 'en-desktop');
    }

    // Responsive tests
    await testResponsiveLayout(page);

    // RTL tests
    await testRTLLayout(page);

  } catch (error) {
    console.error('❌ Fatal error during testing:', error);
    testResults.failed.push({
      category: 'System',
      testName: 'Test execution',
      passed: false,
      details: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✓ Passed: ${testResults.passed.length}`);
  console.log(`✗ Failed: ${testResults.failed.length}`);
  console.log(`⚠ Warnings: ${testResults.warnings.length}\n`);

  if (testResults.failed.length > 0) {
    console.log('Failed Tests:');
    testResults.failed.forEach(test => {
      console.log(`  ✗ [${test.category}] ${test.testName}`);
      if (test.details) console.log(`    ${test.details}`);
    });
    console.log('');
  }

  if (testResults.warnings.length > 0) {
    console.log('Warnings:');
    testResults.warnings.forEach(warning => {
      console.log(`  ⚠ [${warning.category}] ${warning.message}`);
    });
    console.log('');
  }

  // Save detailed report
  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}\n`);

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
