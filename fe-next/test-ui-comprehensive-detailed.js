const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration for all screen sizes and orientations
const TEST_CONFIGS = [
  // Mobile - Portrait
  { name: 'mobile-320-portrait', width: 320, height: 568, orientation: 'portrait' },
  { name: 'mobile-375-portrait', width: 375, height: 667, orientation: 'portrait' },

  // Mobile - Landscape
  { name: 'mobile-320-landscape', width: 568, height: 320, orientation: 'landscape' },
  { name: 'mobile-375-landscape', width: 667, height: 375, orientation: 'landscape' },

  // Tablet - Portrait
  { name: 'tablet-768-portrait', width: 768, height: 1024, orientation: 'portrait' },

  // Tablet - Landscape
  { name: 'tablet-768-landscape', width: 1024, height: 768, orientation: 'landscape' },

  // Desktop
  { name: 'desktop-1024', width: 1024, height: 768, orientation: 'landscape' },
  { name: 'desktop-1280', width: 1280, height: 720, orientation: 'landscape' },
  { name: 'desktop-1920', width: 1920, height: 1080, orientation: 'landscape' },
];

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/Users/ohadfisher/git/boggle-new/test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConfiguration(browser, config) {
  console.log(`\n========================================`);
  console.log(`Testing: ${config.name} (${config.width}x${config.height})`);
  console.log(`========================================\n`);

  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const issues = [];

  try {
    // Test 1: Landing Page
    console.log('1. Testing Landing Page...');
    await page.goto(`${BASE_URL}/en`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${config.name}-01-landing.png`),
      fullPage: true,
    });

    // Check for overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalOverflow) {
      issues.push({
        severity: 'HIGH',
        page: 'Landing Page',
        issue: 'Horizontal overflow detected',
        config: config.name,
        screenshot: `${config.name}-01-landing.png`
      });
    }

    // Check header elements
    const headerVisible = await page.isVisible('header');
    if (headerVisible) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${config.name}-02-header.png`),
        clip: await page.locator('header').boundingBox(),
      });

      // Check for admin button positioning
      const adminButton = page.locator('button:has-text("Admin"), a:has-text("Admin")').first();
      if (await adminButton.count() > 0) {
        const adminBox = await adminButton.boundingBox();
        if (adminBox) {
          console.log(`  Admin button: ${adminBox.width}x${adminBox.height} at (${adminBox.x}, ${adminBox.y})`);

          // Check if button is too small for mobile
          if (config.width <= 375 && (adminBox.width < 44 || adminBox.height < 44)) {
            issues.push({
              severity: 'MEDIUM',
              page: 'Header',
              issue: `Admin button too small: ${adminBox.width}x${adminBox.height}px (minimum 44x44px recommended)`,
              config: config.name,
              location: 'Header.tsx',
              screenshot: `${config.name}-02-header.png`
            });
          }
        }
      }
    }

    // Check for mode cards
    const modeCards = page.locator('[class*="ModeCard"], [data-testid*="mode"]').first();
    if (await modeCards.count() > 0) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${config.name}-03-mode-cards.png`),
      });

      // Check badge contrast
      const badges = page.locator('[class*="badge"], [class*="Badge"]');
      const badgeCount = await badges.count();
      console.log(`  Found ${badgeCount} badges`);

      for (let i = 0; i < Math.min(badgeCount, 5); i++) {
        const badge = badges.nth(i);
        const badgeBox = await badge.boundingBox();
        if (badgeBox) {
          console.log(`  Badge ${i}: ${badgeBox.width}x${badgeBox.height}`);
        }
      }
    }

    // Test 2: Try to find and click a mode selection button
    console.log('2. Testing Mode Selection...');
    const playButtons = page.locator('button:has-text("Play"), button:has-text("Start"), a:has-text("Play"), a:has-text("Start")');
    const playButtonCount = await playButtons.count();

    if (playButtonCount > 0) {
      console.log(`  Found ${playButtonCount} play/start buttons`);
      const firstButton = playButtons.first();
      const buttonBox = await firstButton.boundingBox();

      if (buttonBox) {
        console.log(`  First button: ${buttonBox.width}x${buttonBox.height}`);

        // Check touch target size for mobile
        if (config.width <= 768 && (buttonBox.width < 44 || buttonBox.height < 44)) {
          issues.push({
            severity: 'MEDIUM',
            page: 'Landing Page',
            issue: `Play button too small: ${buttonBox.width}x${buttonBox.height}px (minimum 44x44px recommended)`,
            config: config.name,
            screenshot: `${config.name}-03-mode-cards.png`
          });
        }

        // Try to click and navigate
        try {
          await firstButton.click({ timeout: 5000 });
          await sleep(2000);

          const currentUrl = page.url();
          console.log(`  Navigated to: ${currentUrl}`);

          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${config.name}-04-after-mode-select.png`),
            fullPage: true,
          });
        } catch (err) {
          console.log(`  Could not click button: ${err.message}`);
        }
      }
    } else {
      console.log('  No play/start buttons found on landing page');
    }

    // Test 3: Check for dialogs/modals
    console.log('3. Checking for dialogs...');
    const dialogs = page.locator('[role="dialog"], [class*="dialog"], [class*="Dialog"], [class*="modal"], [class*="Modal"]');
    const dialogCount = await dialogs.count();

    if (dialogCount > 0) {
      console.log(`  Found ${dialogCount} dialogs`);
      const firstDialog = dialogs.first();

      if (await firstDialog.isVisible()) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${config.name}-05-dialog.png`),
        });

        // Check close button
        const closeButtons = firstDialog.locator('button[aria-label*="close"], button:has-text("×"), button:has-text("Close")');
        if (await closeButtons.count() > 0) {
          const closeBox = await closeButtons.first().boundingBox();
          if (closeBox && config.width <= 768 && (closeBox.width < 44 || closeBox.height < 44)) {
            issues.push({
              severity: 'HIGH',
              page: 'Dialog',
              issue: `Dialog close button too small: ${closeBox.width}x${closeBox.height}px (minimum 44x44px required)`,
              config: config.name,
              location: 'dialog.tsx',
              screenshot: `${config.name}-05-dialog.png`
            });
          }
        }
      }
    }

    // Test 4: Check text overflow
    console.log('4. Checking for text overflow...');
    const textOverflow = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const overflowing = [];

      elements.forEach(el => {
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          const computedStyle = window.getComputedStyle(el);
          if (computedStyle.overflow !== 'hidden' && computedStyle.overflow !== 'scroll' &&
              computedStyle.overflow !== 'auto' && computedStyle.textOverflow !== 'ellipsis') {
            const text = el.textContent?.substring(0, 50) || '';
            if (text.trim()) {
              overflowing.push({
                tag: el.tagName,
                class: el.className,
                text: text,
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
              });
            }
          }
        }
      });

      return overflowing.slice(0, 5); // Return first 5
    });

    if (textOverflow.length > 0) {
      console.log(`  Found ${textOverflow.length} potentially overflowing elements:`);
      textOverflow.forEach((item, idx) => {
        console.log(`    ${idx + 1}. ${item.tag}.${item.class}: "${item.text.substring(0, 30)}..."`);
      });

      issues.push({
        severity: 'MEDIUM',
        page: 'Multiple',
        issue: `${textOverflow.length} elements with potential text overflow`,
        config: config.name,
        details: textOverflow,
        screenshot: `${config.name}-01-landing.png`
      });
    }

    // Test 5: Check contrast issues
    console.log('5. Checking for contrast issues...');
    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, button, a, label');

      for (let el of textElements) {
        if (!el.textContent?.trim()) continue;

        const style = window.getComputedStyle(el);
        // Simple check: if text color and background are too similar
        const hasLowContrast = style.color === style.backgroundColor;

        if (hasLowContrast) {
          issues.push({
            text: el.textContent.substring(0, 30),
            color: style.color,
            background: style.backgroundColor,
            tag: el.tagName,
          });
        }

        if (issues.length >= 10) break;
      }

      return issues;
    });

    if (contrastIssues.length > 0) {
      console.log(`  Found ${contrastIssues.length} potential contrast issues:`);
      contrastIssues.forEach((item, idx) => {
        console.log(`    ${idx + 1}. ${item.tag}: contrast ${item.contrast}:1 - "${item.text.substring(0, 30)}"`);
      });

      issues.push({
        severity: 'MEDIUM',
        page: 'Multiple',
        issue: `${contrastIssues.length} elements with low contrast (< 4.5:1)`,
        config: config.name,
        details: contrastIssues,
        screenshot: `${config.name}-01-landing.png`
      });
    }

    console.log(`\nCompleted testing for ${config.name}`);
    console.log(`Issues found: ${issues.length}`);

  } catch (error) {
    console.error(`Error testing ${config.name}:`, error.message);
    issues.push({
      severity: 'CRITICAL',
      page: 'Test Execution',
      issue: `Test failed: ${error.message}`,
      config: config.name,
    });
  } finally {
    await context.close();
  }

  return issues;
}

async function runTests() {
  console.log('Starting comprehensive UI testing...');
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}\n`);

  const browser = await playwright.chromium.launch({ headless: true });
  const allIssues = [];

  for (const config of TEST_CONFIGS) {
    const issues = await testConfiguration(browser, config);
    allIssues.push(...issues);
  }

  await browser.close();

  // Generate report
  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalConfigurations: TEST_CONFIGS.length,
    totalIssues: allIssues.length,
    issues: allIssues,
  }, null, 2));

  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Total configurations tested: ${TEST_CONFIGS.length}`);
  console.log(`Total issues found: ${allIssues.length}`);
  console.log(`\nIssues by severity:`);
  console.log(`  CRITICAL: ${allIssues.filter(i => i.severity === 'CRITICAL').length}`);
  console.log(`  HIGH: ${allIssues.filter(i => i.severity === 'HIGH').length}`);
  console.log(`  MEDIUM: ${allIssues.filter(i => i.severity === 'MEDIUM').length}`);
  console.log(`  LOW: ${allIssues.filter(i => i.severity === 'LOW').length}`);
  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
}

runTests().catch(console.error);
