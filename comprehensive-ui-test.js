/**
 * Comprehensive UI Testing Script
 * Tests game UI across all screen sizes and orientations
 *
 * Tests:
 * - Visual layout issues (overflow, truncation, overlapping)
 * - Contrast and readability
 * - Touch targets (minimum 44x44px)
 * - Responsive breakpoints
 * - Specific components (header, game grid, leaderboard, etc.)
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configurations
const SCREEN_SIZES = {
  // Mobile sizes
  'iPhone SE': { width: 375, height: 667, isMobile: true },
  'iPhone 12': { width: 390, height: 844, isMobile: true },
  'iPhone 14 Pro Max': { width: 414, height: 896, isMobile: true },

  // Tablet sizes
  'iPad Mini': { width: 768, height: 1024, isMobile: false },
  'iPad Air': { width: 820, height: 1180, isMobile: false },

  // Desktop sizes
  'Desktop Small': { width: 1024, height: 768, isMobile: false },
  'Desktop Medium': { width: 1280, height: 720, isMobile: false },
  'Desktop Large': { width: 1920, height: 1080, isMobile: false },

  // Very narrow landscape (problematic)
  'Narrow Landscape': { width: 640, height: 360, isMobile: true },
  'Short Landscape': { width: 844, height: 375, isMobile: true },
};

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/Users/ohadfisher/git/boggle-new/test-screenshots';
const REPORT_FILE = '/Users/ohadfisher/git/boggle-new/ui-test-results.json';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
  issues: [],
  screenshots: [],
};

// Helper: Add issue to results
function addIssue(severity, component, issue, details, screenshotPath = null) {
  testResults.issues.push({
    severity,
    component,
    issue,
    details,
    screenshot: screenshotPath,
    timestamp: new Date().toISOString(),
  });

  if (severity === 'Critical' || severity === 'High') {
    testResults.summary.failed++;
  } else {
    testResults.summary.warnings++;
  }
}

// Helper: Check if element is visible
async function isElementVisible(page, selector) {
  try {
    const element = await page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

// Helper: Get element dimensions
async function getElementDimensions(page, selector) {
  try {
    const box = await page.locator(selector).first().boundingBox();
    return box;
  } catch {
    return null;
  }
}

// Helper: Check contrast ratio (simplified)
async function checkContrast(page, selector) {
  try {
    const element = await page.locator(selector).first();
    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    // Return styles for manual inspection
    return styles;
  } catch {
    return null;
  }
}

// Test 1: Header component
async function testHeader(page, deviceName, viewport) {
  console.log(`  Testing header...`);

  const headerExists = await isElementVisible(page, 'header');
  if (!headerExists) {
    addIssue('Critical', 'Header', 'Header not found', {
      device: deviceName,
      viewport,
    });
    return;
  }

  // Check logo visibility
  const logoVisible = await isElementVisible(page, 'h1');
  if (!logoVisible) {
    addIssue('High', 'Header', 'Logo not visible', {
      device: deviceName,
      viewport,
    });
  }

  // Check if logo text is truncated
  const logoBox = await getElementDimensions(page, 'h1');
  if (logoBox && logoBox.width < 100) {
    addIssue('Medium', 'Header', 'Logo appears truncated', {
      device: deviceName,
      viewport,
      actualWidth: logoBox.width,
    });
  }

  // Check touch targets on mobile
  if (viewport.isMobile) {
    const buttons = await page.locator('header button').all();
    for (let i = 0; i < buttons.length; i++) {
      const box = await buttons[i].boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        addIssue('High', 'Header', `Touch target too small (button ${i})`, {
          device: deviceName,
          viewport,
          actualSize: { width: box.width, height: box.height },
          minimumSize: { width: 44, height: 44 },
        });
      }
    }
  }

  // Check for overflow
  const headerOverflow = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return false;
    return header.scrollWidth > header.clientWidth;
  });

  if (headerOverflow) {
    const screenshot = path.join(SCREENSHOT_DIR, `header-overflow-${deviceName.replace(/\s+/g, '-')}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    addIssue('High', 'Header', 'Header content overflows', {
      device: deviceName,
      viewport,
    }, screenshot);
  }
}

// Test 2: Landing page mode selection
async function testLandingPage(page, deviceName, viewport) {
  console.log(`  Testing landing page...`);

  // Check for mode selection cards
  const cards = await page.locator('[class*="card"], [class*="mode"]').count();

  if (cards === 0) {
    addIssue('Medium', 'Landing Page', 'Mode selection cards not found', {
      device: deviceName,
      viewport,
    });
    return;
  }

  // Check if cards are visible
  const cardElements = await page.locator('[class*="card"], [class*="mode"]').all();
  for (let i = 0; i < cardElements.length; i++) {
    const box = await cardElements[i].boundingBox();
    if (box && box.y + box.height > viewport.height) {
      addIssue('Low', 'Landing Page', `Card ${i} partially off-screen`, {
        device: deviceName,
        viewport,
        cardPosition: box,
      });
    }
  }
}

// Test 3: Viewport-specific issues
async function testViewportIssues(page, deviceName, viewport) {
  console.log(`  Testing viewport-specific issues...`);

  // Check for horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });

  if (hasHorizontalScroll) {
    const screenshot = path.join(SCREENSHOT_DIR, `horizontal-scroll-${deviceName.replace(/\s+/g, '-')}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    addIssue('High', 'Layout', 'Horizontal scroll present', {
      device: deviceName,
      viewport,
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      viewportWidth: viewport.width,
    }, screenshot);
  }

  // Check for very short landscape issues
  if (viewport.width > viewport.height && viewport.height < 400) {
    const elements = await page.locator('body *').all();
    let overlappingFound = false;

    // Sample check for overlapping elements
    for (let i = 0; i < Math.min(elements.length, 20); i++) {
      const box = await elements[i].boundingBox();
      if (box && box.y < 0) {
        overlappingFound = true;
        break;
      }
    }

    if (overlappingFound) {
      const screenshot = path.join(SCREENSHOT_DIR, `short-landscape-${deviceName.replace(/\s+/g, '-')}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      addIssue('Medium', 'Layout', 'Elements overlapping in short landscape', {
        device: deviceName,
        viewport,
      }, screenshot);
    }
  }
}

// Test 4: Text readability
async function testTextReadability(page, deviceName, viewport) {
  console.log(`  Testing text readability...`);

  // Check all text elements for contrast
  const textElements = await page.locator('p, span, h1, h2, h3, h4, h5, h6, button, a').all();
  const lowContrastElements = [];

  for (let i = 0; i < Math.min(textElements.length, 30); i++) {
    const styles = await textElements[i].evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        text: el.textContent?.substring(0, 50),
      };
    });

    // Very basic check - if both color and background are very dark or very light
    const isDarkText = styles.color.includes('rgb(0') || styles.color.includes('rgb(1,') || styles.color.includes('rgb(2,');
    const isDarkBg = styles.backgroundColor.includes('rgb(0') || styles.backgroundColor.includes('rgb(1,') || styles.backgroundColor.includes('rgb(2,');
    const isLightText = styles.color.includes('rgb(255') || styles.color.includes('rgb(254') || styles.color.includes('rgb(253');
    const isLightBg = styles.backgroundColor.includes('rgb(255') || styles.backgroundColor.includes('rgb(254') || styles.backgroundColor.includes('rgba(0, 0, 0, 0)');

    if ((isDarkText && isDarkBg) || (isLightText && isLightBg)) {
      lowContrastElements.push({
        text: styles.text,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      });
    }
  }

  if (lowContrastElements.length > 0) {
    addIssue('Medium', 'Text Readability', 'Potential low contrast text found', {
      device: deviceName,
      viewport,
      count: lowContrastElements.length,
      examples: lowContrastElements.slice(0, 5),
    });
  }
}

// Test 5: Touch target sizes
async function testTouchTargets(page, deviceName, viewport) {
  if (!viewport.isMobile) return;

  console.log(`  Testing touch targets...`);

  const interactiveElements = await page.locator('button, a, input, select, [role="button"]').all();
  const smallTargets = [];

  for (let i = 0; i < interactiveElements.length; i++) {
    const box = await interactiveElements[i].boundingBox();
    const text = await interactiveElements[i].textContent();

    if (box && (box.width < 44 || box.height < 44)) {
      smallTargets.push({
        index: i,
        text: text?.substring(0, 30),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
  }

  if (smallTargets.length > 0) {
    const screenshot = path.join(SCREENSHOT_DIR, `small-touch-targets-${deviceName.replace(/\s+/g, '-')}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    addIssue('High', 'Touch Targets', 'Touch targets smaller than 44x44px', {
      device: deviceName,
      viewport,
      count: smallTargets.length,
      examples: smallTargets.slice(0, 5),
    }, screenshot);
  }
}

// Main test runner
async function runTests() {
  console.log('Starting comprehensive UI tests...\n');

  // Create screenshot directory
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create screenshot directory:', err);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  for (const [deviceName, viewport] of Object.entries(SCREEN_SIZES)) {
    console.log(`\nTesting: ${deviceName} (${viewport.width}x${viewport.height})`);
    testResults.summary.total++;

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.isMobile ? 2 : 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
    });

    const page = await context.newPage();

    try {
      // Navigate to landing page
      await page.goto(BASE_URL, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Take baseline screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${deviceName.replace(/\s+/g, '-')}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push({
        device: deviceName,
        viewport,
        path: screenshotPath,
      });

      // Run tests
      await testHeader(page, deviceName, viewport);
      await testLandingPage(page, deviceName, viewport);
      await testViewportIssues(page, deviceName, viewport);
      await testTextReadability(page, deviceName, viewport);
      await testTouchTargets(page, deviceName, viewport);

      // Test landscape orientation for mobile devices
      if (viewport.isMobile && viewport.width < viewport.height) {
        console.log(`  Testing landscape orientation...`);
        await page.setViewportSize({ width: viewport.height, height: viewport.width });

        const landscapeScreenshot = path.join(SCREENSHOT_DIR, `${deviceName.replace(/\s+/g, '-')}-landscape.png`);
        await page.screenshot({ path: landscapeScreenshot, fullPage: true });
        testResults.screenshots.push({
          device: `${deviceName} (Landscape)`,
          viewport: { width: viewport.height, height: viewport.width },
          path: landscapeScreenshot,
        });

        await testHeader(page, `${deviceName} (Landscape)`, { ...viewport, width: viewport.height, height: viewport.width });
        await testViewportIssues(page, `${deviceName} (Landscape)`, { ...viewport, width: viewport.height, height: viewport.width });
      }

      testResults.summary.passed++;

    } catch (err) {
      console.error(`  Error testing ${deviceName}:`, err.message);
      addIssue('Critical', 'Test Runner', 'Test failed to complete', {
        device: deviceName,
        viewport,
        error: err.message,
      });
    }

    await context.close();
  }

  await browser.close();

  // Save results
  await fs.writeFile(REPORT_FILE, JSON.stringify(testResults, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total configurations tested: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Warnings: ${testResults.summary.warnings}`);
  console.log(`Total issues found: ${testResults.issues.length}`);
  console.log(`Screenshots saved: ${testResults.screenshots.length}`);
  console.log(`\nDetailed results saved to: ${REPORT_FILE}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(60));

  // Print top issues
  console.log('\nTOP ISSUES:');
  const criticalIssues = testResults.issues.filter(i => i.severity === 'Critical' || i.severity === 'High');
  criticalIssues.slice(0, 10).forEach((issue, index) => {
    console.log(`\n${index + 1}. [${issue.severity}] ${issue.component}: ${issue.issue}`);
    console.log(`   Device: ${issue.details.device}`);
    if (issue.screenshot) {
      console.log(`   Screenshot: ${issue.screenshot}`);
    }
  });
}

// Run tests
runTests().catch(console.error);
