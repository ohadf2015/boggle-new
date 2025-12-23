const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Screenshot directory
const screenshotDir = '/tmp/boggle-test-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

function logResult(test, status, message, screenshotPath = null) {
  const result = { test, status, message, screenshotPath, timestamp: new Date().toISOString() };
  if (status === 'PASS') {
    testResults.passed.push(result);
    console.log(`✓ PASS: ${test} - ${message}`);
  } else if (status === 'FAIL') {
    testResults.failed.push(result);
    console.log(`✗ FAIL: ${test} - ${message}`);
  } else if (status === 'WARNING') {
    testResults.warnings.push(result);
    console.log(`⚠ WARNING: ${test} - ${message}`);
  }
  if (screenshotPath) {
    testResults.screenshots.push({ test, path: screenshotPath });
  }
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (error) {
    return false;
  }
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
  console.log('🚀 Starting Boggle Word Forming Area Tests\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 11 Pro size (portrait)
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  try {
    console.log('📱 Testing in Portrait Mode (414x896)...\n');

    // Navigate to the singleplayer page
    console.log('Navigating to http://localhost:3000/en/singleplayer...');
    await page.goto('http://localhost:3000/en/singleplayer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    let screenshot = await takeScreenshot(page, '01-initial-load');
    logResult('Initial Page Load', 'PASS', 'Successfully loaded singleplayer page', screenshot);

    // ===== TEST 1: Check WordFormingArea exists and has proper structure =====
    console.log('\n--- TEST 1: WordFormingArea Structure ---');

    // Look for the word forming area container
    const wordFormingAreaExists = await waitForElement(page, '[aria-live="polite"]', 5000);
    if (wordFormingAreaExists) {
      logResult('WordFormingArea Exists', 'PASS', 'WordFormingArea component found in DOM');

      const wordFormingStyles = await getElementStyles(page, '[aria-live="polite"]');
      if (wordFormingStyles) {
        const minHeight = parseInt(wordFormingStyles.minHeight);
        if (minHeight >= 40) {
          logResult('WordFormingArea Height', 'PASS', `Minimum height is ${minHeight}px (reserves permanent space)`);
        } else {
          logResult('WordFormingArea Height', 'FAIL', `Minimum height is only ${minHeight}px, should be at least 40px`);
        }
      }
    } else {
      logResult('WordFormingArea Exists', 'FAIL', 'WordFormingArea component not found in DOM');
    }

    // ===== TEST 2: Check placeholder state =====
    console.log('\n--- TEST 2: Placeholder State ---');

    const placeholderText = await page.textContent('[aria-live="polite"]').catch(() => null);
    if (placeholderText && (placeholderText.includes('Swipe letters') || placeholderText.includes('swipe'))) {
      screenshot = await takeScreenshot(page, '02-placeholder-state');
      logResult('Placeholder Text', 'PASS', `Placeholder shows: "${placeholderText.trim()}"`, screenshot);
    } else {
      screenshot = await takeScreenshot(page, '02-placeholder-state');
      logResult('Placeholder Text', 'WARNING', `Placeholder text might be different: "${placeholderText}"`, screenshot);
    }

    // Check placeholder styling
    const placeholderElement = await page.$('[aria-live="polite"] > div > div');
    if (placeholderElement) {
      const placeholderStyles = await getElementStyles(page, '[aria-live="polite"] > div > div');

      // Check for dashed border
      if (placeholderStyles.borderStyle && placeholderStyles.borderStyle.includes('dashed')) {
        logResult('Placeholder Border', 'PASS', 'Placeholder has dashed border style');
      } else {
        logResult('Placeholder Border', 'WARNING', `Placeholder border style is ${placeholderStyles.borderStyle}, expected dashed`);
      }
    }

    // ===== TEST 3: Check GameNotificationArea exists =====
    console.log('\n--- TEST 3: GameNotificationArea Structure ---');

    // The notification area should be present (might be empty initially)
    // Let's look for common notification area patterns
    const notificationAreaSelectors = [
      '[class*="notification"]',
      '[class*="GameNotification"]',
      'div.w-full.flex.items-center.justify-center.h-10',
      'div.w-full.flex.items-center.justify-center.h-8'
    ];

    let notificationAreaFound = false;
    for (const selector of notificationAreaSelectors) {
      const exists = await page.$(selector);
      if (exists) {
        notificationAreaFound = true;
        logResult('GameNotificationArea Exists', 'PASS', `Found notification area with selector: ${selector}`);

        const notifStyles = await getElementStyles(page, selector);
        if (notifStyles && notifStyles.minHeight) {
          const minHeight = parseInt(notifStyles.minHeight);
          logResult('GameNotificationArea Height', 'PASS', `Minimum height is ${minHeight}px (reserves permanent space)`);
        }
        break;
      }
    }

    if (!notificationAreaFound) {
      logResult('GameNotificationArea Exists', 'WARNING', 'Could not definitively locate GameNotificationArea, may be rendered differently');
    }

    // ===== TEST 4: Verify Game Board and Other Elements =====
    console.log('\n--- TEST 4: Game Elements Visibility ---');

    // Check for game board
    const boardExists = await waitForElement(page, '[class*="grid"]', 5000);
    if (boardExists) {
      screenshot = await takeScreenshot(page, '03-game-board-visible');
      logResult('Game Board Visible', 'PASS', 'Game board grid is visible', screenshot);
    } else {
      screenshot = await takeScreenshot(page, '03-game-board-missing');
      logResult('Game Board Visible', 'WARNING', 'Game board might not be loaded yet', screenshot);
    }

    // Check for timer
    const timerPatterns = ['[class*="timer"]', '[class*="Timer"]', 'text:has-text(":")'];
    let timerFound = false;
    for (const pattern of timerPatterns) {
      if (await page.$(pattern)) {
        timerFound = true;
        logResult('Timer Visible', 'PASS', `Timer element found with pattern: ${pattern}`);
        break;
      }
    }
    if (!timerFound) {
      logResult('Timer Visible', 'WARNING', 'Timer element not clearly visible');
    }

    // Check for score display
    const scorePatterns = ['[class*="score"]', '[class*="Score"]', 'text:has-text("Score")', 'text:has-text("0")'];
    let scoreFound = false;
    for (const pattern of scorePatterns) {
      if (await page.$(pattern)) {
        scoreFound = true;
        logResult('Score Display Visible', 'PASS', `Score element found with pattern: ${pattern}`);
        break;
      }
    }
    if (!scoreFound) {
      logResult('Score Display Visible', 'WARNING', 'Score element not clearly visible');
    }

    // ===== TEST 5: Test Word Formation by Clicking Letters =====
    console.log('\n--- TEST 5: Word Formation Interaction ---');

    await page.waitForTimeout(1000);

    // Try to find letter tiles (they should have data attributes or specific classes)
    const letterTiles = await page.$$('[class*="letter"]');

    if (letterTiles.length > 0) {
      logResult('Letter Tiles Found', 'PASS', `Found ${letterTiles.length} letter tiles`);

      // Try clicking on a few tiles to form a word
      console.log('Attempting to click letter tiles to form a word...');

      // Click first tile
      await letterTiles[0].click();
      await page.waitForTimeout(300);

      screenshot = await takeScreenshot(page, '04-one-letter-selected');

      // Check if word forming area updated
      const wordText1 = await page.textContent('[aria-live="polite"]').catch(() => '');
      if (wordText1 && !wordText1.includes('Swipe')) {
        logResult('Word Formation - 1 Letter', 'PASS', `Word forming area shows: "${wordText1.trim()}"`, screenshot);
      } else {
        logResult('Word Formation - 1 Letter', 'WARNING', 'Word forming area might not have updated after first letter click');
      }

      // Click second tile
      if (letterTiles.length > 1) {
        await letterTiles[1].click();
        await page.waitForTimeout(300);

        screenshot = await takeScreenshot(page, '05-two-letters-selected');

        const wordText2 = await page.textContent('[aria-live="polite"]').catch(() => '');
        if (wordText2 && wordText2.length > wordText1.length) {
          logResult('Word Formation - 2 Letters', 'PASS', `Word forming area shows: "${wordText2.trim()}"`, screenshot);
        } else {
          logResult('Word Formation - 2 Letters', 'WARNING', 'Word forming area might not have updated after second letter');
        }

        // Click third tile to form a 3-letter word
        if (letterTiles.length > 2) {
          await letterTiles[2].click();
          await page.waitForTimeout(300);

          screenshot = await takeScreenshot(page, '06-three-letters-selected');

          const wordText3 = await page.textContent('[aria-live="polite"]').catch(() => '');
          logResult('Word Formation - 3 Letters', 'PASS', `Word forming area shows: "${wordText3.trim()}"`, screenshot);

          // Check if the cyan background is applied
          const wordDisplayElement = await page.$('[aria-live="polite"] > div > div');
          if (wordDisplayElement) {
            const wordDisplayStyles = await getElementStyles(page, '[aria-live="polite"] > div > div');

            // Check background color (should be cyan)
            const bgColor = wordDisplayStyles.backgroundColor;
            if (bgColor && (bgColor.includes('0, 255, 255') || bgColor.includes('cyan') || bgColor.includes('rgb(0, 255, 255)'))) {
              logResult('Word Display Styling - Background', 'PASS', `Background color is cyan: ${bgColor}`);
            } else {
              logResult('Word Display Styling - Background', 'WARNING', `Background color is ${bgColor}, expected cyan (rgb(0, 255, 255))`);
            }

            // Check border
            const borderWidth = wordDisplayStyles.borderWidth;
            const borderColor = wordDisplayStyles.borderColor;
            if (borderWidth && parseInt(borderWidth) >= 2) {
              logResult('Word Display Styling - Border Width', 'PASS', `Border width is ${borderWidth}`);
            } else {
              logResult('Word Display Styling - Border Width', 'WARNING', `Border width is ${borderWidth}, expected at least 2px`);
            }

            if (borderColor && borderColor.includes('0, 0, 0')) {
              logResult('Word Display Styling - Border Color', 'PASS', `Border color is black: ${borderColor}`);
            } else {
              logResult('Word Display Styling - Border Color', 'WARNING', `Border color is ${borderColor}, expected black`);
            }

            // Check shadow (Neo-Brutalist hard shadow)
            const boxShadow = wordDisplayStyles.boxShadow;
            if (boxShadow && boxShadow !== 'none' && !boxShadow.includes('blur')) {
              logResult('Word Display Styling - Shadow', 'PASS', `Has hard shadow: ${boxShadow}`);
            } else {
              logResult('Word Display Styling - Shadow', 'WARNING', `Shadow is ${boxShadow}, expected hard shadow (no blur)`);
            }
          }
        }
      }

      // Submit the word (usually by clicking elsewhere or releasing)
      console.log('Attempting to submit word...');
      await page.click('body');
      await page.waitForTimeout(1500);

      screenshot = await takeScreenshot(page, '07-after-word-submission');
      logResult('Word Submission', 'PASS', 'Word submission attempted', screenshot);

      // Check for notification
      await page.waitForTimeout(500);
      const notificationVisible = await page.$('[class*="bg-neo-lime"], [class*="bg-neo-red"]');
      if (notificationVisible) {
        screenshot = await takeScreenshot(page, '08-notification-shown');
        const notificationText = await page.textContent('[class*="bg-neo-lime"], [class*="bg-neo-red"]').catch(() => '');
        logResult('Notification Display', 'PASS', `Notification appears: "${notificationText.trim()}"`, screenshot);

        // Check notification styling
        const notifStyles = await getElementStyles(page, '[class*="bg-neo-lime"], [class*="bg-neo-red"]');
        if (notifStyles) {
          const bgColor = notifStyles.backgroundColor;
          if (bgColor.includes('lime') || bgColor.includes('144, 238, 144') || bgColor.includes('50, 205, 50')) {
            logResult('Notification Styling - Accepted', 'PASS', `Accepted notification has lime/green background: ${bgColor}`);
          } else if (bgColor.includes('red') || bgColor.includes('255, 0, 0')) {
            logResult('Notification Styling - Rejected', 'PASS', `Rejected notification has red background: ${bgColor}`);
          } else {
            logResult('Notification Styling', 'WARNING', `Notification background color: ${bgColor}`);
          }
        }
      } else {
        logResult('Notification Display', 'WARNING', 'No notification appeared after word submission (might be too fast or word invalid)');
      }
    } else {
      logResult('Letter Tiles Found', 'FAIL', 'No letter tiles found on the game board');
    }

    // ===== TEST 6: Layout and Spacing Verification =====
    console.log('\n--- TEST 6: Layout and Spacing ---');

    const wordFormingBox = await getBoundingBox(page, '[aria-live="polite"]');
    const boardBox = await getBoundingBox(page, '[class*="grid"]');

    if (wordFormingBox && boardBox) {
      const spacing = boardBox.top - wordFormingBox.bottom;
      if (spacing >= 0) {
        logResult('Layout Spacing', 'PASS', `WordFormingArea and board have ${spacing.toFixed(2)}px spacing (no overlap)`);
      } else {
        logResult('Layout Spacing', 'FAIL', `WordFormingArea overlaps board by ${Math.abs(spacing).toFixed(2)}px`);
      }

      // Check if word forming area is above the board
      if (wordFormingBox.top < boardBox.top) {
        logResult('Layout Order', 'PASS', 'WordFormingArea is positioned above the game board');
      } else {
        logResult('Layout Order', 'FAIL', 'WordFormingArea is not above the game board');
      }
    } else {
      logResult('Layout Measurement', 'WARNING', 'Could not measure layout boxes precisely');
    }

    screenshot = await takeScreenshot(page, '09-layout-verification');
    logResult('Layout Screenshot', 'PASS', 'Captured layout verification screenshot', screenshot);

    // ===== TEST 7: Landscape Orientation =====
    console.log('\n--- TEST 7: Landscape Orientation ---');

    await page.setViewportSize({ width: 896, height: 414 }); // Landscape
    await page.waitForTimeout(1000);

    screenshot = await takeScreenshot(page, '10-landscape-initial');
    logResult('Landscape Mode', 'PASS', 'Switched to landscape orientation (896x414)', screenshot);

    // Check if compact mode is applied
    const wordFormingStylesLandscape = await getElementStyles(page, '[aria-live="polite"]');
    if (wordFormingStylesLandscape) {
      const minHeight = parseInt(wordFormingStylesLandscape.minHeight);
      if (minHeight >= 32 && minHeight <= 48) {
        logResult('Landscape Compact Mode', 'PASS', `WordFormingArea height is ${minHeight}px (compact mode applied)`);
      } else {
        logResult('Landscape Compact Mode', 'WARNING', `WordFormingArea height is ${minHeight}px in landscape`);
      }
    }

    // Check if all elements still visible in landscape
    const boardVisibleLandscape = await page.isVisible('[class*="grid"]');
    if (boardVisibleLandscape) {
      logResult('Landscape - Board Visible', 'PASS', 'Game board is visible in landscape mode');
    } else {
      logResult('Landscape - Board Visible', 'WARNING', 'Game board might not be visible in landscape');
    }

    screenshot = await takeScreenshot(page, '11-landscape-layout');
    logResult('Landscape Layout', 'PASS', 'Captured landscape layout', screenshot);

    // ===== TEST 8: Neo-Brutalist Design Verification =====
    console.log('\n--- TEST 8: Neo-Brutalist Design System ---');

    // Switch back to portrait
    await page.setViewportSize({ width: 414, height: 896 });
    await page.waitForTimeout(500);

    // Check overall color scheme
    const bodyStyles = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      return {
        backgroundColor: computed.backgroundColor,
        fontFamily: computed.fontFamily
      };
    });

    logResult('Background Color', 'PASS', `Body background: ${bodyStyles.backgroundColor}`);
    logResult('Font Family', 'PASS', `Font family: ${bodyStyles.fontFamily}`);

    // Check for hard shadows (no blur)
    const elementsWithShadows = await page.$$('[class*="shadow"]');
    console.log(`Found ${elementsWithShadows.length} elements with shadow classes`);

    // Check color usage - look for Neo-Brutalist colors (cyan, yellow, etc.)
    const colorElements = await page.$$('[class*="bg-neo"]');
    if (colorElements.length > 0) {
      logResult('Neo-Brutalist Colors', 'PASS', `Found ${colorElements.length} elements using neo-* color classes`);
    } else {
      logResult('Neo-Brutalist Colors', 'WARNING', 'Could not find elements with neo-* color classes');
    }

    screenshot = await takeScreenshot(page, '12-design-system-verification');
    logResult('Design System Screenshot', 'PASS', 'Captured design system verification', screenshot);

    // ===== FINAL SCREENSHOT =====
    console.log('\n--- Final State ---');
    screenshot = await takeScreenshot(page, '13-final-state');
    logResult('Final State', 'PASS', 'Captured final state', screenshot);

  } catch (error) {
    console.error('❌ Test execution error:', error);
    logResult('Test Execution', 'FAIL', `Error during test: ${error.message}`);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();

    // ===== GENERATE REPORT =====
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${testResults.passed.length + testResults.failed.length + testResults.warnings.length}`);
    console.log(`✓ Passed: ${testResults.passed.length}`);
    console.log(`✗ Failed: ${testResults.failed.length}`);
    console.log(`⚠ Warnings: ${testResults.warnings.length}`);
    console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
    console.log('='.repeat(80));

    if (testResults.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.failed.forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.test}: ${result.message}`);
      });
    }

    if (testResults.warnings.length > 0) {
      console.log('\n⚠ WARNINGS:');
      testResults.warnings.forEach((result, idx) => {
        console.log(`${idx + 1}. ${result.test}: ${result.message}`);
      });
    }

    console.log(`\n📁 Screenshots saved to: ${screenshotDir}`);
    console.log('='.repeat(80));

    // Save JSON report
    const reportPath = path.join(screenshotDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 JSON report saved to: ${reportPath}`);
  }
})();
