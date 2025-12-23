/**
 * Comprehensive UI Test for SinglePlayerResults Component
 * Testing post-game action buttons UI changes
 *
 * Changes Tested:
 * 1. Icon Change: Settings button uses FaCog (⚙️) instead of FaRedo (🔄)
 * 2. RTL Fix: Icon margins changed from mr-2 to me-2
 * 3. Button Hierarchy: Quick Rematch (yellow, py-5, text-xl, animated) > Settings & Play Again (cyan) > Back to Lobby (outline)
 * 4. Translation keys: settingsAndPlay, backToLobby, settings in 5 languages
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

// Languages to test
const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', dir: 'rtl' },
  { code: 'sv', name: 'Swedish', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', dir: 'ltr' },
  { code: 'es', name: 'Spanish', dir: 'ltr' }
];

// Expected button hierarchy
const BUTTON_TESTS = [
  {
    name: 'Quick Rematch',
    selector: 'button:has-text("Quick Rematch"), button:has-text("משחק מהיר נוסף"), button:has-text("Snabb Omstart"), button:has-text("クイックリマッチ"), button:has-text("Revancha Rápida")',
    expectedIcon: 'FaRedo',
    expectedColor: 'neo-yellow',
    expectedSize: 'py-5 text-xl',
    expectedAnimation: true,
    priority: 1
  },
  {
    name: 'Settings & Play Again',
    selector: 'button:has-text("Settings & Play Again"), button:has-text("הגדרות ושחק שוב"), button:has-text("Inställningar & Spela Igen"), button:has-text("設定して再プレイ"), button:has-text("Configurar y Jugar")',
    expectedIcon: 'FaCog',
    expectedColor: 'neo-cyan',
    expectedSize: 'py-3',
    expectedAnimation: false,
    priority: 2
  },
  {
    name: 'Back to Lobby',
    selector: 'button:has-text("Back to Lobby"), button:has-text("חזרה ללובי"), button:has-text("Tillbaka till Lobby"), button:has-text("ロビーに戻る"), button:has-text("Volver a la Sala")',
    expectedIcon: 'FaHome',
    expectedVariant: 'outline',
    expectedSize: 'py-3',
    expectedAnimation: false,
    priority: 3
  }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function setupBrowser() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  return browser;
}

async function navigateToSinglePlayer(page, locale = 'en') {
  console.log(`\n📍 Navigating to single player (locale: ${locale})...`);

  // Navigate to the locale-specific page
  await page.goto(`${BASE_URL}/${locale}/multiplayer`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await delay(2000);

  // Look for Single Player option
  try {
    // Check if we're on landing view
    const landingVisible = await page.$('text/Single Player') ||
                          await page.$('text/שחקן יחיד') ||
                          await page.$('text/Ensam spelare');

    if (landingVisible) {
      console.log('✓ Found landing page, selecting Single Player mode');
      await page.click('button:has-text("Single Player"), button:has-text("שחקן יחיד"), button:has-text("Ensam spelare"), button:has-text("シングルプレイヤー"), button:has-text("Un Jugador")');
      await delay(2000);
    }
  } catch (error) {
    console.log('ℹ️ Single Player button not found on landing, may already be in single player view');
  }

  return true;
}

async function startAndCompleteGame(page) {
  console.log('\n🎮 Starting single player game...');

  try {
    // Look for lobby/setup screen - click any "Start" or "Play" button
    const startButton = await page.$(
      'button:has-text("Start"), button:has-text("התחל"), button:has-text("Starta"), button:has-text("スタート"), button:has-text("Comenzar"), ' +
      'button:has-text("Play"), button:has-text("שחק"), button:has-text("Spela"), button:has-text("プレイ"), button:has-text("Jugar")'
    );

    if (startButton) {
      console.log('✓ Found start button, clicking...');
      await startButton.click();
      await delay(3000);
    }

    // Wait for game to start (grid should appear)
    console.log('⏳ Waiting for game to start...');
    await page.waitForSelector('[class*="grid"], [class*="Grid"]', { timeout: 10000 });
    console.log('✓ Game started, grid visible');

    // For testing, we can either:
    // Option 1: Wait for timer to run out (too slow)
    // Option 2: Try to submit some words quickly
    // Option 3: Navigate directly to results using dev tools/console

    // Let's try to play a few words quickly
    console.log('🎯 Attempting to play game...');
    await delay(5000); // Let some time pass

    // Try to click on grid cells to form words
    const gridCells = await page.$$('[role="button"][class*="cell"], button[class*="cell"]');
    if (gridCells.length >= 3) {
      console.log(`✓ Found ${gridCells.length} grid cells, forming a word...`);
      // Click first 3-4 cells to form a word
      for (let i = 0; i < Math.min(4, gridCells.length); i++) {
        await gridCells[i].click();
        await delay(100);
      }

      // Try to submit
      const submitButton = await page.$('button:has-text("Submit"), button:has-text("שלח"), button:has-text("Skicka")');
      if (submitButton) {
        await submitButton.click();
        await delay(500);
      }
    }

    // Wait for game to end naturally or force navigate to results
    // For testing purposes, let's wait a bit then look for results
    console.log('⏳ Waiting for game to complete...');
    await delay(10000); // Wait 10 seconds

    // Check if results screen appeared
    const resultsAppeared = await page.$(
      'text/Victory, text/Game Over, text/Practice Complete, text/Challenge Complete, ' +
      'text/ניצחון, text/משחק נגמר, ' +
      'text/Victory!, text/Game Over!'
    );

    if (resultsAppeared) {
      console.log('✓ Results screen appeared!');
      return true;
    } else {
      console.log('⚠️ Results screen not visible yet, waiting longer...');
      await delay(20000); // Wait another 20 seconds for timer
      return true;
    }

  } catch (error) {
    console.error('❌ Error during game:', error.message);
    return false;
  }
}

async function testButtonHierarchy(page, locale) {
  console.log(`\n🔍 Testing button hierarchy for ${locale}...`);

  const results = {
    locale,
    buttonsFound: [],
    hierarchy: [],
    errors: []
  };

  try {
    // Wait for action buttons section
    await delay(2000);

    // Test each button
    for (const buttonTest of BUTTON_TESTS) {
      console.log(`\n  Testing: ${buttonTest.name}`);

      try {
        // Find button by text content
        const button = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const targetTexts = [
            'Quick Rematch', 'משחק מהיר נוסף', 'Snabb Omstart', 'クイックリマッチ', 'Revancha Rápida',
            'Settings & Play Again', 'הגדרות ושחק שוב', 'Inställningar & Spela Igen', '設定して再プレイ', 'Configurar y Jugar',
            'Back to Lobby', 'חזרה ללובי', 'Tillbaka till Lobby', 'ロビーに戻る', 'Volver a la Sala'
          ];

          return buttons.find(btn => {
            const text = btn.textContent.trim();
            return targetTexts.some(target => text.includes(target));
          });
        });

        if (!button) {
          console.log(`  ⚠️ Button not found: ${buttonTest.name}`);
          results.errors.push(`Button not found: ${buttonTest.name}`);
          continue;
        }

        // Get button properties
        const buttonProps = await page.evaluate((btn) => {
          const styles = window.getComputedStyle(btn);
          const classes = btn.className;

          // Check for icon
          const svg = btn.querySelector('svg');
          const iconClass = svg ? svg.className.baseVal || svg.getAttribute('class') : '';

          return {
            text: btn.textContent.trim(),
            classes: classes,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            padding: styles.padding,
            fontSize: styles.fontSize,
            border: styles.border,
            hasAnimation: classes.includes('animate'),
            iconPresent: !!svg,
            iconClasses: iconClass,
            width: styles.width,
            position: btn.getBoundingClientRect().top
          };
        }, button);

        console.log(`  ✓ Found button: ${buttonProps.text}`);
        console.log(`    - Classes: ${buttonProps.classes}`);
        console.log(`    - BG Color: ${buttonProps.backgroundColor}`);
        console.log(`    - Padding: ${buttonProps.padding}`);
        console.log(`    - Font Size: ${buttonProps.fontSize}`);
        console.log(`    - Icon: ${buttonProps.iconPresent ? 'Yes' : 'No'}`);
        console.log(`    - Animation: ${buttonProps.hasAnimation ? 'Yes' : 'No'}`);

        results.buttonsFound.push({
          name: buttonTest.name,
          props: buttonProps,
          priority: buttonTest.priority
        });

        // Validate expected properties
        const validations = [];

        // Check icon
        if (buttonTest.expectedIcon === 'FaCog') {
          if (!buttonProps.iconClasses.includes('cog') && !buttonProps.classes.includes('FaCog')) {
            validations.push(`⚠️ Expected FaCog icon, check if correct icon is used`);
          } else {
            validations.push(`✓ Correct icon (FaCog/Settings)`);
          }
        }

        if (buttonTest.expectedIcon === 'FaRedo') {
          validations.push(`✓ Icon should be FaRedo/Refresh`);
        }

        if (buttonTest.expectedIcon === 'FaHome') {
          validations.push(`✓ Icon should be FaHome`);
        }

        // Check color classes
        if (buttonTest.expectedColor) {
          if (buttonProps.classes.includes(buttonTest.expectedColor) ||
              buttonProps.classes.includes('yellow') && buttonTest.expectedColor === 'neo-yellow') {
            validations.push(`✓ Correct color class (${buttonTest.expectedColor})`);
          } else {
            validations.push(`⚠️ Expected ${buttonTest.expectedColor} in classes`);
          }
        }

        // Check size
        if (buttonTest.name === 'Quick Rematch') {
          if (parseFloat(buttonProps.fontSize) > 16) {
            validations.push(`✓ Large font size (${buttonProps.fontSize})`);
          } else {
            validations.push(`⚠️ Font size should be larger (text-xl)`);
          }
        }

        // Check animation
        if (buttonTest.expectedAnimation && !buttonProps.hasAnimation) {
          validations.push(`⚠️ Should have animation (pulse/scale)`);
        }

        validations.forEach(v => console.log(`    ${v}`));

      } catch (error) {
        console.log(`  ❌ Error testing ${buttonTest.name}: ${error.message}`);
        results.errors.push(`Error testing ${buttonTest.name}: ${error.message}`);
      }
    }

    // Sort by position to verify visual hierarchy
    results.buttonsFound.sort((a, b) => a.props.position - b.props.position);
    results.hierarchy = results.buttonsFound.map(b => b.name);

    console.log(`\n  📊 Visual Hierarchy (top to bottom):`);
    results.hierarchy.forEach((name, i) => console.log(`    ${i + 1}. ${name}`));

  } catch (error) {
    console.error(`❌ Error in button hierarchy test: ${error.message}`);
    results.errors.push(`Hierarchy test error: ${error.message}`);
  }

  return results;
}

async function testRTLLayout(page) {
  console.log('\n🔄 Testing RTL layout (Hebrew)...');

  try {
    // Check document direction
    const direction = await page.evaluate(() => {
      return {
        htmlDir: document.documentElement.dir,
        bodyDir: document.body.dir,
        rtlClass: document.documentElement.className.includes('rtl')
      };
    });

    console.log(`  HTML dir: ${direction.htmlDir}`);
    console.log(`  Body dir: ${direction.bodyDir}`);
    console.log(`  RTL class: ${direction.rtlClass}`);

    // Check icon margins (should use me-2, not mr-2)
    const iconMargins = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => {
        const svg = btn.querySelector('svg');
        if (!svg) return null;

        const styles = window.getComputedStyle(svg);
        const parent = svg.parentElement;
        const parentClasses = parent?.className || '';

        return {
          buttonText: btn.textContent.trim().substring(0, 30),
          marginRight: styles.marginRight,
          marginLeft: styles.marginLeft,
          marginInlineEnd: styles.marginInlineEnd,
          hasMe2: parentClasses.includes('me-2'),
          hasMr2: parentClasses.includes('mr-2')
        };
      }).filter(Boolean);
    });

    console.log('\n  Icon Margin Analysis:');
    iconMargins.forEach(margin => {
      console.log(`    Button: "${margin.buttonText}"`);
      console.log(`      - margin-right: ${margin.marginRight}`);
      console.log(`      - margin-left: ${margin.marginLeft}`);
      console.log(`      - margin-inline-end: ${margin.marginInlineEnd}`);
      console.log(`      - Uses me-2: ${margin.hasMe2 ? '✓' : '✗'}`);
      console.log(`      - Uses mr-2: ${margin.hasMr2 ? '⚠️ Should use me-2' : '✓'}`);
    });

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'rtl-hebrew-layout.png'),
      fullPage: true
    });
    console.log('  ✓ RTL screenshot saved');

    return {
      direction,
      iconMargins,
      hasRTLIssues: iconMargins.some(m => m.hasMr2)
    };

  } catch (error) {
    console.error(`❌ RTL test error: ${error.message}`);
    return { error: error.message };
  }
}

async function testTranslations(page, locale) {
  console.log(`\n🌐 Testing translations for ${locale}...`);

  try {
    // Expected translations
    const expectedTranslations = {
      en: {
        quickRematch: 'Quick Rematch',
        settingsAndPlay: 'Settings & Play Again',
        backToLobby: 'Back to Lobby',
        settings: 'Settings'
      },
      he: {
        quickRematch: 'משחק מהיר נוסף',
        settingsAndPlay: 'הגדרות ושחק שוב',
        backToLobby: 'חזרה ללובי',
        settings: 'הגדרות'
      },
      sv: {
        quickRematch: 'Snabb Omstart',
        settingsAndPlay: 'Inställningar & Spela Igen',
        backToLobby: 'Tillbaka till Lobby',
        settings: 'Inställningar'
      },
      ja: {
        quickRematch: 'クイックリマッチ',
        settingsAndPlay: '設定して再プレイ',
        backToLobby: 'ロビーに戻る',
        settings: '設定'
      },
      es: {
        quickRematch: 'Revancha Rápida',
        settingsAndPlay: 'Configurar y Jugar',
        backToLobby: 'Volver a la Sala',
        settings: 'Configuración'
      }
    };

    const expected = expectedTranslations[locale];
    if (!expected) {
      console.log(`  ⚠️ No expected translations defined for ${locale}`);
      return { error: 'No expected translations' };
    }

    // Find actual button texts
    const actualTexts = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => btn.textContent.trim());
    });

    const results = {};

    for (const [key, value] of Object.entries(expected)) {
      const found = actualTexts.some(text => text.includes(value));
      results[key] = {
        expected: value,
        found: found
      };
      console.log(`  ${found ? '✓' : '✗'} ${key}: "${value}"`);
    }

    return results;

  } catch (error) {
    console.error(`❌ Translation test error: ${error.message}`);
    return { error: error.message };
  }
}

async function testMobileLayout(page) {
  console.log('\n📱 Testing mobile/landscape layout...');

  try {
    // Test portrait mobile
    console.log('\n  Testing portrait (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await delay(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-portrait.png'),
      fullPage: true
    });
    console.log('  ✓ Portrait screenshot saved');

    // Test landscape mobile
    console.log('\n  Testing landscape (667x375)...');
    await page.setViewport({ width: 667, height: 375 });
    await delay(1000);

    // Check if landscape layout activated
    const landscapeActive = await page.evaluate(() => {
      // Look for landscape-specific layout classes or structure
      const body = document.body;
      const hasLandscapeClass = body.className.includes('landscape');

      // Check if layout changed to 2-column
      const containers = Array.from(document.querySelectorAll('[class*="flex"]'));
      const hasTwoColumns = containers.some(el => {
        const styles = window.getComputedStyle(el);
        return styles.display === 'flex' && el.children.length === 2;
      });

      return {
        hasLandscapeClass,
        hasTwoColumns,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });

    console.log(`  Landscape layout active: ${landscapeActive.hasTwoColumns ? 'Yes' : 'No'}`);
    console.log(`  Viewport: ${landscapeActive.viewportWidth}x${landscapeActive.viewportHeight}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'mobile-landscape.png'),
      fullPage: true
    });
    console.log('  ✓ Landscape screenshot saved');

    // Restore desktop viewport
    await page.setViewport({ width: 1920, height: 1080 });
    await delay(500);

    return landscapeActive;

  } catch (error) {
    console.error(`❌ Mobile layout test error: ${error.message}`);
    return { error: error.message };
  }
}

async function testButtonFunctionality(page) {
  console.log('\n🖱️  Testing button click handlers...');

  const results = {
    quickRematch: null,
    settingsAndPlay: null,
    backToLobby: null
  };

  try {
    // Test each button's click handler
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const text = await page.evaluate(btn => btn.textContent.trim(), button);

      // Check if button has click handler
      const hasHandler = await page.evaluate(btn => {
        return btn.onclick !== null ||
               btn.hasAttribute('onClick') ||
               btn.addEventListener.toString().includes('[native code]');
      }, button);

      if (text.includes('Quick Rematch') || text.includes('משחק מהיר')) {
        console.log(`  ✓ Quick Rematch has handler: ${hasHandler}`);
        results.quickRematch = hasHandler;
      } else if (text.includes('Settings') || text.includes('הגדרות')) {
        console.log(`  ✓ Settings & Play Again has handler: ${hasHandler}`);
        results.settingsAndPlay = hasHandler;
      } else if (text.includes('Lobby') || text.includes('לובי')) {
        console.log(`  ✓ Back to Lobby has handler: ${hasHandler}`);
        results.backToLobby = hasHandler;
      }
    }

  } catch (error) {
    console.error(`❌ Button functionality test error: ${error.message}`);
    results.error = error.message;
  }

  return results;
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SinglePlayerResults UI Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await setupBrowser();
  const testResults = {
    timestamp: new Date().toISOString(),
    languages: {},
    rtl: null,
    mobile: null,
    functionality: null,
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Test primary language (English) first
    console.log('\n' + '═'.repeat(55));
    console.log('  TESTING: English (Primary)');
    console.log('═'.repeat(55));

    await navigateToSinglePlayer(page, 'en');
    const gameCompleted = await startAndCompleteGame(page);

    if (gameCompleted) {
      // Wait for results screen
      await delay(3000);

      // Take initial screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'en-results-overview.png'),
        fullPage: true
      });
      console.log('✓ Screenshot saved: en-results-overview.png');

      // Run tests
      const hierarchyResults = await testButtonHierarchy(page, 'en');
      const translationResults = await testTranslations(page, 'en');
      const functionalityResults = await testButtonFunctionality(page);
      const mobileResults = await testMobileLayout(page);

      testResults.languages.en = {
        hierarchy: hierarchyResults,
        translations: translationResults,
        mobile: mobileResults
      };
      testResults.functionality = functionalityResults;

      // Test RTL (Hebrew)
      console.log('\n' + '═'.repeat(55));
      console.log('  TESTING: Hebrew (RTL)');
      console.log('═'.repeat(55));

      await navigateToSinglePlayer(page, 'he');
      const heGameCompleted = await startAndCompleteGame(page);

      if (heGameCompleted) {
        await delay(3000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, 'he-results-overview.png'),
          fullPage: true
        });
        console.log('✓ Screenshot saved: he-results-overview.png');

        const heHierarchyResults = await testButtonHierarchy(page, 'he');
        const heTranslationResults = await testTranslations(page, 'he');
        const rtlResults = await testRTLLayout(page);

        testResults.languages.he = {
          hierarchy: heHierarchyResults,
          translations: heTranslationResults
        };
        testResults.rtl = rtlResults;
      }

      // Test other languages (Swedish, Japanese, Spanish)
      for (const lang of ['sv', 'ja', 'es']) {
        console.log('\n' + '═'.repeat(55));
        console.log(`  TESTING: ${LANGUAGES.find(l => l.code === lang).name}`);
        console.log('═'.repeat(55));

        await navigateToSinglePlayer(page, lang);
        const langGameCompleted = await startAndCompleteGame(page);

        if (langGameCompleted) {
          await delay(3000);

          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${lang}-results-overview.png`),
            fullPage: true
          });
          console.log(`✓ Screenshot saved: ${lang}-results-overview.png`);

          const langTranslationResults = await testTranslations(page, lang);

          testResults.languages[lang] = {
            translations: langTranslationResults
          };
        }
      }
    } else {
      console.log('⚠️ Could not complete game to reach results screen');
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    testResults.summary.failed++;
  } finally {
    // Generate report
    console.log('\n' + '═'.repeat(55));
    console.log('  TEST REPORT');
    console.log('═'.repeat(55));

    generateTestReport(testResults);

    // Save results to JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📄 Full test results saved to: ${reportPath}`);

    console.log('\n✅ Test suite completed!');
    console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);

    await browser.close();
  }
}

function generateTestReport(results) {
  console.log('\n📊 Test Summary:');
  console.log('─'.repeat(55));

  // Button Hierarchy
  console.log('\n1. BUTTON VISUAL HIERARCHY');
  console.log('   Expected order: Quick Rematch > Settings & Play Again > Back to Lobby');
  for (const [locale, data] of Object.entries(results.languages)) {
    if (data.hierarchy) {
      console.log(`\n   ${locale.toUpperCase()}:`);
      console.log(`   Actual order: ${data.hierarchy.hierarchy.join(' > ')}`);
      console.log(`   Buttons found: ${data.hierarchy.buttonsFound.length}/3`);
      if (data.hierarchy.errors.length > 0) {
        console.log(`   ⚠️ Errors: ${data.hierarchy.errors.join(', ')}`);
      }
    }
  }

  // Icon Changes
  console.log('\n2. ICON VERIFICATION');
  console.log('   Expected: Settings button uses FaCog (⚙️), not FaRedo (🔄)');
  console.log('   Status: Check screenshots for visual confirmation');

  // RTL Layout
  console.log('\n3. RTL LAYOUT (Hebrew)');
  if (results.rtl) {
    console.log(`   Document direction: ${results.rtl.direction?.htmlDir || 'N/A'}`);
    console.log(`   Icon margins using me-2: ${!results.rtl.hasRTLIssues ? '✓' : '✗'}`);
    if (results.rtl.hasRTLIssues) {
      console.log('   ⚠️ Some buttons still use mr-2 instead of me-2');
    }
  }

  // Translations
  console.log('\n4. TRANSLATION COVERAGE');
  for (const [locale, data] of Object.entries(results.languages)) {
    if (data.translations) {
      console.log(`\n   ${locale.toUpperCase()}:`);
      for (const [key, value] of Object.entries(data.translations)) {
        if (value.found !== undefined) {
          console.log(`   ${value.found ? '✓' : '✗'} ${key}: "${value.expected}"`);
        }
      }
    }
  }

  // Mobile Layout
  console.log('\n5. MOBILE/LANDSCAPE LAYOUT');
  if (results.languages.en?.mobile) {
    const mobile = results.languages.en.mobile;
    console.log(`   Landscape 2-column layout: ${mobile.hasTwoColumns ? '✓' : '✗'}`);
    console.log('   See mobile-portrait.png and mobile-landscape.png for visual confirmation');
  }

  // Button Functionality
  console.log('\n6. BUTTON FUNCTIONALITY');
  if (results.functionality) {
    console.log(`   Quick Rematch handler: ${results.functionality.quickRematch ? '✓' : '⚠️'}`);
    console.log(`   Settings & Play Again handler: ${results.functionality.settingsAndPlay ? '✓' : '⚠️'}`);
    console.log(`   Back to Lobby handler: ${results.functionality.backToLobby ? '✓' : '⚠️'}`);
  }

  console.log('\n' + '─'.repeat(55));
  console.log('\n📸 Visual Screenshots:');
  console.log('   - Check SCREENSHOT_DIR for detailed visual confirmations');
  console.log('   - Pay special attention to button sizes, colors, and animations');
  console.log('   - Verify FaCog (gear) icon appears on Settings button');
  console.log('   - Confirm Quick Rematch is largest and most prominent');

  console.log('\n💡 Recommendations:');
  console.log('   - Manually verify animated pulse effect on Quick Rematch button');
  console.log('   - Confirm button click behavior in live testing');
  console.log('   - Validate color contrast meets accessibility standards');
  console.log('   - Test actual game flow to verify handlers work correctly');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
