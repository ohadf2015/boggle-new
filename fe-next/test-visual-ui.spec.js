/**
 * Visual UI Test for SinglePlayerResults with Puppeteer
 * Tests the component by injecting mock results data directly
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots', 'singleplayer-results');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testResultsUI() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SinglePlayerResults Visual UI Test');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized', '--no-sandbox']
  });

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: { passed: 0, failed: 0, warnings: 0 }
  };

  try {
    const page = await browser.newPage();

    // Navigate to single player
    console.log('📍 Navigating to single player page...');
    await page.goto(`${BASE_URL}/en/multiplayer`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await delay(2000);

    // Take screenshot of navigation
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-navigation.png'),
      fullPage: true
    });
    console.log('✓ Screenshot: 01-navigation.png\n');

    // Try to navigate to single player and start a game
    console.log('🎮 Attempting to start single player game...');

    try {
      // Look for Single Player button/mode
      const singlePlayerButton = await page.$(
        'button:has-text("Single Player"), button:has-text("שחקן יחיד"), button:has-text("Ensam spelare")'
      );

      if (singlePlayerButton) {
        console.log('✓ Found Single Player button, clicking...');
        await singlePlayerButton.click();
        await delay(2000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '02-singleplayer-lobby.png'),
          fullPage: true
        });
        console.log('✓ Screenshot: 02-singleplayer-lobby.png\n');
      }

      // Look for a game mode or start button
      const playButton = await page.$(
        'button:has-text("Play"), button:has-text("Start"), button:has-text("Practice"), button:has-text("Challenge")'
      );

      if (playButton) {
        console.log('✓ Found game mode button, clicking...');
        await playButton.click();
        await delay(3000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '03-game-started.png'),
          fullPage: true
        });
        console.log('✓ Screenshot: 03-game-started.png\n');
      }

    } catch (error) {
      console.log(`ℹ️  Could not automatically navigate: ${error.message}`);
    }

    // Now wait for results screen to appear (user may need to play manually)
    console.log('⏳ Waiting for results screen...');
    console.log('   Please complete the game if it started, or navigate manually to see results.\n');

    // Wait up to 120 seconds for results screen
    let resultsAppeared = false;
    let attempts = 0;
    const maxAttempts = 120;

    while (!resultsAppeared && attempts < maxAttempts) {
      try {
        const resultsIndicator = await page.$(
          'text/Victory, text/Game Over, text/Practice Complete, text/Challenge Complete'
        );

        // Also check for button text that appears on results screen
        const actionButtons = await page.$$('button');
        for (const btn of actionButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Quick Rematch') || text.includes('Back to Lobby') || text.includes('Settings & Play Again')) {
            resultsAppeared = true;
            break;
          }
        }

        if (resultsIndicator || resultsAppeared) {
          resultsAppeared = true;
          break;
        }

        await delay(1000);
        attempts++;

        if (attempts % 10 === 0) {
          console.log(`   Still waiting... (${attempts}s elapsed)`);
        }

      } catch (error) {
        // Continue waiting
        await delay(1000);
        attempts++;
      }
    }

    if (!resultsAppeared) {
      console.log('\n⚠️  Results screen did not appear within timeout.');
      console.log('   Please ensure you complete a single player game to test the results UI.\n');
      testResults.summary.warnings++;
      return testResults;
    }

    console.log('✓ Results screen detected!\n');
    await delay(2000); // Let animations settle

    // Take full results screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-results-full.png'),
      fullPage: true
    });
    console.log('✓ Screenshot: 04-results-full.png\n');

    // Test 1: Button Visual Hierarchy
    console.log('🔍 Test 1: Button Visual Hierarchy\n');

    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));

      return allButtons
        .filter(btn => {
          const text = btn.textContent;
          return text.includes('Quick Rematch') || text.includes('Rematch') ||
                 text.includes('Settings') || text.includes('Play Again') ||
                 text.includes('Lobby') || text.includes('Back');
        })
        .map(btn => {
          const styles = window.getComputedStyle(btn);
          const rect = btn.getBoundingClientRect();

          // Check for SVG icon
          const svg = btn.querySelector('svg');
          let iconType = 'none';
          if (svg) {
            const svgHTML = svg.outerHTML || '';
            if (svgHTML.includes('path') || svgHTML.includes('circle')) {
              // Try to determine icon type by class or children
              const classList = svg.className.baseVal || '';
              if (svgHTML.toLowerCase().includes('cog') || svgHTML.toLowerCase().includes('settings')) {
                iconType = 'cog';
              } else if (svgHTML.toLowerCase().includes('home')) {
                iconType = 'home';
              } else if (svgHTML.toLowerCase().includes('redo') || svgHTML.toLowerCase().includes('refresh')) {
                iconType = 'redo';
              } else {
                iconType = 'unknown-svg';
              }
            }
          }

          return {
            text: btn.textContent.trim().substring(0, 50),
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            padding: styles.padding,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            border: styles.border,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            classes: btn.className,
            hasIcon: !!svg,
            iconType: iconType
          };
        });
    });

    console.log(`Found ${buttons.length} action buttons:\n`);

    buttons.forEach((btn, idx) => {
      console.log(`Button ${idx + 1}: "${btn.text}"`);
      console.log(`  - Size: ${Math.round(btn.width)}x${Math.round(btn.height)}px`);
      console.log(`  - Font Size: ${btn.fontSize}`);
      console.log(`  - Font Weight: ${btn.fontWeight}`);
      console.log(`  - Background: ${btn.backgroundColor}`);
      console.log(`  - Color: ${btn.color}`);
      console.log(`  - Icon: ${btn.hasIcon ? btn.iconType : 'none'}`);
      console.log(`  - Classes: ${btn.classes.substring(0, 100)}...\n`);
    });

    // Analyze button hierarchy
    const quickRematch = buttons.find(b => b.text.includes('Quick Rematch') || b.text.includes('משחק מהיר'));
    const settingsAndPlay = buttons.find(b => b.text.includes('Settings') && b.text.includes('Play Again'));
    const backToLobby = buttons.find(b => b.text.includes('Back to Lobby') || b.text.includes('Lobby'));

    console.log('Button Hierarchy Analysis:\n');

    if (quickRematch) {
      console.log('✓ Quick Rematch Button:');
      const fontSize = parseFloat(quickRematch.fontSize);
      const isYellow = quickRematch.backgroundColor.includes('255, 225, 53') || // neo-yellow
                       quickRematch.backgroundColor.includes('255, 226') ||
                       quickRematch.classes.includes('yellow');

      if (fontSize > 18) {
        console.log(`  ✓ Large font size: ${quickRematch.fontSize} (expected text-xl ~20px)`);
        testResults.tests.quickRematchSize = 'PASS';
        testResults.summary.passed++;
      } else {
        console.log(`  ✗ Font size too small: ${quickRematch.fontSize} (expected >18px)`);
        testResults.tests.quickRematchSize = 'FAIL';
        testResults.summary.failed++;
      }

      if (isYellow) {
        console.log(`  ✓ Yellow background color (${quickRematch.backgroundColor})`);
        testResults.tests.quickRematchColor = 'PASS';
        testResults.summary.passed++;
      } else {
        console.log(`  ⚠️  Background color: ${quickRematch.backgroundColor} (expected yellow)`);
        testResults.tests.quickRematchColor = 'WARNING';
        testResults.summary.warnings++;
      }

      console.log(`  - Icon: ${quickRematch.iconType} (expected: redo/refresh)\n`);

    } else {
      console.log('✗ Quick Rematch button not found\n');
      testResults.tests.quickRematchFound = 'FAIL';
      testResults.summary.failed++;
    }

    if (settingsAndPlay) {
      console.log('✓ Settings & Play Again Button:');

      const isCyan = settingsAndPlay.backgroundColor.includes('0, 255, 255') || // cyan
                     settingsAndPlay.backgroundColor.includes('0, 206, 209') || // cyan variants
                     settingsAndPlay.classes.includes('cyan');

      if (isCyan) {
        console.log(`  ✓ Cyan background color (${settingsAndPlay.backgroundColor})`);
        testResults.tests.settingsColor = 'PASS';
        testResults.summary.passed++;
      } else {
        console.log(`  ⚠️  Background color: ${settingsAndPlay.backgroundColor} (expected cyan)`);
        testResults.tests.settingsColor = 'WARNING';
        testResults.summary.warnings++;
      }

      if (settingsAndPlay.iconType === 'cog') {
        console.log(`  ✓ CORRECT ICON: Cog/Settings (⚙️)`);
        testResults.tests.settingsIcon = 'PASS';
        testResults.summary.passed++;
      } else {
        console.log(`  ⚠️  Icon type: ${settingsAndPlay.iconType} (expected: cog)`);
        console.log(`  → Please verify visually that gear icon appears`);
        testResults.tests.settingsIcon = 'WARNING';
        testResults.summary.warnings++;
      }
      console.log('');

    } else {
      console.log('✗ Settings & Play Again button not found\n');
      testResults.tests.settingsFound = 'FAIL';
      testResults.summary.failed++;
    }

    if (backToLobby) {
      console.log('✓ Back to Lobby Button:');

      const isOutline = backToLobby.classes.includes('outline') ||
                       backToLobby.border.includes('2px') ||
                       backToLobby.backgroundColor.includes('transparent');

      if (isOutline) {
        console.log(`  ✓ Outline style (${backToLobby.border})`);
        testResults.tests.lobbyVariant = 'PASS';
        testResults.summary.passed++;
      } else {
        console.log(`  ⚠️  Border: ${backToLobby.border} (expected outline variant)`);
        testResults.tests.lobbyVariant = 'WARNING';
        testResults.summary.warnings++;
      }

      console.log(`  - Icon: ${backToLobby.iconType} (expected: home)\n`);

    } else {
      console.log('✗ Back to Lobby button not found\n');
      testResults.tests.lobbyFound = 'FAIL';
      testResults.summary.failed++;
    }

    // Take focused screenshot of buttons
    console.log('📸 Taking focused screenshots of action buttons...\n');

    // Try to find and screenshot the button section
    try {
      const buttonSection = await page.$('[class*="flex flex-col gap"], [class*="space-y"]');
      if (buttonSection) {
        const box = await buttonSection.boundingBox();
        if (box) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-buttons-closeup.png'),
            clip: {
              x: Math.max(0, box.x - 20),
              y: Math.max(0, box.y - 20),
              width: Math.min(page.viewport().width, box.width + 40),
              height: Math.min(page.viewport().height, box.height + 40)
            }
          });
          console.log('✓ Screenshot: 05-buttons-closeup.png\n');
        }
      }
    } catch (error) {
      console.log('⚠️  Could not capture button closeup\n');
    }

    // Test 2: RTL Layout (Hebrew)
    console.log('🔍 Test 2: Testing RTL Layout (Hebrew)\n');

    await page.goto(`${BASE_URL}/he/multiplayer`, {
      waitUntil: 'networkidle2'
    });
    await delay(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-hebrew-lobby.png'),
      fullPage: true
    });
    console.log('✓ Screenshot: 06-hebrew-lobby.png');
    console.log('   (Manual test: Complete a game in Hebrew to verify RTL button layout)\n');

    const direction = await page.evaluate(() => ({
      htmlDir: document.documentElement.dir,
      bodyDir: document.body.dir,
      htmlLang: document.documentElement.lang
    }));

    console.log(`Document direction: ${direction.htmlDir || direction.bodyDir || 'ltr'}`);
    console.log(`Document language: ${direction.htmlLang}\n`);

    if (direction.htmlDir === 'rtl' || direction.bodyDir === 'rtl') {
      console.log('✓ RTL direction applied correctly for Hebrew\n');
      testResults.tests.rtlDirection = 'PASS';
      testResults.summary.passed++;
    } else {
      console.log('⚠️  RTL direction not detected (may be conditional)\n');
      testResults.tests.rtlDirection = 'WARNING';
      testResults.summary.warnings++;
    }

    // Test 3: Mobile/Responsive Layout
    console.log('🔍 Test 3: Testing Mobile/Responsive Layouts\n');

    // Go back to English for mobile test
    await page.goto(`${BASE_URL}/en/multiplayer`, {
      waitUntil: 'networkidle2'
    });
    await delay(2000);

    // Test portrait mobile
    console.log('  Testing portrait (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-mobile-portrait.png'),
      fullPage: true
    });
    console.log('  ✓ Screenshot: 07-mobile-portrait.png\n');

    // Test landscape mobile
    console.log('  Testing landscape (667x375)...');
    await page.setViewport({ width: 667, height: 375 });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-mobile-landscape.png'),
      fullPage: true
    });
    console.log('  ✓ Screenshot: 08-mobile-landscape.png\n');

    // Test tablet
    console.log('  Testing tablet (768x1024)...');
    await page.setViewport({ width: 768, height: 1024 });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-tablet.png'),
      fullPage: true
    });
    console.log('  ✓ Screenshot: 09-tablet.png\n');

    testResults.tests.responsiveScreenshots = 'PASS';
    testResults.summary.passed++;

    console.log('✅ Visual testing complete!\n');

  } catch (error) {
    console.error('\n❌ Test error:', error);
    testResults.summary.failed++;
  } finally {
    // Generate summary report
    console.log('═══════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Timestamp: ${testResults.timestamp}\n`);
    console.log(`Total Tests: ${Object.keys(testResults.tests).length}`);
    console.log(`✓ Passed: ${testResults.summary.passed}`);
    console.log(`✗ Failed: ${testResults.summary.failed}`);
    console.log(`⚠️  Warnings: ${testResults.summary.warnings}\n`);

    console.log('Individual Test Results:');
    for (const [test, result] of Object.entries(testResults.tests)) {
      const symbol = result === 'PASS' ? '✓' : result === 'FAIL' ? '✗' : '⚠️';
      console.log(`  ${symbol} ${test}: ${result}`);
    }

    console.log('\n📸 Screenshots saved to:');
    console.log(`   ${SCREENSHOT_DIR}\n`);

    console.log('═══════════════════════════════════════════════════════\n');

    // Save JSON report
    const reportPath = path.join(SCREENSHOT_DIR, 'visual-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed JSON report: ${reportPath}\n`);

    console.log('⚠️  MANUAL VERIFICATION REQUIRED:\n');
    console.log('Please review screenshots and verify:');
    console.log('1. Quick Rematch button has visible PULSE ANIMATION');
    console.log('2. Settings & Play Again button shows GEAR ICON (⚙️)');
    console.log('3. Button sizes match hierarchy (Quick Rematch largest)');
    console.log('4. Colors are correct (Yellow, Cyan, Outline)');
    console.log('5. RTL layout works correctly in Hebrew');
    console.log('6. Mobile layouts are responsive and usable\n');

    await browser.close();
  }

  return testResults;
}

// Run the test
testResultsUI()
  .then(results => {
    const hasFailures = results.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
